import { WARDROBE, itemOwned } from "@/identity/wardrobe";
import { worldRequest as clubRequest, WorldApiError } from "../club/client";
export { WorldApiError };
export function onAccountExpired() {}
export async function worldRequest(operation: string, data: any) {
  const w = window as any;
  if (operation === "daily-quests") {
    if (!w.dailyFixture) return { enabled: false };
    const s = w.dailyFixture;
    w.dailyRequests ??= [];
    w.dailyRequests.push(structuredClone(data));
    if (data.action === "interact") {
      const q = s.quests.find((q: any) => q.id === data.instanceId);
      const o = q?.definition.objectives[data.objective];
      if (!o || o.targetId !== data.targetId) throw new Error("Tujuan tidak valid");
      q.progress[data.objective] = o.required;
      if (q.definition.objectives.every((o: any, i: number) => q.progress[i] >= o.required)) {
        q.status = "CLAIMABLE";
        s.completedCount++;
      }
    }
    if (data.action === "open") s.introduced = true;
    if (data.action === "accept") s.quests.forEach((q: any) => (q.status = "ACTIVE"));
    if (data.action === "claim") {
      const q = s.quests.find((q: any) => q.id === data.instanceId);
      if (q.status === "CLAIMABLE") {
        q.status = "CLAIMED";
        s.claimedCount++;
        q.receipt = {
          cungPoint: 20,
          requestedPoint: 20,
          xp: 50,
          bonusXp: s.claimedCount === 5 ? 150 : 0,
        };
        s.wallet.current_balance += 20;
        s.profile.xp += 50 + q.receipt.bonusXp;
      }
      if (w.dailyLoseResponse) {
        w.dailyLoseResponse = false;
        throw new Error("Respons terputus. Coba lagi.");
      }
    }
    s.revision++;
    return structuredClone(s);
  }
  if (operation === "cosmetics" || operation === "buy-cosmetic") {
    if (operation === "cosmetics" && w.failCatalog)
      throw new Error("Permintaan tidak dapat diproses.");
    w.wardrobeFixture ??= JSON.parse(sessionStorage.getItem("qa-wardrobe") || "null") ?? {
      balance: 1250,
      owned: [],
      receipts: {},
      calls: 0,
    };
    const state = w.wardrobeFixture;
    if (operation === "buy-cosmetic") {
      state.calls++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      const item = WARDROBE.find((i) => i.id === data.itemId)!;
      if (state.failBefore) {
        state.failBefore = false;
        throw new Error("Koneksi terputus");
      }
      if (!state.receipts[data.requestId] && !itemOwned(item, state.owned)) {
        if (state.balance < item.price) throw new Error("Poin Tidak Cukup");
        state.balance -= item.price;
        state.owned.push(
          item.id,
          ...Object.values(item.preset ?? {}).filter((id) => id !== "none"),
        );
        state.receipts[data.requestId] = item.id;
      }
      sessionStorage.setItem("qa-wardrobe", JSON.stringify(state));
      if (state.loseResponse) {
        state.loseResponse = false;
        throw new Error("Respons terputus. Coba lagi.");
      }
    }
    return { catalog: WARDROBE, owned: [...state.owned], balance: state.balance };
  }
  if (operation === "channels")
    return Array.from({ length: w.lobbyChannelCount ?? 3 }, (_, n) => ({
      id: `CHANNEL-0${n + 1}`,
      occupied: 0,
      capacity: 25,
    }));
  if (operation === "connection-profile")
    return { ...w.profile.getState().profile, id: "bob", displayName: "Budi" };
  if (operation === "me")
    return { profile: w.profile.getState().profile, owned: w.profile.getState().owned };
  if (operation === "profile") {
    const profile = { ...w.profile.getState().profile, ...data };
    sessionStorage.setItem("qa-profile", JSON.stringify(profile));
    return profile;
  }
  if (operation === "dungeon" && data?.action === "leaderboard")
    return {
      top: [],
      period: "all-time",
      participants: 0,
      own: null,
      reward: "XP",
      achievements: [],
    };
  return clubRequest(operation, data);
}
