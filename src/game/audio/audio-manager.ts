import { create } from "zustand";
import { ensureAudioContext, getAudioContext } from "./audio-context";

export type AudioCategory = "music" | "ambience" | "sfx" | "npc" | "vehicle";
const defaults = {
  master: 0.8,
  music: 1,
  ambience: 0.65,
  sfx: 1,
  npc: 0.7,
  vehicle: 0.65,
  muted: false,
};
type Preferences = typeof defaults;
const KEY = "tokocung-world-audio-v1";
const clamp = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
function read(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const result = { ...defaults };
    const oldSfx = localStorage.getItem("tokocung-explorers-sfx-volume");
    result.sfx = oldSfx === null ? 0.85 : clamp(Number(oldSfx));
    for (const key of ["master", "music", "ambience", "sfx", "npc", "vehicle"] as const)
      if (typeof stored[key] === "number") result[key] = clamp(stored[key]);
    result.muted = stored.muted === true;
    return result;
  } catch {
    return { ...defaults };
  }
}
let master: GainNode | undefined;
const buses = new Map<AudioCategory, GainNode>();
function apply() {
  const ctx = getAudioContext();
  if (!ctx || !master) return;
  const p = useAudioSettings.getState();
  master.gain.setTargetAtTime(p.muted ? 0 : p.master, ctx.currentTime, 0.04);
  for (const [category, bus] of buses) bus.gain.setTargetAtTime(p[category], ctx.currentTime, 0.08);
}
export const useAudioSettings = create<
  Preferences & {
    setVolume: (key: Exclude<keyof Preferences, "muted">, value: number) => void;
    toggleMuted: () => void;
  }
>((set) => ({
  ...read(),
  setVolume: (key, value) => {
    set({ [key]: clamp(value) });
    persist();
  },
  toggleMuted: () => {
    set((s) => ({ muted: !s.muted }));
    persist();
  },
}));
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(useAudioSettings.getState()));
  } catch {
    /* optional storage */
  }
  apply();
}
/** Every source, including legacy music and collision SFX, routes through this graph. */
export function audioBus(category: AudioCategory) {
  const ctx = ensureAudioContext();
  if (!master) {
    master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.value = 0;
  }
  let bus = buses.get(category);
  if (!bus) {
    bus = ctx.createGain();
    bus.connect(master);
    buses.set(category, bus);
    apply();
  }
  return bus;
}
export function audioAudible() {
  const s = useAudioSettings.getState();
  return getAudioContext()?.state === "running" && !document.hidden && !s.muted && s.master > 0;
}
