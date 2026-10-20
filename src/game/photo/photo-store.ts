import { create } from "zustand";
import type { PhotoMode } from "./photo-camera";

interface PhotoState {
  mode: PhotoMode;
  yaw: number;
  pitch: number;
  ready: boolean;
  busy: boolean;
  request: number;
  image: string | null;
  error: string | null;
  reset: () => void;
  setMode: (mode: PhotoMode) => void;
  aim: (x: number, y: number) => void;
  shoot: () => void;
  finish: (request: number, blob: Blob | null) => void;
  retake: () => void;
}
const revoke = (url: string | null) => {
  if (url) URL.revokeObjectURL(url);
};
export const usePhoto = create<PhotoState>((set, get) => ({
  mode: "selfie",
  yaw: 0,
  pitch: 0,
  ready: false,
  busy: false,
  request: 0,
  image: null,
  error: null,
  reset: () => {
    revoke(get().image);
    set({
      mode: "selfie",
      yaw: 0,
      pitch: 0,
      ready: false,
      busy: false,
      image: null,
      error: null,
      request: get().request + 1,
    });
  },
  setMode: (mode) => {
    if (get().busy || get().image) return;
    set({ mode, yaw: 0, pitch: 0, ready: false, error: null });
  },
  aim: (x, y) => {
    const s = get();
    if (s.busy || s.image) return;
    const limit = s.mode === "selfie" ? 1.15 : Math.PI;
    set({
      yaw: Math.max(-limit, Math.min(limit, s.yaw + x)),
      pitch: Math.max(-0.5, Math.min(0.6, s.pitch + y)),
      ready: false,
    });
  },
  shoot: () => {
    const s = get();
    if (!s.ready || s.busy || s.image) return;
    set({ busy: true, error: null, request: s.request + 1 });
  },
  finish: (request, blob) => {
    if (!get().busy || get().request !== request) return;
    set({
      busy: false,
      image: blob ? URL.createObjectURL(blob) : null,
      error: blob ? null : "Foto belum berhasil diambil. Coba lagi, ya.",
    });
  },
  retake: () => {
    revoke(get().image);
    set({ image: null, error: null, ready: false });
  },
}));
