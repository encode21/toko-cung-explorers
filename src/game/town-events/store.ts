import { create } from "zustand";
import { takeEnergy } from "@/game/energy/store";
import { useGang } from "@/game/gang/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useSceneTime } from "@/game/time/scene-time";
import { focusedActivity, liveEvents, townEventStep } from "./model";
import { trackActivity, useActivityFocus } from "./focus";
import { useEasyJobs } from "@/game/easyjobs/store";
import { gangExitGuide } from "@/game/gang/model";
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

let mutationRevision = 0;
async function cmd(action: string, extra: Record<string, unknown> = {}) {
  if (useTownEvents.getState().busy) return null;
  const revision = action === "read" ? mutationRevision : ++mutationRevision;
  useTownEvents.setState({ busy: action !== "read", error: "" });
  try {
    const r = await worldRequest<EventsResponse>("events", {
      action,
      ...(action === "read" ? {} : { requestId: createId() }),
      ...extra,
    });
    // A poll started before a completed step must not restore its old marker.
    if (revision !== mutationRevision) return null;
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
    if (action !== "read") {
      mutationRevision++;
      useTownEvents.setState({ busy: false });
    }
  }
}

export const loadTownEvents = () => cmd("read");
export async function acceptTownEvent(host: TownHost) {
  const r = await cmd("accept", { host });
  if (r) trackActivity(`town:${host}`);
  return r;
}
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
export async function cancelTownEvent(host: TownHost) {
  const r = await cmd("cancel", { host });
  if (r) useGame.getState().setToast("Quest dibatalkan.");
  return !!r;
}

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

/**
 * Ground guidance (the ojol-style dots under the feet) toward the next unfinished point of an
 * accepted event in the current scene.
 */
export function useTownEventTarget() {
  const events = useTownEvents((s) => s.events);
  const hour = useSceneTime((s) => s.hour);
  useGang((s) => s.inside);
  useGang((s) => s.data?.layout);
  const kuli = useEasyJobs((s) => s.kuli);
  const selected = useActivityFocus((s) => s.selected);
  return townEventTarget(events, hour, focusedActivity(events, !!kuli, selected));
}

export function townEventTarget(events: TownEvent[], hour: number, focus: string | null) {
  for (const e of liveEvents(events, hour)) {
    if (`town:${e.host}` !== focus) continue;
    const step = townEventStep(e);
    const position = eventPointWorld(e, step.at);
    if (position)
      return {
        objective: null,
        position,
        realm: "WORLD" as const,
        activityId: focus,
        townEvent: { host: e.host, point: step.point, label: step.label },
      };
    const layout = useGang.getState().data?.layout;
    const travel =
      e.scene === "city"
        ? gangExitGuide(true, layout)
        : layout?.gate
          ? {
              objective: null,
              position: [layout.gate.x + 6.2, 0, layout.gate.z + 1.8] as [number, number, number],
              realm: "WORLD" as const,
            }
          : null;
    return (
      travel && {
        ...travel,
        activityId: focus,
        townEvent: {
          host: e.host,
          point: -2,
          label: e.scene === "city" ? "Kembali ke kota" : "Masuk Gang Kampung",
        },
      }
    );
  }
  return null;
}
