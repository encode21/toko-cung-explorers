import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
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
export async function dungeonCommand(
  action: "read" | "view" | "enter" | "resume" | "pose" | "interact" | "exit" | "travel",
  target?: string,
  questId?: string,
) {
  if (running) return;
  running = true;
  const generation = epoch;
  const transition = ["enter", "resume", "exit", "travel"].includes(action);
  let handoff = transition;
  if (handoff) beginChannelHandoff();
  useDungeon.setState({
    busy: true,
    ...(!["pose", "read"].includes(action) ? { error: "" } : {}),
    transition,
  });
  try {
    let data = await worldRequest<DungeonResponse>("dungeon", {
      action,
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
      }));
      useChannels.setState({ lease: data.lease, sceneReady: false });
    } else useDungeon.setState({ data });
    if (data.game) useGameCore.setState({ snapshot: data.game });
  } catch (e) {
    if (generation === epoch)
      useDungeon.setState({ error: e instanceof Error ? e.message : "Dungeon belum tersedia." });
  } finally {
    running = false;
    if (generation === epoch) {
      if (handoff) endChannelHandoff();
      useDungeon.setState({ busy: false, transition: false });
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
      spawn: null,
      entranceOpen: false,
      transition: false,
      tracked: false,
      error: "",
    });
  });
