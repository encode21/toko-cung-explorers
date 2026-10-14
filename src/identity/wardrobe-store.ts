import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { useProfile } from "./profile-store";
import { useGameCore } from "@/game/core/store";
import type { WardrobeItem } from "./wardrobe";
export interface WardrobeSnapshot {
  catalog: WardrobeItem[];
  owned: string[];
  balance: number;
}
interface WardrobeState extends WardrobeSnapshot {
  account: string | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  load: () => Promise<void>;
  buy: (item: WardrobeItem, requestId: string) => Promise<boolean>;
}
let generation = 0;
function publish(snapshot: WardrobeSnapshot) {
  useGameCore.setState((s) =>
    s.snapshot
      ? {
          snapshot: {
            ...s.snapshot,
            wallet: { ...s.snapshot.wallet, current_balance: snapshot.balance },
          },
        }
      : {},
  );
}
export const useWardrobe = create<WardrobeState>((set, get) => ({
  catalog: [],
  owned: [],
  balance: 0,
  account: null,
  loading: false,
  busy: false,
  error: null,
  load: async () => {
    const account = useProfile.getState().profile?.id ?? null,
      ticket = ++generation;
    set({
      loading: true,
      error: null,
      ...(account !== get().account ? { account, catalog: [], owned: [], balance: 0 } : {}),
    });
    try {
      const snapshot = await worldRequest<WardrobeSnapshot>("cosmetics");
      if (ticket !== generation || account !== useProfile.getState().profile?.id) return;
      set({ ...snapshot, loading: false });
      publish(snapshot);
    } catch (e) {
      if (ticket === generation)
        set({ loading: false, error: e instanceof Error ? e.message : "Katalog belum tersedia." });
    }
  },
  buy: async (item, requestId) => {
    if (get().busy) return false;
    const account = get().account;
    ++generation;
    set({ busy: true, error: null });
    try {
      const snapshot = await worldRequest<WardrobeSnapshot>("buy-cosmetic", {
        itemId: item.id,
        requestId,
        expectedPrice: item.price,
      });
      if (account !== useProfile.getState().profile?.id) return false;
      set({ ...snapshot, loading: false });
      publish(snapshot);
      return true;
    } catch (e) {
      if (account !== useProfile.getState().profile?.id) return false;
      set({
        error:
          e instanceof Error
            ? e.message
            : "Koneksi terputus. Coba lagi dengan konfirmasi yang sama.",
      });
      return false;
    } finally {
      if (account === useProfile.getState().profile?.id) set({ busy: false });
    }
  },
}));
useProfile.subscribe((state, previous) => {
  if (state.profile?.id !== previous.profile?.id) {
    ++generation;
    useWardrobe.setState({
      account: null,
      catalog: [],
      owned: [],
      balance: 0,
      error: null,
      loading: false,
      busy: false,
    });
  }
});
