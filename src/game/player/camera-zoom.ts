import { create } from "zustand";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.6;

/** Session-local distance multiplier; never changes avatar scale or camera FOV. */
export const useCameraZoom = create<{
  distance: number;
  adjust: (factor: number) => void;
}>()((set) => ({
  distance: 1,
  adjust: (factor) => {
    if (!Number.isFinite(factor) || factor <= 0) return;
    set((s) => ({ distance: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s.distance * factor)) }));
  },
}));
