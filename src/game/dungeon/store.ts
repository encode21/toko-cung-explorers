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
import { announceDungeonComplete } from "./announce-complete";
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
let pending: Promise<void> | null = null;
let epoch = 0;
type DungeonAction = "read" | "view" | "enter" | "resume" | "pose" | "interact" | "exit" | "travel";
export function dungeonCommand(
  action: DungeonAction,
  target?: string,
  questId?: string,
): Promise<void> {
  const background = action === "pose" || action === "read";
  if (background && (pending || useDungeon.getState().busy)) return Promise.resolve();
  if (!background && useDungeon.getState().busy) return pending ?? Promise.resolve();
  const generation = epoch;
  if (!background) useDungeon.setState({ busy: true, error: "" });
  const task = (pending ?? Promise.resolve()).then(async () => {
    if (generation === epoch) await executeDungeonCommand(action, target, questId);
  });
  pending = task;
  void task.finally(() => {
    if (pending === task) pending = null;
  });
  return task;
}
async function executeDungeonCommand(action: DungeonAction, target?: string, questId?: string) {
  const background = action === "pose" || action === "read";
  const generation = epoch;
  // Only enter/exit/travel start a channel handoff up front. Lobby `resume` must
  // not bump channel generation — it races listChannels and freezes the lobby.
  const mayHandoff = ["enter", "exit", "travel"].includes(action);
  let handoff = false;
  if (mayHandoff) {
    handoff = true;
    beginChannelHandoff();
  }
  // Soft poll must not flip busy — Mission Board disables "Mulai misi" while busy.
  useDungeon.setState({
    ...(background ? {} : { busy: true, error: "" }),
    transition: mayHandoff || action === "resume",
  });
  try {
    const prevStatus = useDungeon.getState().data?.instance?.status;
    let data = await worldRequest<DungeonResponse>("dungeon", {
      action: action === "view" ? "read" : action,
      connectionId,
      room: useNet.getState().room,
      dungeonId: useDungeon.getState().data?.config.dungeonId ?? "distribution_center_v1",
      ...(target ? { target } : {}),
      ...(questId ? { questId } : {}),
      ...(["pose", "interact", "travel"].includes(action)
        ? { position: useGame.getState().playerPos }
        : {}),
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
      if (!handoff) {
        handoff = true;
        beginChannelHandoff();
      }
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
    } else useDungeon.setState({ data, ...(!background ? { error: "" } : {}) });
    if (data.game) useGameCore.setState({ snapshot: data.game, error: "" });
    announceDungeonComplete(prevStatus, data);
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
    if (generation === epoch) {
      if (handoff) endChannelHandoff();
      useDungeon.setState({ ...(!background ? { busy: false } : {}), transition: false });
    }
  }
}
export function isDungeonRoom() {
  return useNet.getState().room.startsWith("DNG-");
}
if (typeof window !== "undefined")
  window.addEventListener("world-account-cleared", () => {
    epoch++;
    useDungeon.setState({
      data: null,
      busy: false,
      spawn: null,
      entranceOpen: false,
      transition: false,
      tracked: false,
      error: "",
    });
  });
