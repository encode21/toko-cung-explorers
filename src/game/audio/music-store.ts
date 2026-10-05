import { create } from "zustand";
import {
  getAmbientVolume,
  setAmbientVolume,
  startAmbientMusic,
  stopAmbientMusic,
} from "@/game/audio/ambient-music";
import { getSfxVolume, setSfxVolume as applySfxVolume } from "@/game/audio/sfx";

interface MusicState {
  bgmVolume: number;
  sfxVolume: number;
  ready: boolean;
  ensureStarted: () => Promise<void>;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  /** Kompatibilitas: mute BGM (volume 0 / restore 0.7). */
  muted: boolean;
  toggleMuted: () => void;
  setMuted: (muted: boolean) => void;
  shutdown: () => void;
}

function readBgm() {
  return typeof window !== "undefined" ? getAmbientVolume() : 0.7;
}

function readSfx() {
  return typeof window !== "undefined" ? getSfxVolume() : 0.85;
}

/** Preferensi audio dunia — BGM + SFX, shared HUD + gesture unlock. */
export const useMusic = create<MusicState>((set, get) => ({
  bgmVolume: readBgm(),
  sfxVolume: readSfx(),
  muted: readBgm() <= 0.001,
  ready: false,
  ensureStarted: async () => {
    await startAmbientMusic();
    const bgmVolume = getAmbientVolume();
    set({ ready: true, bgmVolume, muted: bgmVolume <= 0.001, sfxVolume: getSfxVolume() });
  },
  setBgmVolume: (volume) => {
    setAmbientVolume(volume);
    const bgmVolume = getAmbientVolume();
    set({ bgmVolume, muted: bgmVolume <= 0.001 });
    if (bgmVolume > 0.001) void get().ensureStarted();
  },
  setSfxVolume: (volume) => {
    applySfxVolume(volume);
    set({ sfxVolume: getSfxVolume() });
  },
  toggleMuted: () => {
    const next = get().bgmVolume > 0.001 ? 0 : 0.7;
    get().setBgmVolume(next);
  },
  setMuted: (muted) => {
    get().setBgmVolume(muted ? 0 : get().bgmVolume > 0.001 ? get().bgmVolume : 0.7);
  },
  shutdown: () => {
    stopAmbientMusic();
    set({ ready: false });
  },
}));
