import { Color, Vector3 } from "three";
import { artificialLightLevels, smoothRange, sunDirection } from "./model";

// Continuous cyclic keyframes, not switches at time-period boundaries.
const keys = [
  [0, "#12243f", "#26394f", "#91aac8", "#5c708e", 0, 0.48, 0.12],
  [5, "#374b6a", "#b59485", "#ffb77d", "#9a94a4", 0, 0.58, 0.16],
  [6, "#779bc0", "#efc1a0", "#ffd09b", "#e3cbb9", 0.32, 0.78, 0.23],
  [8.5, "#83b8e1", "#bedef4", "#fff0d8", "#fff6e9", 1.35, 0.95, 0.32],
  [12, "#5e9bd5", "#c2dff0", "#fffaf2", "#ffffff", 1.8, 1, 0.34],
  [16, "#83aacd", "#e7d6bd", "#ffdcaf", "#f6e2cc", 1.25, 0.85, 0.28],
  [17.5, "#8d94bb", "#f0b17b", "#ffb56f", "#f7c9a6", 0.7, 0.68, 0.24],
  [18.25, "#394d7a", "#987e99", "#d79582", "#9991ac", 0, 0.53, 0.18],
  [19, "#1c3157", "#435376", "#9bb8df", "#707d99", 0, 0.5, 0.15],
  [22, "#12243f", "#26394f", "#91aac8", "#5c708e", 0, 0.48, 0.12],
  [24, "#12243f", "#26394f", "#91aac8", "#5c708e", 0, 0.48, 0.12],
] as const;
const frames = keys.map(([hour, top, horizon, sun, cloud, intensity, hemisphere, ambient]) => ({
  hour,
  top: new Color(top),
  horizon: new Color(horizon),
  sun: new Color(sun),
  cloud: new Color(cloud),
  intensity,
  hemisphere,
  ambient,
}));
export const sceneLighting = {
  top: new Color(),
  horizon: new Color(),
  sun: new Color(),
  cloud: new Color(),
  direction: new Vector3(),
  intensity: 0,
  hemisphere: 0.8,
  ambient: 0.3,
  street: 0,
  store: 0.22,
  sunVisibility: 0,
  moonVisibility: 0,
};
/** One interpolated output shared by sky, environment and all fixtures; no React frame renders. */
export function updateSceneLighting(minutes: number) {
  const hour = minutes / 60;
  const index = Math.max(0, frames.findIndex((f) => f.hour > hour) - 1);
  const a = frames[index]!,
    b = frames[index + 1]!;
  const t = smoothRange(a.hour, b.hour, hour);
  for (const key of ["top", "horizon", "sun", "cloud"] as const)
    sceneLighting[key].copy(a[key]).lerp(b[key], t);
  for (const key of ["intensity", "hemisphere", "ambient"] as const)
    sceneLighting[key] = a[key] + (b[key] - a[key]) * t;
  sceneLighting.direction.set(...sunDirection(minutes));
  const lights = artificialLightLevels(minutes);
  sceneLighting.street = lights.street;
  sceneLighting.store = lights.store;
  sceneLighting.sunVisibility = smoothRange(-0.04, 0.06, sceneLighting.direction.y);
  sceneLighting.moonVisibility = smoothRange(0.02, 0.18, -sceneLighting.direction.y);
}
