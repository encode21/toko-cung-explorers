import { mobilityCommand } from "@/game/mobility/store";
import { create } from "zustand";
import { connectionId, useChannels } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useWorldEditor } from "@/game/editor/store";
import { MINI_NAMES, type MiniSnapshot } from "./model";

const empty: MiniSnapshot = { serverNow: 0, schedule: null, round: null, badges: [] };
export const useMinigames = create<MiniSnapshot & { receivedAt: number; busy: boolean }>(() => ({
  ...empty,
  receivedAt: 0,
  busy: false,
}));
let generation = 0;
let pending: Promise<void> | null = null;
export function miniNow() {
  const s = useMinigames.getState();
  return s.serverNow + performance.now() - s.receivedAt;
}
export function miniParticipant(id = connectionId) {
  const s = useMinigames.getState();
  if (
    performance.now() - s.receivedAt > 5000 ||
    !["lobby", "countdown", "running"].includes(s.round?.phase ?? "")
  )
    return undefined;
  return s.round?.players.find((p) => p.connectionId === id && !p.left);
}
export function miniRacePose(id = connectionId) {
  const s = useMinigames.getState(),
    r = s.round,
    p = miniParticipant(id);
  if (!r || !p || r.game !== "SACK" || r.phase === "lobby") return null;
  const t = Math.min(1, Math.max(0, (miniNow() - p.actedAt) / 600));
  return {
    x: 88 + 2 * (p.score - (p.score > 0 ? 1 - t : 0)),
    y: 0.9 + Math.sin(t * Math.PI) * 0.65,
    z: 29.5 + r.players.findIndex((v) => v.connectionId === id) * 1.6,
    ry: Math.PI / 2,
    hopping: t < 1,
  };
}
export function nearestChicken() {
  const r = useMinigames.getState().round,
    p = useGame.getState().playerPos;
  if (!miniParticipant() || r?.game !== "CHICKEN" || r.phase !== "running") return undefined;
  return r.chickens
    .filter((c) => c.available)
    .sort((a, b) => Math.hypot(a.x - p[0], a.z - p[2]) - Math.hypot(b.x - p[0], b.z - p[2]))
    .find((c) => Math.hypot(c.x - p[0], c.z - p[2]) < 2);
}
export async function miniCommand(
  action: "read" | "join" | "leave" | "jump" | "catch",
  extra: Record<string, unknown> = {},
) {
  const ticket = generation;
  const participant = miniParticipant();
  if (
    (action === "jump" || action === "catch") &&
    participant &&
    miniNow() - participant.actedAt < 700
  )
    return;
  if (action === "read" && (pending || useMinigames.getState().busy)) return;
  if (action !== "read") {
    if (useMinigames.getState().busy) return;
    useMinigames.setState({ busy: true });
    await pending;
    if (action === "join") await mobilityCommand("read");
  }
  if (ticket !== generation) return;
  const lease = useChannels.getState().lease,
    old = useMinigames.getState();
  if (!lease || !useNet.getState().connected) {
    useMinigames.setState({ busy: false });
    return;
  }
  const task = (async () => {
    try {
      const s = await worldRequest<MiniSnapshot>("minigames", {
        action,
        room: lease.channel,
        connectionId,
        position: useGame.getState().playerPos,
        roundId: old.round?.id,
        ...extra,
      });
      if (ticket !== generation || lease.channel !== useChannels.getState().lease?.channel) return;
      useMinigames.setState({ ...s, receivedAt: performance.now() });
      if (
        s.schedule &&
        s.schedule.id !== old.schedule?.id &&
        !useNet.getState().chat.some((m) => m.id === `mini-${s.schedule!.id}`)
      ) {
        const time = new Date(s.schedule.startsAt).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        });
        useNet.getState().pushChat({
          id: `mini-${s.schedule.id}`,
          from: "world-event",
          name: "Alun-alun",
          at: Date.now(),
          text: `${MINI_NAMES[s.schedule.game]} · ${s.serverNow < s.schedule.startsAt ? `${time} WIB` : "sedang dibuka"}. Datang ke panggung, minimal 2 pemain. Hadiah badge!`,
        });
      }
    } catch (e) {
      if (ticket === generation && action !== "read")
        useGame.getState().setToast(e instanceof Error ? e.message : "Ronde belum tersambung.");
    } finally {
      if (ticket === generation) useMinigames.setState({ busy: false });
    }
  })();
  pending = task;
  await task;
  if (pending === task) pending = null;
}
export function startMinigames() {
  generation++;
  pending = null;
  useMinigames.setState({ ...empty, receivedAt: 0, busy: false });
  let ticks = 0;
  const tick = () => {
    const s = useMinigames.getState(),
      g = useGame.getState(),
      p = g.playerPos;
    const own = miniParticipant();
    const unavailable =
      !useChannels.getState().playing ||
      useDungeon.getState().transition ||
      g.inside ||
      (useClub.getState().inside && !useClub.getState().outdoor) ||
      useWorldEditor.getState().mode !== "PLAYER" ||
      Math.hypot(p[0] - 104, p[2] - 35) > 35;
    if (own && unavailable) void miniCommand("leave");
    else if (performance.now() - s.receivedAt < 850) return;
    else if (own || Math.hypot(p[0] - 104, p[2] - 35) < 40 || ticks++ % 5 === 0)
      void miniCommand("read");
    if (!useNet.getState().connected || (s.receivedAt && performance.now() - s.receivedAt > 5000))
      useMinigames.setState({ round: null });
  };
  tick();
  const timer = window.setInterval(tick, 1000);
  return () => {
    clearInterval(timer);
    const r = useMinigames.getState().round,
      lease = useChannels.getState().lease;
    if (r && lease && miniParticipant())
      void worldRequest("minigames", {
        action: "leave",
        room: lease.channel,
        connectionId,
        position: useGame.getState().playerPos,
        roundId: r.id,
      }).catch(() => {});
    generation++;
    pending = null;
    useMinigames.setState({ ...empty, receivedAt: 0, busy: false });
  };
}
