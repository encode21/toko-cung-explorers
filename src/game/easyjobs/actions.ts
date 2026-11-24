import type { ContextAction } from "@/game/interactions/context-action";
import { useGame } from "@/state/game-store";
import { openFishing } from "@/game/fishing/store";
import { fishingExtraSpot } from "@/game/fishing/model";
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
  ) => {
    const distance = Math.hypot(p[0] - at[0]!, p[2] - at[2]!);
    if (distance <= 2.8 && p[1] < 4)
      out.push({ id, label, title, distance, priority: 3, busy: false, execute: run });
  };
  const now = Date.now();
  for (const t of FRUIT_TREES)
    if (treeReady(s.pickedAt[t.id], now))
      add(`easy:petik:${t.id}`, "Petik", `Pohon ${t.fruit}`, [t.x, 0, t.z], () =>
        pickFruit(t.id, t.fruit),
      );
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
  else if (!s.kuli.carrying)
    add("easy:kuli-pick", "Angkat karung", "Truk pasar", KULI_TRUCK, pickupKarung);
  else add("easy:kuli-drop", "Taruh karung", "Kios tujuan", kuliTarget(s.kuli), dropKarung);
  const empang = fishingExtraSpot();
  if (empang && p[1] < 4) add("easy:empang", "Memancing", "Empang", empang, openFishing);
  return out;
}
