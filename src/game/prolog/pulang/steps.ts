import { clearSkyAfterSleep } from "@/game/weather/store";
import { showLoader } from "@/ui/hud/travel-loader";
import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import type { MapDestination } from "@/game/navigation/map-destinations";
import { useGame } from "@/state/game-store";
import { housePose } from "@/game/gang/model";
import { useGang, leaveGang } from "@/game/gang/store";
import { useEnergy, energyCommand } from "@/game/energy/store";
import { useWarung, warungCommand } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { HOME_SPOTS, nearHomeSpot } from "@/game/home/model";
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
  sleeping: boolean;
  fading: boolean;
}>(() => ({ talk: null, talked: [], box: false, koko: false, sleeping: false, fading: false }));

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
/** Tidur di kasur: with a warung the player first picks alarm or sleep-in (SleepChoice); the server decides the rest. */
export function sleepAtHome() {
  if (usePulang.getState().fading) return;
  if (useWarung.getState().data?.warung) useEnergy.setState({ sleepChoice: true });
  else void sleepNoWarung();
}
async function sleepNoWarung() {
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
    window.setTimeout(() => usePulang.setState({ fading: false }), 900);
  }
}
export async function sleepWithWarung(alarm: boolean) {
  if (usePulang.getState().fading) return;
  const toast = useGame.getState().setToast;
  usePulang.setState({ fading: true });
  try {
    const s = await warungCommand("sleep", { alarm });
    const n = s?.news.find((x) => x.kind === "slept");
    // Server refusals (warung still open, request busy) used to vanish silently.
    if (!n)
      toast(`😶 ${useWarung.getState().error ?? "Belum bisa tidur sekarang, coba lagi sebentar."}`);
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
      const e = n.energy
        ? ` energi ${n.energy.value}/${n.energy.max}${n.energy.tired ? " — masih capek" : ""}.`
        : "";
      toast(
        n.alarm
          ? `⏰ Bangun jam ${hh(n.wakeHour ?? 0)} tepat waktu,${e || " warung buka tepat waktu."}`
          : n.lateHours
            ? `😴 Kesiangan! Bangun jam ${hh(n.wakeHour ?? 0)}, warung telat buka ${n.lateHours} jam dan pembeli jam sibuk pagi terlewat.${e && ` Energi ${n.energy!.value}/${n.energy!.max}.`}`
            : `😴 Tidur nyenyak. Bangun jam ${hh(n.wakeHour ?? 0)}, warung buka tepat waktu.${e && ` Energi ${n.energy!.value}/${n.energy!.max}.`}`,
      );
    }
  } finally {
    window.setTimeout(() => usePulang.setState({ fading: false }), 900);
  }
}

export function prologHomeActions(): ContextAction[] {
  const s = useProlog.getState(),
    d = s.data;
  const inHome = useHome.getState().inside;
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
    if (step === "window" && nearHomeSpot(pos, HOME_SPOTS.window))
      add("window", t["window"]!, t["place"]!, () => {
        useHome.setState({ windowOpen: true });
        return advance("window");
      });
    if (step === "box" && nearHomeSpot(pos, HOME_SPOTS.box))
      add("box", t["box"]!, t["box_title"]!, () => usePulang.setState({ box: true }));
    if (step === "sleep" && nearHomeSpot(pos, HOME_SPOTS.bed, 2.2))
      add("bed", t["sleep"]!, t["place"]!, () => usePulang.setState({ sleeping: true }));
    else if (nearHomeSpot(pos, HOME_SPOTS.bed, 2.2))
      add("bed", "Tidur", "Kasur · boleh setelah warung tutup", () => sleepAtHome());
    // The way out never waits on a stuck prolog request.
    if (nearHomeSpot(pos, HOME_SPOTS.door) && !useHome.getState().leaving)
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
  // Masuk rumah is the yellow ground ring at the door (HomeDoorRing), not a button: it looked like Masuk warung.
  if (step === "gang")
    for (const who of ["romlah", "kosim"] as const) {
      const at = neighborSpot(who);
      if (at && Math.hypot(pos[0] - at[0], pos[2] - at[2]) < 3)
        add(who, t["talk"]!, t[who]!, () => usePulang.setState({ talk: who }));
    }
  return actions;
}

export function prologHomeDestination(id: string): MapDestination | undefined {
  const d = v2(),
    g = useGang.getState().data;
  if (!d || !g) return;
  if (id === "prolog-home-door") {
    const door = porch();
    if (door)
      return {
        id,
        label: d.text["enter_home"]!,
        detail: d.text["return"]!,
        icon: "quest",
        position: door,
      };
  }
  if (id === "prolog-home-mouth")
    return {
      id,
      label: d.text["mouth"]!,
      detail: d.text["mouth_hint"]!,
      icon: "quest",
      position: [g.layout.origin[0], 0, g.layout.origin[2] - 8],
    };
  return undefined;
}
/** Return step: from the city head for Gerbang Kampung, inside the gang head for the own door. */
export function guideHome() {
  const g = useGame.getState();
  if (useHome.getState().inside) return;
  g.setWaypoint(useGang.getState().inside !== null ? "prolog-home-door" : "gang-gate");
}
