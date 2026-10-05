import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AVATAR, normalizeAvatar, type AvatarConfig } from "@/identity/avatar";
import type { RoleId } from "@/identity/roles";

export type WorldStatus = "online" | "exploring" | "shopping" | "idle";

export interface PlayerProfile {
  id: string;
  displayName: string;
  username: string;
  role: RoleId;
  bio: string;
  avatar: AvatarConfig;
  equippedCharacter: string | null;
  joinedAt: string;
}

interface ProfileState {
  profile: PlayerProfile | null;
  appearanceDraft: AvatarConfig | null;
  owned: string[];
  loading: boolean;
  load: () => Promise<void>;
  beginAppearanceEdit: () => void;
  updateAppearance: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void;
  resetAppearance: () => void;
  endAppearanceEdit: () => void;
  save: (patch: Partial<Pick<PlayerProfile, "displayName" | "username" | "role" | "bio" | "avatar" | "equippedCharacter">>) => Promise<string | null>;
}

/** Identitas pemain yang sedang login (profil + koleksi karakter). */
export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  appearanceDraft: null,
  owned: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      set({ profile: null, appearanceDraft: null, owned: [], loading: false });
      return;
    }
    const [{ data }, { data: owned }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, username, role, bio, avatar, equipped_character, created_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("character_ownership").select("character_id").eq("user_id", user.id),
    ]);
    set({
      loading: false,
      owned: (owned ?? []).map((o) => o.character_id),
      profile: data
        ? {
            id: data.id,
            displayName: data.display_name,
            username: data.username ?? "",
            role: data.role as RoleId,
            bio: data.bio,
            avatar: normalizeAvatar(data.avatar),
            equippedCharacter: data.equipped_character,
            joinedAt: data.created_at,
          }
        : {
            id: user.id,
            displayName: "Pengunjung",
            username: "",
            role: "pengunjung",
            bio: "",
            avatar: DEFAULT_AVATAR,
            equippedCharacter: null,
            joinedAt: new Date().toISOString(),
          },
    });
  },
  beginAppearanceEdit: () => {
    const profile = get().profile;
    if (profile) set({ appearanceDraft: { ...profile.avatar } });
  },
  updateAppearance: (key, value) =>
    set((state) => ({
      appearanceDraft: state.appearanceDraft
        ? { ...state.appearanceDraft, [key]: value }
        : state.profile
          ? { ...state.profile.avatar, [key]: value }
          : null,
    })),
  resetAppearance: () => {
    const profile = get().profile;
    if (profile) set({ appearanceDraft: { ...profile.avatar } });
  },
  endAppearanceEdit: () => set({ appearanceDraft: null }),
  save: async (patch) => {
    const cur = get().profile;
    if (!cur) return "Belum login";
    const next = { ...cur, ...patch };
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: next.displayName.slice(0, 18),
        username: next.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24),
        role: next.role,
        bio: next.bio.slice(0, 140),
        avatar: next.avatar as unknown as never,
        equipped_character: next.equippedCharacter,
      })
      .eq("id", cur.id);
    if (error) return error.message;
    set({ profile: next, ...(patch.avatar ? { appearanceDraft: { ...next.avatar } } : {}) });
    return null;
  },
}));
