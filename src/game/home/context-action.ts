import type { ContextAction } from "@/game/interactions/context-action";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useProlog } from "@/game/prolog/store";
import { usePulang } from "@/game/prolog/pulang/steps";
import { HOME_SPOTS, homeWorld, nearHomeSpot } from "./model";
import { useHome } from "./store";

const PROLOG_HOME_PRIORITY_STEPS = new Set(["window", "box", "sleep"]);

/** Interactive actions on non-prolog home furniture, such as the bedroom wardrobe. */
export function homeContextActions(): ContextAction[] {
  const home = useHome.getState();
  if (!home.inside || home.leaving || usePulang.getState().sleepMotion) return [];
  const pos = useGame.getState().playerPos;
  if (!nearHomeSpot(pos, HOME_SPOTS.wardrobe, 1.65)) return [];
  const [wx, , wz] = homeWorld(HOME_SPOTS.wardrobe);
  const prolog = useProlog.getState().data;
  const priorityStep =
    prolog?.version === 2 && !prolog.completedAt && PROLOG_HOME_PRIORITY_STEPS.has(prolog.step);
  return [
    {
      id: "home:wardrobe",
      label: "Pakaian",
      title: "Lemari",
      priority: priorityStep ? 1 : 0,
      distance: Math.hypot(pos[0] - wx, pos[2] - wz),
      busy: false,
      execute: () => useHud.getState().setSheet("appearance"),
    },
  ];
}
