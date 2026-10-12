import { create } from "zustand";
import type { ProviderStatus } from "./music-provider";

type HostListener = (el: HTMLElement | null) => void;

let host: HTMLElement | null = null;
const listeners = new Set<HostListener>();

/** DOM mount for the official YouTube IFrame — lives on the 3D MUSIC_SCREEN. */
export function setClubYoutubeHost(el: HTMLElement | null) {
  host = el;
  listeners.forEach((l) => l(el));
}

export function getClubYoutubeHost() {
  return host;
}

export function onClubYoutubeHost(listener: HostListener) {
  listeners.add(listener);
  listener(host);
  return () => {
    listeners.delete(listener);
  };
}

interface ClubYoutubeUi {
  status: ProviderStatus;
  errorCode: number | null;
  resume: (() => void) | null;
  setStatus: (status: ProviderStatus, errorCode?: number | null) => void;
  setResume: (resume: (() => void) | null) => void;
}

export const useClubYoutubeUi = create<ClubYoutubeUi>((set) => ({
  status: "ready",
  errorCode: null,
  resume: null,
  setStatus: (status, errorCode = null) => set({ status, errorCode }),
  setResume: (resume) => set({ resume }),
}));
