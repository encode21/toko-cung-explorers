import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { create } from "zustand";
import { useGameSettings } from "@/state/game-settings";
import { LOW_QUALITY, type RenderTier } from "./quality";

export type Tier = RenderTier;
export const useRenderBudget = create<{
  tier: Tier;
  fps: number;
  calls: number;
  triangles: number;
}>(() => ({ tier: LOW_QUALITY ? "LOW" : "HIGH", fps: 0, calls: 0, triangles: 0 }));
const tiers: Tier[] = ["LOW", "MEDIUM", "HIGH"];
export const selectBudgetLow = (s: { tier: Tier }) => s.tier === "LOW";
export const selectBudgetTier = (s: { tier: Tier }) => s.tier;
/** Long sampling windows and cooldown prevent quality oscillation after short hitches. */
export function AdaptiveQuality() {
  const quality = useGameSettings((s) => s.graphics);
  const tier = useRenderBudget((s) => s.tier);
  const setDpr = useThree((s) => s.setDpr);
  const camera = useThree((s) => s.camera);
  const sample = useRef({ elapsed: 0, frames: 0, lastChange: 0 });
  useEffect(() => {
    useRenderBudget.setState({
      tier: quality === "AUTO" ? (LOW_QUALITY ? "LOW" : "HIGH") : quality,
    });
    sample.current = { elapsed: 0, frames: 0, lastChange: performance.now() };
  }, [quality]);
  useEffect(() => {
    setDpr(
      Math.min(
        window.devicePixelRatio || 1,
        tier === "LOW" ? 0.85 : tier === "MEDIUM" ? 1.15 : 1.5,
      ),
    );
    camera.far = tier === "LOW" ? 260 : 420;
    camera.updateProjectionMatrix();
  }, [tier, setDpr, camera]);
  useFrame(({ gl }, delta) => {
    if (document.hidden || delta > 0.5) {
      sample.current.elapsed = 0;
      sample.current.frames = 0;
      return;
    }
    const s = sample.current;
    s.elapsed += delta;
    s.frames++;
    if (s.elapsed < 6) return;
    const fps = s.frames / s.elapsed;
    useRenderBudget.setState({
      fps: Math.round(fps),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    });
    s.elapsed = 0;
    s.frames = 0;
    if (quality !== "AUTO") return;
    const now = performance.now();
    const index = tiers.indexOf(tier);
    // Mobile/low-power: degrade-only. Upgrading re-enables Environment + higher DPR and
    // recreates the heat → thermal-throttle → lag spiral after a few quiet minutes.
    const canUpgrade = !LOW_QUALITY && fps > 57 && now - s.lastChange > 45000;
    const next =
      fps < 35 && now - s.lastChange > 20000
        ? Math.max(0, index - 1)
        : canUpgrade
          ? Math.min(2, index + 1)
          : index;
    if (next !== index) {
      useRenderBudget.setState({ tier: tiers[next]! });
      s.lastChange = now;
    }
  });
  return null;
}
