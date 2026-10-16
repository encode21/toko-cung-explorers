import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { useProfile } from "@/identity/profile-store";
import { useChannels, connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { createId } from "@/lib/id";
import { atFishingSpot, fishingPhase, catchRevealing, type FishingSnapshot } from "./model";

type Action = "read" | "cast" | "reel";
interface FishingState {
  open: boolean;
  browsing: boolean;
  busy: boolean;
  error: string | null;
  rodId: string;
  data: FishingSnapshot | null;
  clockOffset: number;
  revealStarted: number | null;
  pending: { action: Action; castId?: string } | null;
}
export const useFishing = create<FishingState>(() => ({
  open: false,
  browsing: false,
  busy: false,
  error: null,
  rodId: "bamboo",
  data: null,
  clockOffset: 0,
  revealStarted: null,
  pending: null,
}));
let generation = 0;
export const fishingNow = () => performance.now() + useFishing.getState().clockOffset;
function session() {
  return { room: useChannels.getState().lease?.channel, connectionId };
}
async function request(action: Action, castId?: string) {
  if (useFishing.getState().busy) return;
  const account = useProfile.getState().profile?.id;
  const context = session();
  if (!context.room || !account) {
    useFishing.setState({ error: "Masuk ke channel dunia untuk memancing." });
    return;
  }
  const ticket = ++generation;
  useFishing.setState({
    busy: true,
    error: null,
    pending: { action, ...(castId ? { castId } : {}) },
  });
  const sent = performance.now();
  try {
    const data = await worldRequest<FishingSnapshot>("fishing", {
      ...context,
      action,
      ...(castId ? { castId } : {}),
      rodId: useFishing.getState().rodId,
    });
    if (
      ticket !== generation ||
      account !== useProfile.getState().profile?.id ||
      context.room !== session().room
    ) {
      // Cancel may have reached the server before an in-flight cast was created.
      if (action === "cast" && account === useProfile.getState().profile?.id)
        void worldRequest("fishing", { ...context, action: "cancel", castId }).catch(() => {});
      return;
    }
    useFishing.setState({
      data,
      revealStarted:
        action === "reel" && data.catch && data.cast?.status === "caught"
          ? performance.now()
          : null,
      clockOffset: data.serverNow - (sent + performance.now()) / 2,
      busy: false,
      pending: null,
    });
  } catch (e) {
    if (ticket === generation)
      useFishing.setState({
        busy: false,
        error: e instanceof Error ? e.message : "Koneksi terputus. Coba lagi.",
      });
  }
}
export async function openFishing() {
  if (!atFishingSpot(useGame.getState().playerPos)) return;
  if (useFishing.getState().open) return;
  useFishing.setState({ open: true, data: null, error: null });
  await request("read");
}
export async function castFishing() {
  if (catchRevealing(useFishing.getState().revealStarted, performance.now())) return;
  if (!atFishingSpot(useGame.getState().playerPos) || !useFishing.getState().data) return;
  return request("cast", createId());
}
export async function reelFishing() {
  const cast = useFishing.getState().data?.cast;
  if (cast) return request("reel", cast.id);
}
export function retryFishing() {
  const pending = useFishing.getState().pending;
  return request(pending?.action ?? "read", pending?.castId);
}
/** Movement never waits for the network. In-flight responses cannot reopen the activity. */
export function closeFishing() {
  const state = useFishing.getState();
  if (!state.open && !state.busy) return;
  ++generation;
  const castId = state.pending?.castId ?? state.data?.cast?.id;
  useFishing.setState({
    open: false,
    browsing: false,
    busy: false,
    data: null,
    revealStarted: null,
    pending: null,
    error: null,
  });
  if (castId)
    void worldRequest("fishing", { ...session(), action: "cancel", castId }).catch(() => {});
}
useProfile.subscribe((s, previous) => {
  if (s.profile?.id !== previous.profile?.id) {
    ++generation;
    useFishing.setState({
      open: false,
      browsing: false,
      busy: false,
      data: null,
      revealStarted: null,
      pending: null,
      error: null,
      rodId: "bamboo",
    });
  }
});
useChannels.subscribe((s, previous) => {
  if (s.lease?.channel !== previous.lease?.channel || (previous.playing && !s.playing))
    closeFishing();
});

/** Shared by touch, keyboard and the tracker; never queues a jump during fishing. */
export function fishingAction() {
  const state = useFishing.getState();
  if (
    !state.open ||
    state.busy ||
    state.browsing ||
    catchRevealing(state.revealStarted, performance.now())
  )
    return;
  if (state.error) return retryFishing();
  const phase = fishingPhase(state.data?.cast ?? null, fishingNow());
  return phase === "waiting" || phase === "bite" ? reelFishing() : castFishing();
}
