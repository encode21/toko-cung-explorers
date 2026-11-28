import { clearSkyAfterSleep } from "@/game/weather/store";
import { showLoader } from "@/ui/hud/travel-loader";
import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import type { MapDestination } from "@/game/navigation/map-destinations";
import { useGame } from "@/state/game-store";
import { houseFront, housePose, ownPorchWarung, usesPrologHomeFacade } from "@/game/gang/model";
import { useGang, leaveGang } from "@/game/gang/store";
import { useEnergy, energyCommand } from "@/game/energy/store";
import { useWarung, warungCommand } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { canLeaveHome, HOME_SPOTS, homeWorld, nearHomeSpot } from "@/game/home/model";
import { leaveHome, useHome } from "@/game/home/store";
import { prologCommand, useProlog } from "../store";
import type { PrologData, PrologStep } from "../types";

/** Steps drawn by the F5 UI; reveal/map/path/goal keep the F2b components. */
const HOME_STEPS = new Set<PrologStep>([
  "wake",
  "window",
  "box",
  "phone",
  "gang",
  "koko",
  "return",
  "sleep",
]);
export const isHomeStep = (d: PrologData) => d.version === 2 && HOME_STEPS.has(d.step);
/** Before leaving the Rumah, a resumed session respawns inside it. */
export const IN_ROOM_STEPS = new Set<PrologStep>(["wake", "window", "box", "phone", "sleep"]);
/** Jendela, kardus and kasur exist only in the Rumah: outside it (door, city gate fallback) the step leads home first. */
const ROOM_TASKS = new Set<PrologStep>(["window", "box", "sleep"]);
export const needsHome = (step: PrologStep) => ROOM_TASKS.has(step) && !useHome.getState().inside;

export type Neighbor = "romlah" | "kosim";
export const NEIGHBOR_AVATAR: Record<Neighbor, string> = {
  romlah: "npc-shopper-1",
  kosim: "npc-owner",
};
export const usePulang = create<{
  talk: Neighbor | null;
  talked: Neighbor[];
  box: boolean;
  koko: boolean;
  sleepMode: "prolog" | "regular" | null;
  sleepMotion: "climbing" | "lying" | null;
  sleeping: boolean;
  fading: boolean;
}>(() => ({
  talk: null,
  talked: [],
  box: false,
  koko: false,
  sleepMode: null,
  sleepMotion: null,
  sleeping: false,
  fading: false,
}));

export function v2() {
  const d = useProlog.getState().data;
  return d && d.version === 2 && !d.completedAt ? d : null;
}
/** World position of a neighbor NPC, relative to the player's own house. */
export function neighborSpot(who: Neighbor): [number, number, number] | null {
  const d = v2(),
    g = useGang.getState().data;
  if (!d?.home || !g || g.gang !== g.home.gang) return null;
  const p = housePose(g.home.number, g.layout),
    [across, forward] = d.home[who];
  return [
    g.layout.origin[0] + p.x + Math.sin(p.yaw) * forward,
    0,
    g.layout.origin[2] + p.z - Math.sin(p.yaw) * across,
  ];
}
/** Own house's front door in the current gang (null when visiting another gang). */
export function porch(): [number, number, number] | null {
  const g = useGang.getState().data;
  if (!g || g.gang !== g.home.gang) return null;
  if (ownPorchWarung(g) || usesPrologHomeFacade(g, v2()))
    return houseFront(g.home.number, g.layout);
  const p = housePose(g.home.number, g.layout);
  return [g.layout.origin[0] + p.x + Math.sin(p.yaw) * 5.6, 0.83, g.layout.origin[2] + p.z + 2.6];
}
export function advance(step: PrologStep) {
  return prologCommand("advance", { step });
}
/** Gang mouth → Gerbang Kampung: the server records the teleport, then the reveal starts at the gate. */
export async function leaveThroughMouth() {
  if (usePulang.getState().fading) return;
  usePulang.setState({ fading: true });
  await advance("gang");
  if (useProlog.getState().data?.step === "reveal" && useGang.getState().inside !== null)
    leaveGang();
  window.setTimeout(() => usePulang.setState({ fading: false }), 600);
}

const hh = (h: number) => `${String(h).padStart(2, "0")}.00`;

function startHomeSleep(mode: "prolog" | "regular") {
  const sleep = usePulang.getState();
  if (sleep.sleepMotion || sleep.fading || useHome.getState().leaving) return;
  usePulang.setState({ sleepMode: mode, sleepMotion: "climbing", sleeping: false });
}

export function endHomeSleep() {
  const { sleepMode, sleepMotion, sleeping } = usePulang.getState();
  if (sleepMotion || sleeping)
    usePulang.setState({ sleepMode: null, sleepMotion: null, sleeping: false });
  if (sleepMode === "regular" && useEnergy.getState().sleepChoice)
    useEnergy.setState({ sleepChoice: false });
}

export function endPrologSleep() {
  if (usePulang.getState().sleepMode === "prolog") endHomeSleep();
}

/** The quest summary or regular sleep controls appear after the avatar settles on the bed. */
export function completeHomeSleepMotion() {
  const { sleepMode, sleepMotion, sleeping } = usePulang.getState();
  if (!sleepMotion || sleeping) return;
  usePulang.setState({ sleeping: true });
  if (sleepMode !== "regular") return;
  const warung = useWarung.getState().data?.warung;
  const energy = useEnergy.getState();
  if (warung?.isOpen) void startBedNap();
  else if (warung || energy.enabled) useEnergy.setState({ sleepChoice: true });
  else void sleepNoWarung();
}

export async function startBedNap() {
  useEnergy.setState({ sleepChoice: false });
  await energyCommand("nap_start");
  if (!useEnergy.getState().nap && usePulang.getState().sleepMode === "regular") endHomeSleep();
}

export async function wakeBedNap() {
  await energyCommand("nap_end");
  if (!useEnergy.getState().nap && usePulang.getState().sleepMode === "regular") endHomeSleep();
}

export async function sleepNoWarung() {
  if (usePulang.getState().fading) return;
  useEnergy.setState({ sleepChoice: false });
  usePulang.setState({ fading: true });
  try {
    if (await energyCommand("sleep")) {
      clearSkyAfterSleep();
      showLoader("😴 Zzz… tidur nyenyak", "Besok pagi buka warung di teras ya.", "rumah", 2600);
      const { enabled, value, max } = useEnergy.getState();
      useGame
        .getState()
        .setToast(
          enabled
            ? `😴 Tidur nyenyak, energi ${value}/${max}. Besok buka warung di teras ya.`
            : "😴 Selamat tidur. Besok buka warung di teras ya.",
        );
    }
  } finally {
    endHomeSleep();
    window.setTimeout(() => usePulang.setState({ fading: false }), 900);
  }
}
export async function sleepWithWarung(alarm: boolean) {
  if (usePulang.getState().fading) return;
  useEnergy.setState({ sleepChoice: false });
  const toast = useGame.getState().setToast;
  usePulang.setState({ fading: true });
  try {
    const s = await warungCommand("sleep", { alarm });
    const n = s?.news.find((x) => x.kind === "slept");
    // Server refusals (warung still open, request busy) used to vanish silently.
    if (!n)
      toast(`😶 ${useWarung.getState().error ?? "Belum bisa tidur sekarang, coba lagi sebentar."}`);
    // warungCommand already stored the response's energy bar.
    const { enabled, value, max, tired } = useEnergy.getState();
    if (n) {
      clearSkyAfterSleep();
      // Wake-up screen: oversleeping should make the player hurry to restock and serve.
      if (n.lateHours)
        showLoader(
          "😱 Aduh, kesiangan!",
          `Udah jam ${hh(n.wakeHour ?? 0)}, pembeli udah ngantre di depan warung! Buruan order barang di Toko Grosir terus layani mereka sebelum pada pindah ke warung sebelah.`,
          "rumah",
          4200,
        );
      else if (n.alarm)
        showLoader(
          "⏰ Kriiing! Bangun tepat waktu",
          "Cuci muka, cek rak, warung siap buka. Pembeli pagi biasanya paling rame!",
          "rumah",
          3000,
        );
      else
        showLoader(
          "😴 Tidur nyenyak",
          `Bangun jam ${hh(n.wakeHour ?? 0)}, segar dan siap jualan.`,
          "rumah",
          2600,
        );
      const e = enabled ? ` energi ${value}/${max}${tired ? " — masih capek" : ""}.` : "";
      toast(
        n.alarm
          ? `⏰ Bangun jam ${hh(n.wakeHour ?? 0)} tepat waktu,${e || " warung buka tepat waktu."}`
          : n.lateHours
            ? `😴 Kesiangan! Bangun jam ${hh(n.wakeHour ?? 0)}, warung telat buka ${n.lateHours} jam dan pembeli jam sibuk pagi terlewat.${e && ` Energi ${value}/${max}.`}`
            : `😴 Tidur nyenyak. Bangun jam ${hh(n.wakeHour ?? 0)}, warung buka tepat waktu.${e && ` Energi ${value}/${max}.`}`,
      );
    }
  } finally {
    endHomeSleep();
    window.setTimeout(() => usePulang.setState({ fading: false }), 900);
  }
}

export function prologHomeActions(): ContextAction[] {
  const s = useProlog.getState(),
    d = s.data;
  const home = useHome.getState();
  const inHome = home.inside;
  // A stale warung/usaha "inside" flag must never hide Tidur/Keluar while standing in the house.
  if (!inHome && (useWarung.getState().inside || useUsaha.getState().inside)) return [];
  const pos = useGame.getState().playerPos,
    t = d?.text ?? {},
    step = d?.version === 2 && !d.completedAt ? d.step : null,
    busy = s.busy || !!s.retry;
  const actions: ContextAction[] = [];
  const add = (id: string, label: string, title: string, execute: () => unknown, distance = 0) =>
    actions.push({
      id: `pulang:${id}`,
      label,
      title,
      priority: 0,
      distance,
      busy,
      error: s.error,
      execute,
    });
  if (inHome) {
    if (usePulang.getState().sleepMotion) return actions;
    if (!home.leaving && nearHomeSpot(pos, HOME_SPOTS.window)) {
      const opening = !home.windowOpen;
      actions.push({
        id: "pulang:window",
        label: opening ? "Buka" : "Tutup",
        title: "Jendela kamar",
        priority: 0,
        distance: 0,
        busy: false,
        error: step === "window" ? s.error : undefined,
        execute: () => {
          useHome.setState({ windowOpen: opening });
          if (opening && step === "window" && !busy) return advance("window");
          return undefined;
        },
      });
    }
    if (step === "box" && nearHomeSpot(pos, HOME_SPOTS.box))
      add("box", "Buka", t["box_title"] || "Barang Mbah", () => usePulang.setState({ box: true }));
    if (!home.leaving && nearHomeSpot(pos, HOME_SPOTS.bed, 2.2)) {
      if (step === "sleep") add("bed", t["sleep"]!, t["place"]!, () => startHomeSleep("prolog"));
      else {
        const { enabled, nap } = useEnergy.getState();
        const shopOpen = useWarung.getState().data?.warung?.isOpen;
        if (!nap && !usePulang.getState().fading && (enabled || !shopOpen)) {
          const [bx, , bz] = homeWorld(HOME_SPOTS.bed);
          actions.push({
            id: "pulang:bed",
            label: "Tidur",
            title: "Kasur",
            priority: 0,
            distance: Math.hypot(pos[0] - bx, pos[2] - bz),
            busy: false,
            execute: () => startHomeSleep("regular"),
          });
        }
      }
    }
    if (canLeaveHome(d) && !home.leaving && nearHomeSpot(pos, HOME_SPOTS.door))
      actions.push({
        id: "pulang:door",
        label: t["leave_home"] ?? "Keluar",
        title: t["place"] ?? "",
        priority: 0,
        distance: 0,
        busy: false,
        execute: () => leaveHome(),
      });
    return actions;
  }
  if (useGang.getState().inside === null) return actions;
  // Rumah shares the warung's front ring when both entrances lead through the same door.
  if (step === "gang")
    for (const who of ["romlah", "kosim"] as const) {
      const at = neighborSpot(who);
      if (at && Math.hypot(pos[0] - at[0], pos[2] - at[2]) < 3)
        add(who, t["talk"]!, t[who]!, () => usePulang.setState({ talk: who }));
    }
  return actions;
}

export function prologHomeDestination(id: string): MapDestination | undefined {
  const d = useProlog.getState().data;
  if (!d || d.completedAt) return;
  if (
    id === "prolog-home-window" ||
    id === "prolog-home-box" ||
    id === "prolog-home-bed" ||
    id === "prolog-home-exit"
  ) {
    if (!useHome.getState().inside) return;
    const markers = {
      "prolog-home-window": [HOME_SPOTS.window, "window", "window_hint", "Jendela"],
      "prolog-home-box": [HOME_SPOTS.box, "box", "box_title", "Kardus"],
      "prolog-home-bed": [HOME_SPOTS.bed, "sleep", "sleep_hint", "Kasur"],
      "prolog-home-exit": [HOME_SPOTS.door, "leave_home", "gang", "Keluar rumah"],
    } as const;
    const [spot, label, hint, fallback] = markers[id];
    const [x, , z] = homeWorld(spot);
    return {
      id,
      label: d.text[label] ?? fallback,
      detail: d.text[hint] ?? "",
      icon: "quest",
      position: [x, 0, z],
    };
  }
  const { data, inside } = useGang.getState();
  if (!data || inside !== data.gang || data.gang !== data.home.gang) return;
  if (id === "prolog-home-door") {
    const door = porch();
    if (door)
      return {
        id,
        label: d.text["enter_home"]!,
        detail: d.text["return"]!,
        icon: "quest",
        position: [door[0], 0, door[2]],
      };
  }
  if (id === "prolog-home-shop") {
    const house = data.houses.find((house) => house.mine);
    if (house?.warung?.lot === null) {
      const [x, , z] = houseFront(house.number, data.layout);
      return {
        id,
        label: house.warung.name,
        detail: d.text["serve_help"]!,
        icon: "store",
        position: [x, 0, z],
      };
    }
  }
  if (id === "prolog-home-romlah" || id === "prolog-home-kosim") {
    const who = id === "prolog-home-romlah" ? "romlah" : "kosim";
    const spot = neighborSpot(who);
    if (spot)
      return { id, label: d.text[who]!, detail: d.text["etalase"]!, icon: "quest", position: spot };
  }
  if (id === "prolog-home-mouth")
    return {
      id,
      label: d.text["mouth"]!,
      detail: d.text["mouth_hint"]!,
      icon: "quest",
      position: [data.layout.origin[0], 0, data.layout.origin[2] - (d.home?.mouth ?? 6) - 2],
    };
  return undefined;
}
