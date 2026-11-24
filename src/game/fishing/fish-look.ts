/** Per-species look shared by the 3D FishModel and the SVG FishIcon. Pure data. */
export interface FishLook {
  back: string;
  belly: string;
  fin: string;
  tail: string;
  /** Vertical bars across the flank. */
  bars?: { color: string; count: number; strength: number };
  /** Irregular patches (koi). */
  patches?: string;
  /** Half body height relative to body length. */
  aspect: number;
  /** Caudal fin length relative to body length. */
  tailLen: number;
  /** [start, end, height] along the body (0 = tail, 1 = head). */
  dorsal: [number, number, number];
  anal: [number, number, number];
  scales?: number;
  upturned?: boolean;
  glow?: string;
  metal: number;
  rough: number;
}

export const FISH_LOOKS: Record<string, FishLook> = {
  wader: {
    back: "#7f9a8a",
    belly: "#f4f1e4",
    fin: "#e9d9a0",
    tail: "#f0cf7a",
    aspect: 0.12,
    tailLen: 0.22,
    dorsal: [0.4, 0.62, 0.07],
    anal: [0.3, 0.45, 0.05],
    metal: 0.7,
    rough: 0.25,
  },
  nila: {
    back: "#6e7358",
    belly: "#d9d6bd",
    fin: "#8d8f6a",
    tail: "#c4574a",
    bars: { color: "#4d5240", count: 7, strength: 0.35 },
    aspect: 0.24,
    tailLen: 0.22,
    dorsal: [0.2, 0.7, 0.09],
    anal: [0.3, 0.5, 0.06],
    metal: 0.3,
    rough: 0.5,
  },
  perch: {
    back: "#6a8a3a",
    belly: "#e8e3a0",
    fin: "#f08a2a",
    tail: "#f08a2a",
    bars: { color: "#25301a", count: 6, strength: 0.7 },
    aspect: 0.22,
    tailLen: 0.2,
    dorsal: [0.3, 0.72, 0.1],
    anal: [0.3, 0.5, 0.07],
    metal: 0.25,
    rough: 0.5,
  },
  koi: {
    back: "#f7f3ea",
    belly: "#fbf8f0",
    fin: "#fff0e0",
    tail: "#ffe8d6",
    patches: "#e8451f",
    aspect: 0.2,
    tailLen: 0.38,
    dorsal: [0.25, 0.65, 0.1],
    anal: [0.3, 0.45, 0.06],
    metal: 0.2,
    rough: 0.45,
  },
  arwana: {
    back: "#b8a063",
    belly: "#efe6c8",
    fin: "#c9b06b",
    tail: "#c9b06b",
    aspect: 0.12,
    tailLen: 0.16,
    dorsal: [0.05, 0.4, 0.07],
    anal: [0.1, 0.45, 0.06],
    scales: 14,
    upturned: true,
    metal: 0.85,
    rough: 0.25,
  },
  naga: {
    back: "#0f2a63",
    belly: "#3a7fd0",
    fin: "#2a6fd6",
    tail: "#2a6fd6",
    glow: "#59e0ff",
    aspect: 0.26,
    tailLen: 0.35,
    dorsal: [0.15, 0.75, 0.14],
    anal: [0.25, 0.5, 0.09],
    scales: 10,
    metal: 0.6,
    rough: 0.3,
  },
};

export const FALLBACK_LOOK = FISH_LOOKS["nila"] as FishLook;
export const fishLook = (id?: string | null): FishLook =>
  (id && Object.hasOwn(FISH_LOOKS, id) ? FISH_LOOKS[id] : undefined) ?? FALLBACK_LOOK;
