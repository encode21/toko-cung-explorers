import type { ContextAction } from "@/game/interactions/context-action";
import { useGame } from "@/state/game-store";
import { openFishing } from "@/game/fishing/store";
import { atFishingSpot, fishingExtraSpot } from "@/game/fishing/model";
import { KIOSKS } from "@/game/pasar/model";
import { openPasar } from "@/game/pasar/store";
import { openNpcScript } from "@/game/npc/scripts";
import { useTownEvents } from "@/game/town-events/store";
import { useActivityFocus } from "@/game/town-events/focus";
import { focusedActivity } from "@/game/town-events/model";
import { FISH_STALL, FRUIT_STALL, FRUIT_TREES, KULI_TRUCK, kuliTarget, treeReady } from "./model";
import {
  dropKarung,
  pickFruit,
  pickupKarung,
  sellFish,
  sellFruit,
  startKuli,
  useEasyJobs,
} from "./store";

export function easyJobsContextActions(): ContextAction[] {
  const p = useGame.getState().playerPos,
    s = useEasyJobs.getState(),
    out: ContextAction[] = [];
  const add = (
    id: string,
    label: string,
    title: string,
    at: readonly number[],
    run: () => void,
    priority = 3,
  ) => {
    const distance = Math.hypot(p[0] - at[0]!, p[2] - at[2]!);
    if (distance <= 2.8 && p[1] < 4)
      out.push({ id, label, title, distance, priority, busy: false, execute: run });
  };
  for (const k of KIOSKS) {
    add(`pasar:${k.id}`, `Belanja di ${k.name}`, k.name, k.at, () => openPasar(k.id));
    add(`pasar:talk:${k.id}`, `Bicara dengan ${k.vendor}`, k.name, k.at, () =>
      openNpcScript(k.vendorId),
    );
  }
  const now = Date.now();
  for (const t of FRUIT_TREES)
    if (treeReady(s.pickedAt[t.id], now))
      add(`easy:petik:${t.id}`, "Petik", `Pohon ${t.fruit}`, [t.x, 0, t.z], () => pickFruit(t.id));
  const fruit = Object.values(s.basket).reduce((n, c) => n + c, 0);
  if (fruit)
    add("easy:sell-fruit", "Jual buah", `Kios buah · ${fruit} buah`, FRUIT_STALL, sellFruit);
  if (s.fishBag.length)
    add(
      "easy:sell-fish",
      "Jual ikan",
      `Kios ikan · ${s.fishBag.length} ekor`,
      FISH_STALL,
      sellFish,
    );
  if (!s.kuli) add("easy:kuli", "Jadi kuli", "Kuli angkut pasar", KULI_TRUCK, startKuli);
  else if (
    focusedActivity(useTownEvents.getState().events, true, useActivityFocus.getState().selected) ===
    "kuli"
  ) {
    if (!s.kuli.carrying)
      add("easy:kuli-pick", "Angkat karung", "Truk pasar", KULI_TRUCK, pickupKarung, 1);
    else add("easy:kuli-drop", "Taruh karung", "Kios tujuan", kuliTarget(s.kuli), dropKarung, 1);
  }
  const empang = fishingExtraSpot();
  // Same radius the fishing panel checks, so the button never shows where tapping does nothing.
  if (empang && atFishingSpot(p)) add("easy:empang", "Memancing", "Empang", empang, openFishing);
  return out;
}
