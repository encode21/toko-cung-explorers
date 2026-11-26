import { create } from "zustand";

/** Measured unobscured scene beside the Grosir drawer, in viewport CSS pixels. */
export const useKioskView = create<{ sceneWidth: number; sceneHeight: number }>(() => ({
  sceneWidth: 0,
  sceneHeight: 0,
}));
