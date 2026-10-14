import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { connectionId, useChannels } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { getActiveChannel } from "@/net/useWorldChannel";
import { useGame } from "@/state/game-store";
import { useWorldEditor } from "@/game/editor/store";
import { newerSnapshot, type ClubSnapshot } from "./model";
interface ClubStore {
  inside: boolean;
  outdoor: boolean;
  data: ClubSnapshot | null;
  offset: number;
  error: string;
  busy: boolean;
  suppressed: boolean;
}
export const useClub = create<ClubStore>(() => ({
  inside: false,
  outdoor: false,
  data: null,
  offset: 0,
  error: "",
  busy: false,
  suppressed: false,
}));
let generation = 0;
let chain = Promise.resolve();
export function clubNow() {
  return Date.now() + useClub.getState().offset;
}
export function clubTarget(type: string, exit = false) {
  return useWorldEditor
    .getState()
    .targets.find(
      (t) =>
        t.active &&
        t.type === type &&
        (type !== "CLUB_ENTRANCE" || t.tags.includes("club-exit") === exit),
    );
}
export function clubTeleport(exit: boolean) {
  const t = clubTarget(exit ? "CLUB_ENTRANCE" : "CLUB_SPAWN");
  const p = t?.position;
  useGame.setState({
    pendingTeleport: p
      ? [p.x, p.y + 0.83, p.z + (exit ? 2 : 0)]
      : exit
        ? [10.4, 0.83, 5.8]
        : [0, -13.17, 6],
  });
}
export function resetClub() {
  generation++;
  // Dungeon handoffs own their spawn; only restore the outdoor floor for world channels.
  if (
    useClub.getState().inside &&
    !useClub.getState().outdoor &&
    useChannels.getState().lease?.channel.startsWith("CHANNEL-")
  )
    clubTeleport(true);
  useClub.setState({
    inside: false,
    outdoor: false,
    data: null,
    error: "",
    busy: false,
    suppressed: false,
  });
}
/** Serialize commands so moderation never races this tab's own read / queue revision. */
export function clubCommand(action: string, extra: Record<string, unknown> = {}): Promise<void> {
  const { outdoor, ...payload } = extra;
  const ticket = generation;
  const room = useChannels.getState().lease?.channel;
  const run = async () => {
    if (!room?.startsWith("CHANNEL-") || ticket !== generation) return;
    if (!useNet.getState().connected && action !== "exit") {
      useClub.setState({ error: "Multiplayer terputus. Menyambungkan kembali…" });
      return;
    }
    const start = Date.now();
    if (action !== "read") useClub.setState({ busy: true, error: "" });
    try {
      const s = await worldRequest<ClubSnapshot>("club", {
        action,
        room,
        connectionId,
        queueVersion: useClub.getState().data?.queueVersion ?? 0,
        ...payload,
      });
      if (ticket !== generation || room !== useChannels.getState().lease?.channel) return;
      if (newerSnapshot(s, useClub.getState().data, room))
        useClub.setState({ data: s, offset: s.serverNow - (start + Date.now()) / 2, error: "" });
      if (action === "enter") {
        useClub.setState({ inside: true, outdoor: outdoor === true });
        if (!outdoor) clubTeleport(false);
      }
      if (action === "exit" || (useClub.getState().inside && !s.members[connectionId])) {
        const wasOutdoor = useClub.getState().outdoor;
        useClub.setState({ inside: false, outdoor: false, data: null, suppressed: false });
        if (!wasOutdoor) clubTeleport(true);
      }
      if (action === "dance" || action === "sync") useClub.setState({ suppressed: false });
      // Retry a lost stop on reconciliation; never let a failed request resume the dance.
      if (action === "read" && useClub.getState().suppressed && s.members[connectionId]?.dance)
        void clubCommand("stop-dance", {
          expectedStartAt: s.members[connectionId]!.dance!.startedAt,
        });
      if (action !== "read")
        void getActiveChannel()?.send({
          type: "broadcast",
          event: "club_changed",
          payload: { roomId: room, revision: s.revision },
        });
    } catch (e) {
      if (ticket === generation)
        useClub.setState({ error: e instanceof Error ? e.message : "Club unavailable." });
    } finally {
      if (ticket === generation && action !== "read") useClub.setState({ busy: false });
    }
  };
  chain = chain.then(run, run);
  return chain;
}
export function stopDanceOnMove() {
  const s = useClub.getState();
  if (s.data?.members[connectionId]?.dance && !s.suppressed) {
    useClub.setState({ suppressed: true });
    void clubCommand("stop-dance", {
      expectedStartAt: s.data.members[connectionId]!.dance!.startedAt,
    });
  }
}
export function danceFor(id: string) {
  const s = useClub.getState();
  if (id === connectionId && s.suppressed) return null;
  const member = s.data?.members[id];
  return member && member.expiresAt > clubNow() ? member.dance : null;
}
