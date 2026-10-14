import { create } from "zustand";
import { LOW_QUALITY } from "./quality";
export type RenderTier = "LOW" | "MEDIUM" | "HIGH";
export const INITIAL_TIER: RenderTier = LOW_QUALITY ? "MEDIUM" : "HIGH";
export const RENDER_LIMITS = {
  LOW: { dpr: 1, far: 260, shadow: 0 },
  MEDIUM: { dpr: 1.25, far: 340, shadow: 1024 },
  HIGH: { dpr: 1.5, far: 420, shadow: 2048 },
} as const;
export const useRenderBudget = create(() => ({
  tier: INITIAL_TIER as RenderTier,
  fps: 0,
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  frameMs: 0,
}));
export const useLowQuality = () => useRenderBudget((s) => s.tier === "LOW");
