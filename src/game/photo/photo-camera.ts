export type PhotoMode = "selfie" | "rear";
type Point = { x: number; y: number; z: number };
type Rect = { left: number; top: number; width: number; height: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Writes into reusable vectors; the rigid-body position stays canonical. */
export function photoCameraPose(
  player: Point,
  heading: number,
  mode: PhotoMode,
  yaw: number,
  pitch: number,
  position: Point,
  target: Point,
) {
  const angle = heading + yaw;
  const elevation = clamp(pitch, -0.5, 0.6);
  const feet = player.y - 0.83;
  if (mode === "selfie") {
    target.x = player.x;
    target.y = feet + 1.25;
    target.z = player.z;
    position.x = target.x + Math.sin(angle) * Math.cos(elevation) * 2.35;
    position.y = target.y + 0.12 + Math.sin(elevation) * 2.35;
    position.z = target.z + Math.cos(angle) * Math.cos(elevation) * 2.35;
  } else {
    position.x = player.x;
    position.y = feet + 1.55;
    position.z = player.z;
    target.x = position.x + Math.sin(angle) * Math.cos(elevation);
    target.y = position.y + Math.sin(elevation);
    target.z = position.z + Math.cos(angle) * Math.cos(elevation);
  }
}

/** CSS viewfinder to drawing-buffer pixels, including DPR and scaled HUD roots. */
export function photoCrop(canvas: Rect, frame: Rect, width: number, height: number) {
  if (canvas.width <= 0 || canvas.height <= 0 || width <= 0 || height <= 0) return null;
  const x = clamp((frame.left - canvas.left) / canvas.width, 0, 1) * width;
  const y = clamp((frame.top - canvas.top) / canvas.height, 0, 1) * height;
  const right = clamp((frame.left + frame.width - canvas.left) / canvas.width, 0, 1) * width;
  const bottom = clamp((frame.top + frame.height - canvas.top) / canvas.height, 0, 1) * height;
  const w = right - x;
  const h = bottom - y;
  if (w < 1 || h < 1) return null;
  const scale = Math.min(1, 1920 / Math.max(w, h));
  return {
    x,
    y,
    width: w,
    height: h,
    outputWidth: Math.round(w * scale),
    outputHeight: Math.round(h * scale),
  };
}
