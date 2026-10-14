import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameSettings } from "@/state/game-settings";
import { INITIAL_TIER, RENDER_LIMITS, useRenderBudget, type RenderTier } from "./render-budget";
export { useRenderBudget } from "./render-budget";
const tiers: RenderTier[] = ["LOW", "MEDIUM", "HIGH"];
export function AdaptiveQuality() {
  const quality = useGameSettings((s) => s.graphics);
  const tier = useRenderBudget((s) => s.tier);
  const setDpr = useThree((s) => s.setDpr);
  const camera = useThree((s) => s.camera);
  const sample = useRef({
    elapsed: 0,
    frames: 0,
    lastChange: 0,
    lowWindows: 0,
    fastSeconds: 0,
    ignoreUntil: 0,
  });
  useEffect(() => {
    useRenderBudget.setState({ tier: quality === "AUTO" ? INITIAL_TIER : quality });
    const reset = () => {
      const now = performance.now();
      sample.current = {
        elapsed: 0,
        frames: 0,
        lastChange: now,
        lowWindows: 0,
        fastSeconds: 0,
        ignoreUntil: now + 3000,
      };
    };
    reset();
    window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [quality]);
  useEffect(() => {
    const limits = RENDER_LIMITS[tier];
    setDpr(Math.min(window.devicePixelRatio || 1, limits.dpr));
    camera.far = limits.far;
    camera.updateProjectionMatrix();
  }, [tier, setDpr, camera]);
  useFrame(({ gl }, delta) => {
    const s = sample.current;
    const now = performance.now();
    if (document.hidden || delta > 0.5 || now < s.ignoreUntil) {
      s.elapsed = s.frames = s.lowWindows = s.fastSeconds = 0;
      return;
    }
    s.elapsed += delta;
    s.frames++;
    if (s.elapsed < 6) return;
    const fps = s.frames / s.elapsed;
    s.lowWindows = fps < 30 ? s.lowWindows + 1 : 0;
    s.fastSeconds = fps > 57 ? s.fastSeconds + s.elapsed : 0;
    useRenderBudget.setState({
      fps: Math.round(fps),
      frameMs: 1000 / fps,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    });
    s.elapsed = s.frames = 0;
    if (quality !== "AUTO") return;
    const index = tiers.indexOf(tier);
    const next =
      s.lowWindows >= 2 && now - s.lastChange >= 20000
        ? Math.max(0, index - 1)
        : s.fastSeconds >= 45 && now - s.lastChange >= 45000
          ? Math.min(2, index + 1)
          : index;
    if (next !== index) {
      useRenderBudget.setState({ tier: tiers[next]! });
      s.lastChange = now;
      s.lowWindows = s.fastSeconds = 0;
    }
  });
  return null;
}
