import { Vector3, type Camera } from "three";

export type ActionPosition = readonly [number, number, number];
type Anchor = { element: HTMLElement; position: () => ActionPosition | null };
const anchors = new Set<Anchor>();
const projected = new Vector3();

export function registerActionAnchor(element: HTMLElement, position: Anchor["position"]) {
  const anchor = { element, position };
  anchors.add(anchor);
  return () => {
    element.style.visibility = "hidden";
    anchors.delete(anchor);
  };
}

/** Update DOM transforms without React/store updates on every camera frame. */
export function projectActionAnchors(camera: Camera, width: number, height: number) {
  camera.updateMatrixWorld();
  for (const { element, position } of anchors) {
    const point = position();
    if (!point || !point.every(Number.isFinite) || width <= 0 || height <= 0) {
      element.style.visibility = "hidden";
      continue;
    }
    projected.set(...point).project(camera);
    const x = ((projected.x + 1) * width) / 2;
    const y = ((1 - projected.y) * height) / 2;
    // Hide behind-camera and off-screen targets instead of pinning them to a screen edge.
    const visible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      x >= 30 &&
      x <= width - 30 &&
      y >= 70 &&
      y <= height - 16;
    element.style.visibility = visible ? "visible" : "hidden";
    if (visible) element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}

export function hideActionAnchors() {
  for (const { element } of anchors) element.style.visibility = "hidden";
}
