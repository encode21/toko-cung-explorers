import { useEffect } from "react";
import { playWarungSfx } from "@/game/audio/sfx";
import { leaveSfx } from "./model";
import { useWarung } from "./store";

/** Plays warung cues by diffing store updates, so gameplay code stays sound-free. */
export function WarungSfx() {
  useEffect(
    () =>
      useWarung.subscribe((s, prev) => {
        if (s.inside && s.customers !== prev.customers) {
          const before = new Map(prev.customers.map((c) => [c.id, c]));
          for (const c of s.customers) {
            const old = before.get(c.id);
            if (!old) playWarungSfx(c.eventKind ? "visitor" : "arrive");
            else if (old.leavingAt === null && c.leavingAt !== null && c.reaction)
              playWarungSfx(leaveSfx(c.reaction));
          }
        }
        if (s.thief && !prev.thief) {
          playWarungSfx("thief");
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            navigator.vibrate?.([120, 60, 120]);
        }
        const story = s.data?.story;
        const was = prev.data?.story;
        if (story && was && (story.step > was.step || (story.finished && !was.finished)))
          playWarungSfx("chapter");
        // Koko Cung comes to collect when a rent day is first owed.
        if ((s.data?.rent?.owedDays ?? 0) > 0 && (prev.data?.rent?.owedDays ?? 0) < 1 && prev.data)
          playWarungSfx("visitor");
      }),
    [],
  );
  return null;
}
