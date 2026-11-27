import { create } from "zustand";
import { useSosmed } from "./store";

/** Frame grabs (ms after start) and total length of a "Rekam" clip: a flipbook, not real video. */
export const CLIP_GRABS = [0, 1000, 2000, 3200, 4400];
export const CLIP_MS = 5000;
export const CLIP_WIDTH = 160;

export const useClip = create<{
  recording: boolean;
  startedAt: number;
  /** Bumped per grab; ClipCapture copies the canvas right after the next render. */
  request: number;
  frames: string[];
  /** Finished clip awaiting "Upload ke Sosmed". */
  done: string[] | null;
}>(() => ({ recording: false, startedAt: 0, request: 0, frames: [], done: null }));

export const startClip = () =>
  useClip.setState({ recording: true, startedAt: Date.now(), request: 0, frames: [], done: null });
export const grabFrame = () => useClip.setState((s) => ({ request: s.request + 1 }));
export function stopClip() {
  const { recording, frames } = useClip.getState();
  if (!recording) return;
  useClip.setState({ recording: false, done: frames.length ? frames : null });
  if (frames.length) useSosmed.getState().setDraft(frames);
}
if (typeof window !== "undefined")
  window.addEventListener("world-account-cleared", () =>
    useClip.setState({ recording: false, startedAt: 0, request: 0, frames: [], done: null }),
  );
