import { worldRequest as clubRequest, WorldApiError } from "../club/client";
export { WorldApiError };
export function onAccountExpired() {}
export async function worldRequest(operation: string, data: any) {
  const w = window as any;
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
