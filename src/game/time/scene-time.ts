import { create } from "zustand";
import {
  describeTime,
  jakartaMinutes,
  parseWorldTime,
  wrapMinutes,
  type TimeMode,
  TIME_PRESETS,
} from "./model";

export const useSceneTime = create(() => ({
  ...describeTime(jakartaMinutes(Date.now())),
  mode: "REAL_TIME" as TimeMode,
}));
let demoStart = 0;
let demoMinutes = 510;
let demoDuration = 480;
let previousTick = -Infinity;
/** Called only by the scene controller. Subscribers select just the fields they need. */
export function advanceSceneTime(now: number) {
  if (now - previousTick < 100) return;
  previousTick = now;
  const { mode } = useSceneTime.getState();
  if (mode === "FIXED_TIME") return;
  const minutes =
    mode === "REAL_TIME"
      ? jakartaMinutes(Date.now())
      : wrapMinutes(demoMinutes + ((now - demoStart) / (demoDuration * 1000)) * 1440);
  useSceneTime.setState(describeTime(minutes));
}
function setWorldTime(time: string) {
  if (!import.meta.env.DEV) return;
  useSceneTime.setState({ ...describeTime(parseWorldTime(time)), mode: "FIXED_TIME" });
}
function setRealTime() {
  useSceneTime.setState({ ...describeTime(jakartaMinutes(Date.now())), mode: "REAL_TIME" });
}
function startDemo(durationSeconds = 480) {
  if (!import.meta.env.DEV) return;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 300 || durationSeconds > 600)
    throw new Error("Demo duration must be 300–600 seconds");
  demoMinutes = useSceneTime.getState().minutes;
  demoStart = performance.now();
  demoDuration = durationSeconds;
  useSceneTime.setState({ mode: "DEMO_TIME" });
}
declare global {
  interface Window {
    sceneTime?: {
      setWorldTime: typeof setWorldTime;
      setRealTime: typeof setRealTime;
      startDemo: typeof startDemo;
      getState: typeof useSceneTime.getState;
      presets: typeof TIME_PRESETS;
    };
  }
}

/** Dev console only. Production always starts in REAL_TIME and exposes no controls. */
if (import.meta.env.DEV && typeof window !== "undefined") {
  Object.assign(window, {
    sceneTime: {
      setWorldTime,
      setRealTime,
      startDemo,
      getState: useSceneTime.getState,
      presets: TIME_PRESETS,
    },
  });
  const preset = new URLSearchParams(window.location.search).get("worldTime");
  if (preset && /^([01]\d|2[0-3]):[0-5]\d$/.test(preset)) setWorldTime(preset);
}
