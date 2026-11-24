import type { ContextAction } from "@/game/interactions/context-action";
import { useGame } from "@/state/game-store";
import { eventPointWorld, progressTownEvent, useTownEvents } from "./store";

/** "Pungut sampah" / "Cek pos ronda" … at each unfinished point of an accepted event (server reach is 3 m). */
export function townEventContextActions(): ContextAction[] {
  const p = useGame.getState().playerPos;
  const { events, busy } = useTownEvents.getState();
  const out: ContextAction[] = [];
  for (const e of events) {
    if (e.status !== "active") continue;
    e.event.points.forEach((pt, i) => {
      if (e.progress.includes(i)) return;
      const w = eventPointWorld(e, pt);
      if (!w) return;
      const distance = Math.hypot(p[0] - w[0], p[2] - w[2]);
      if (distance <= 2.6 && p[1] < 4)
        out.push({
          id: `town:${e.host}:${i}`,
          label: e.event.verb,
          title: e.event.title,
          distance,
          priority: 3,
          busy,
          execute: () => progressTownEvent(e.host, i),
        });
    });
  }
  return out;
}
