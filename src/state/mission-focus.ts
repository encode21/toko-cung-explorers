import { create } from "zustand";
export const useMissionFocus = create(() => ({
  source: null as "daily" | "quest" | "mission" | null,
}));
