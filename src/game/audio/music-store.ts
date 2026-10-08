import { useAudioSettings } from "./audio-manager";
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
  /** Compatibility adapter for the shared master mute. */
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
  muted: useAudioSettings.getState().muted,
  ready: false,
  ensureStarted: async () => {
    try {
      await startAmbientMusic();
      set({ ready: true, bgmVolume: getAmbientVolume(), sfxVolume: getSfxVolume() });
    } catch {
      /* Browser may require another gesture; listeners remain available. */
    }
  },
  setBgmVolume: (volume) => {
    setAmbientVolume(volume);
    const bgmVolume = getAmbientVolume();
    set({ bgmVolume });
    if (bgmVolume > 0.001) void get().ensureStarted();
  },
  setSfxVolume: (volume) => {
    applySfxVolume(volume);
    set({ sfxVolume: getSfxVolume() });
  },
  toggleMuted: () => {
    useAudioSettings.getState().toggleMuted();
    set({ muted: useAudioSettings.getState().muted });
  },
  setMuted: (muted) => {
    if (useAudioSettings.getState().muted !== muted) useAudioSettings.getState().toggleMuted();
    set({ muted });
  },
  shutdown: () => {
    stopAmbientMusic();
    set({ ready: false });
  },
}));

useAudioSettings.subscribe((s) => {
  if (useMusic.getState().muted !== s.muted) useMusic.setState({ muted: s.muted });
});
