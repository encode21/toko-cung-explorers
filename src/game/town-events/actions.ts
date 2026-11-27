import { isMorningExercise, startMorningExercise } from "./morning-exercise";
import type { ContextAction } from "@/game/interactions/context-action";
import { useGame } from "@/state/game-store";
import { useSceneTime } from "@/game/time/scene-time";
import { useEasyJobs } from "@/game/easyjobs/store";
import { focusedActivity } from "./model";
import { useActivityFocus } from "./focus";
import { progressTownEvent, townEventTarget, useTownEvents } from "./store";

/** "Pungut sampah" / "Cek pos ronda" … at each unfinished point of an accepted event (server reach is 3 m). */
export function townEventContextActions(): ContextAction[] {
  const p = useGame.getState().playerPos;
  const { events, busy } = useTownEvents.getState();
  const focus = focusedActivity(
    events,
    !!useEasyJobs.getState().kuli,
    useActivityFocus.getState().selected,
  );
  const target = townEventTarget(events, useSceneTime.getState().hour, focus);
  if (!target || target.townEvent.point < 0) return [];
  const { host, point, label } = target.townEvent;
  const e = events.find((event) => event.host === host)!;
  const distance = Math.hypot(p[0] - target.position[0], p[2] - target.position[2]);
  return distance <= 2.6 && p[1] < 4
    ? [
        {
          id: `town:${host}:${point}`,
          label: isMorningExercise() ? "Sedang senam…" : label,
          title: e.event.title,
          distance,
          priority: 1,
          busy: busy || isMorningExercise(),
          execute: () =>
            e.event.key === "senam_pagi"
              ? startMorningExercise(host, point)
              : progressTownEvent(host, point),
        },
      ]
    : [];
}
