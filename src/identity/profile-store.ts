import { worldRequest } from "@/services/world/client";
import type { WorldSession } from "@/services/world/contracts";
import { useNet } from "@/net/net-store";
import { create } from "zustand";
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
  revision?: number;
  level?: number;
  title?: string;
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
      const result = await worldRequest<WorldSession>("me");
      if (ticket !== loadGeneration) return;
      const profile = { ...result.profile, avatar: normalizeAvatar(result.profile.avatar) };
      const current = get().profile;
      if (
        !current ||
        current.id !== profile.id ||
        (profile.revision ?? 0) >= (current.revision ?? 0)
      ) {
        set({
          profile,
          owned: result.owned,
          loading: false,
          ...(current?.id !== profile.id ? { appearanceDraft: null } : {}),
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
        const values = { ...patch, revision: cur.revision ?? 0 };
        if (patch.avatar) values.avatar = normalizeAvatar(patch.avatar);
        if (patch.username !== undefined)
          values.username = patch.username
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 24);
        const profile = await worldRequest<PlayerProfile>("profile", values);
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
