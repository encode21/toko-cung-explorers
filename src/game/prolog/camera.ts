import { Vector3, type Camera } from "three";
import { useProlog } from "./store";
const from = new Vector3(),
  to = new Vector3();
let startedAt = 0;
export function startPrologCamera() {
  startedAt = performance.now();
}
export function stopPrologCamera() {
  startedAt = 0;
}
export function prologCameraProgress() {
  const d = useProlog.getState().data;
  return d && startedAt
    ? Math.min(1, (performance.now() - startedAt) / (d.reveal.seconds * 1000))
    : 0;
}
export function applyPrologCamera(camera: Camera) {
  const s = useProlog.getState(),
    d = s.data;
  if (!startedAt || !s.presenting || d?.step !== "reveal") return;
  const t = prologCameraProgress(),
    ease = t * t * (3 - 2 * t);
  camera.position.lerpVectors(from.fromArray(d.reveal.from), to.fromArray(d.reveal.to), ease);
  camera.lookAt(...d.reveal.lookAt);
}
