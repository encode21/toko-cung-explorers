import { create } from "zustand";

/** One-shot request to open the city map on the kavling layer (from the Warungku lot card). */
export const useMapFocus = create<{ lots: boolean }>(() => ({ lots: false }));
