import { PROFILE_COLUMNS, profileFromRow, newerRevision } from "./profile-data";
import { useNet } from "@/net/net-store";
import type { Database, Json } from "@/integrations/supabase/types";
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAvatar, type AvatarConfig } from "@/identity/avatar";
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
  updatedAt: string;
}

interface ProfileState {
  profile: PlayerProfile | null;
  appearanceDraft: AvatarConfig | null;
  owned: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  clear: () => void;
  load: () => Promise<void>;
  beginAppearanceEdit: () => void;
  updateAppearance: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void;
  resetAppearance: () => void;
  endAppearanceEdit: () => void;
  save: (
    patch: Partial<
      Pick<
        PlayerProfile,
        "displayName" | "username" | "role" | "bio" | "avatar" | "equippedCharacter"
      >
    >,
  ) => Promise<string | null>;
}

let loadGeneration = 0;
let saveQueue: Promise<unknown> = Promise.resolve();

/** Identitas pemain yang sedang login (profil + koleksi karakter). */
export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  appearanceDraft: null,
  owned: [],
  loading: false,
  saving: false,
  error: null,
  clear: () => {
    ++loadGeneration;
    set({ profile: null, appearanceDraft: null, owned: [], loading: false, error: null });
  },
  load: async () => {
    await saveQueue;
    const ticket = ++loadGeneration;
    set({ loading: true, error: null });
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        if (ticket === loadGeneration)
          set({ profile: null, appearanceDraft: null, owned: [], loading: false });
        return;
      }
      const id = auth.user.id;
      const fetched = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      let data = fetched.data;
      if (fetched.error) throw fetched.error;
      if (!data) {
        const created = await supabase
          .from("profiles")
          .upsert({ id, display_name: "Pengunjung" }, { onConflict: "id", ignoreDuplicates: true });
        if (created.error) throw created.error;
        const result = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", id)
          .single();
        if (result.error) throw result.error;
        data = result.data;
      }
      const owned = await supabase
        .from("character_ownership")
        .select("character_id")
        .eq("user_id", id);
      if (owned.error) throw owned.error;
      if (ticket !== loadGeneration) return;
      const profile = profileFromRow(data);
      const current = get().profile;
      if (
        !current ||
        current.id !== id ||
        profile.updatedAt === current.updatedAt ||
        newerRevision(profile.updatedAt, current.updatedAt)
      ) {
        set({
          profile,
          owned: owned.data.map((o) => o.character_id),
          loading: false,
          ...(current?.id !== id ? { appearanceDraft: null } : {}),
        });
        useNet.getState().setName(profile.displayName);
      } else set({ loading: false });
    } catch (error) {
      if (ticket === loadGeneration)
        set({
          loading: false,
          error: error instanceof Error ? error.message : "Profil tidak dapat dimuat. Coba lagi.",
        });
    }
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
  save: (patch) => {
    const account = get().profile?.id;
    const perform = async (): Promise<string | null> => {
      const cur = get().profile;
      if (!cur || cur.id !== account) return "Sesi berubah. Muat ulang profil.";
      ++loadGeneration;
      set({ saving: true, loading: false, error: null });
      const draftAtSubmit = get().appearanceDraft;
      try {
        // Partial writes + optimistic revision lock prevent stale editors/tabs overwriting each other.
        const values: Database["public"]["Tables"]["profiles"]["Update"] = {};
        if (patch.displayName !== undefined)
          values.display_name = patch.displayName.trim().slice(0, 18) || "Pengunjung";
        if (patch.username !== undefined)
          values.username =
            patch.username
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "")
              .slice(0, 24) || null;
        if (patch.bio !== undefined) values.bio = patch.bio.slice(0, 140);
        if (patch.role !== undefined) values.role = patch.role;
        if (patch.avatar !== undefined)
          values.avatar = normalizeAvatar(patch.avatar) as unknown as Json;
        if (patch.equippedCharacter !== undefined)
          values.equipped_character = patch.equippedCharacter;
        const { data, error } = await supabase
          .from("profiles")
          .update(values)
          .eq("id", cur.id)
          .eq("updated_at", cur.updatedAt)
          .select(PROFILE_COLUMNS)
          .single();
        if (error || !data)
          throw new Error(
            error?.code === "PGRST116"
              ? "Profil berubah di sesi lain. Muat ulang lalu coba simpan lagi."
              : (error?.message ?? "Profil belum tersimpan."),
          );
        const profile = profileFromRow(data);
        if (get().profile?.id !== account) return "Sesi berubah.";
        set({
          profile,
          ...(patch.avatar && get().appearanceDraft === draftAtSubmit
            ? { appearanceDraft: { ...profile.avatar } }
            : {}),
        });
        useNet.getState().setName(profile.displayName);
        // Networking observes only this acknowledged profile, never the live appearance draft.
        return null;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal menyimpan profil. Coba lagi.";
        set({ error: message });
        return message;
      } finally {
        set({ saving: false });
      }
    };
    const result = saveQueue.then(perform, perform);
    saveQueue = result;
    return result;
  },
}));
