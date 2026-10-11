import { create } from "zustand";
import { worldRequest, WorldApiError } from "@/services/world/client";
import {
  beginChannelHandoff,
  endChannelHandoff,
  connectionId,
  useChannels,
} from "@/net/channel-store";
import { realtime } from "@/net/realtime";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { useGameCore } from "@/game/core/store";
import { useHud } from "@/state/hud-store";
import type { DungeonResponse } from "./types";
interface State {
  data: DungeonResponse | null;
  busy: boolean;
  transition: boolean;
  error: string;
  entranceOpen: boolean;
  spawn: [number, number, number] | null;
  sceneRevision: number;
  tracked: boolean;
}
export const useDungeon = create<State>(() => ({
  data: null,
  busy: false,
  transition: false,
  error: "",
  entranceOpen: false,
  spawn: null,
  sceneRevision: 0,
  tracked: false,
}));
let running = false;
let epoch = 0;
type DungeonAction =
  | "read"
  | "view"
  | "enter"
  | "resume"
  | "pose"
  | "interact"
  | "exit"
  | "travel";
type Queued = {
  action: DungeonAction;
  target?: string;
  questId?: string;
  resolve: () => void;
};
let queued: Queued | null = null;

export async function dungeonCommand(
  action: DungeonAction,
  target?: string,
  questId?: string,
) {
  if (running) {
    // Prefer user actions over background poll when contended.
    const background = action === "pose" || action === "read" || action === "view";
    if (background) return;
    // Queue enter/exit/etc.; mark busy so UI shows wait without blocking on poll busy.
    useDungeon.setState({ busy: true, error: "" });
    return new Promise<void>((resolve) => {
      queued = {
        action,
        resolve,
        ...(target !== undefined ? { target } : {}),
        ...(questId !== undefined ? { questId } : {}),
      };
    });
  }
  running = true;
  const generation = epoch;
  const transition = ["enter", "resume", "exit", "travel"].includes(action);
  const background = action === "pose" || action === "read" || action === "view";
  let handoff = transition;
  if (handoff) beginChannelHandoff();
  // Soft poll must not flip busy — Mission Board disables "Mulai misi" while busy.
  useDungeon.setState({
    ...(background ? {} : { busy: true, error: "" }),
    transition,
  });
  try {
    let data = await worldRequest<DungeonResponse>("dungeon", {
      action: action === "view" ? "read" : action,
      connectionId,
      room: useNet.getState().room,
      dungeonId: useDungeon.getState().data?.config.dungeonId ?? "distribution_center_v1",
      ...(target ? { target } : {}),
      ...(questId ? { questId } : {}),
      ...(action === "pose" ? { position: useGame.getState().playerPos } : {}),
    });
    if (generation !== epoch) return;
    if (
      data.instance &&
      (data.instance.currentRoom ?? data.instance.room) !== useChannels.getState().lease?.channel &&
      !data.lease
    ) {
      handoff = true;
      beginChannelHandoff();
      useDungeon.setState({ transition: true });
      data = await worldRequest<DungeonResponse>("dungeon", {
        action: "resume",
        connectionId,
        room: useNet.getState().room,
      });
      if (generation !== epoch) return;
    }
    if (data.lease) {
      handoff = true;
      beginChannelHandoff();
      useDungeon.setState({ transition: true });
      useChannels.setState({ playing: false, lease: null });
      await realtime.removeAllChannels();
      if (generation !== epoch) return;
      await realtime.realtime.setAuth(data.lease.realtimeToken);
      if (generation !== epoch) return;
      useNet.getState().setRoom(data.lease.channel);
      useGame.setState({
        nearby: null,
        sitting: false,
        sittingBenchId: null,
        overlay: "none",
        waypoint: null,
        playerPos: data.position ?? [0, 0.83, 12],
      });
      useHud.getState().setSheet(null);
      useHud.setState({ principalPanel: null });
      useDungeon.setState((s) => ({
        data,
        spawn: data.position ?? null,
        sceneRevision: s.sceneRevision + 1,
        entranceOpen: false,
        error: "",
      }));
      useChannels.setState({ lease: data.lease, sceneReady: false });
    } else useDungeon.setState({ data, error: "" });
    if (data.game) useGameCore.setState({ snapshot: data.game, error: "" });
  } catch (e) {
    if (generation !== epoch) return;
    // Polling / soft refresh: jangan tempel error sticky yang menutup gameplay.
    if (background && useDungeon.getState().data) return;
    useDungeon.setState({
      error:
        e instanceof WorldApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Dungeon belum tersedia.",
    });
  } finally {
    running = false;
    if (generation === epoch) {
      if (handoff) endChannelHandoff();
      // Keep busy if a user action is queued behind this request.
      useDungeon.setState({
        busy: !!queued,
        transition: false,
      });
    }
    const next = queued;
    queued = null;
    if (next) void dungeonCommand(next.action, next.target, next.questId).then(next.resolve);
  }
}
export function isDungeonRoom() {
  return useNet.getState().room.startsWith("DNG-");
}
if (typeof window !== "undefined")
  window.addEventListener("world-account-cleared", () => {
    epoch++;
    queued = null;
    useDungeon.setState({
      data: null,
      spawn: null,
      entranceOpen: false,
      transition: false,
      tracked: false,
      error: "",
    });
  });
