import { useEffect, useRef } from "react";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { enterGang, useGang } from "@/game/gang/store";
import { enterHome, useHome } from "@/game/home/store";
import { useProlog } from "../store";
import "./pulang.css";
import { IN_ROOM_STEPS, advance, leaveThroughMouth, usePulang } from "./steps";

/** Resume placement, gang-mouth trigger and "masuk rumah" completion for prolog v2. */
export function PrologHomeRuntime() {
  const data = useProlog((s) => s.data);
  const playing = useChannels((s) => s.playing);
  const active = !!data && data.version === 2 && !data.completedAt && playing;
  const step = data?.step;
  // Resume: room steps respawn in the Rumah; the gang step on the own teras.
  // Once per step: channel reconnects flip `playing` and used to pull the player back inside.
  const placed = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !step || placed.current === step) return;
    placed.current = step;
    if (IN_ROOM_STEPS.has(step) && !useHome.getState().inside) enterHome();
    else if (step === "gang" && !useHome.getState().inside && useGang.getState().inside === null)
      void enterGang();
    // Only on first load of a step: later steps are reached by walking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    if (!active) return;
    let wasInGang = useGang.getState().inside !== null;
    const timer = window.setInterval(() => {
      const d = useProlog.getState().data,
        g = useGang.getState();
      if (!d || d.completedAt || useProlog.getState().busy) return;
      if (d.step === "gang" && !useHome.getState().inside) {
        const p = useGame.getState().playerPos;
        const inGang = g.inside !== null && !!g.data;
        // The mouth is the lane gate; leaving by "Kembali ke kota" also counts.
        if (
          (inGang && p[2] - g.data!.layout.origin[2] < -(d.home?.mouth ?? 6)) ||
          (!inGang && wasInGang && !useGame.getState().pendingTeleport)
        )
          void leaveThroughMouth();
        wasInGang = inGang;
      }
      if (d.step === "return" && useHome.getState().inside) void advance("return");
    }, 250);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (step !== "sleep") usePulang.setState({ sleeping: false });
  }, [step]);
  const fading = usePulang((s) => s.fading);
  return fading ? <div className="pulang-fade" aria-hidden /> : null;
}
