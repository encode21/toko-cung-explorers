import { create } from "zustand";
import { takeEnergy } from "@/game/energy/store";
import { useGang } from "@/game/gang/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useWarung } from "@/game/warung/store";

/** Server POST /world/events (WorldTownEvents): Pak Kades (gang) and Pak Wali Kota (city) daily events. */
export type TownHost = "kades" | "walikota" | "mang-udin" | "bu-sri" | "pak-rt";
export interface TownEvent {
  host: TownHost;
  name: string;
  scene: "gang" | "city";
  at: [number, number];
  event: {
    key: string;
    title: string;
    verb: string;
    intro: string;
    done: string;
    points: [number, number][];
    hours?: [number, number];
    reward: number;
  };
  status: "available" | "active" | "done" | "resting";
  /** Indexes of points already done. */
  progress: number[];
  restUntilDay: number | null;
}
interface EventsResponse {
  events: TownEvent[];
  gameDay: number;
  kas: { cash: number | null };
}

export const useTownEvents = create<{ events: TownEvent[]; busy: boolean; error: string }>(() => ({
  events: [],
  busy: false,
  error: "",
}));

const GIVER_HOST: Record<string, TownHost> = {
  "npc-pak-kades": "kades",
  "npc-wali-kota": "walikota",
  "npc-mang-udin": "mang-udin",
  "npc-bu-sri": "bu-sri",
  "gang-neighbor-a": "pak-rt",
};
export const hostOfGiver = (giverId: string): TownHost => GIVER_HOST[giverId] ?? "walikota";
export const giverOfHost = (host: TownHost) =>
  Object.keys(GIVER_HOST).find((id) => GIVER_HOST[id] === host) ?? "npc-wali-kota";
export const townEvent = (host: TownHost) =>
  useTownEvents.getState().events.find((e) => e.host === host) ?? null;

async function cmd(action: string, extra: Record<string, unknown> = {}) {
  if (action !== "read" && useTownEvents.getState().busy) return null;
  useTownEvents.setState({ busy: action !== "read", error: "" });
  try {
    const r = await worldRequest<EventsResponse>("events", {
      action,
      ...(action === "read" ? {} : { requestId: createId() }),
      ...extra,
    });
    takeEnergy(r);
    useTownEvents.setState({ events: r.events });
    const { cash } = r.kas;
    if (cash != null)
      useWarung.setState((w) =>
        w.data?.warung ? { data: { ...w.data, warung: { ...w.data.warung, cash } } } : w,
      );
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal, coba lagi.";
    useTownEvents.setState({ error: msg });
    if (action === "progress") useGame.getState().setToast(msg);
    return null;
  } finally {
    useTownEvents.setState({ busy: false });
  }
}

export const loadTownEvents = () => cmd("read");
export const acceptTownEvent = (host: TownHost) => cmd("accept", { host });
export async function progressTownEvent(host: TownHost, point: number) {
  const r = await cmd("progress", { host, point });
  const e = r?.events.find((x) => x.host === host);
  if (e)
    useGame
      .getState()
      .setToast(
        e.progress.length === e.event.points.length
          ? `✅ ${e.event.title} beres! Lapor ke ${e.name}.`
          : `✔️ ${e.event.verb} (${e.progress.length}/${e.event.points.length})`,
      );
}
export const claimTownEvent = async (host: TownHost) => !!(await cmd("claim", { host }));

/** World position of an event point, or null when the player isn't in that event's scene. */
export function eventPointWorld(
  e: TownEvent,
  p: [number, number],
): [number, number, number] | null {
  const gang = useGang.getState();
  if (e.scene === "gang") {
    const o = gang.inside !== null ? gang.data?.layout.origin : null;
    return o ? [o[0] + p[0], 0, o[2] + p[1]] : null;
  }
  return gang.inside === null ? [p[0], 0, p[1]] : null;
}
