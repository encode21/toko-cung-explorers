import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GraphicsQuality = "AUTO" | "LOW" | "MEDIUM" | "HIGH";
export interface GameSettings {
  graphics: GraphicsQuality;
  cameraSensitivity: number;
  joystickSensitivity: number;
  uiSize: "compact" | "comfortable";
  showQuest: boolean;
  diagnostics: boolean;
}
export const useGameSettings = create<
  GameSettings & { update: (patch: Partial<GameSettings>) => void }
>()(
  persist(
    (set) => ({
      graphics: "AUTO",
      cameraSensitivity: 1,
      joystickSensitivity: 1,
      uiSize: "compact",
      showQuest: true,
      diagnostics: false,
      update: (patch) => set(patch),
    }),
    { name: "toko-cung-game-settings", version: 1 },
  ),
);
