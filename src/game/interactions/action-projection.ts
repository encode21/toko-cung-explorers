import { Vector3, type Camera } from "three";

export type ActionPosition = readonly [number, number, number];
type Anchor = {
  element: HTMLElement;
  position: () => ActionPosition | null;
  onVisibilityChange?: ((visible: boolean) => void) | undefined;
};
const anchors = new Set<Anchor>();
const projected = new Vector3();

function setVisibility(anchor: Anchor, visible: boolean) {
  const value = visible ? "visible" : "hidden";
  if (anchor.element.style.visibility === value) return;
  anchor.element.style.visibility = value;
  anchor.onVisibilityChange?.(visible);
}

export function registerActionAnchor(
  element: HTMLElement,
  position: Anchor["position"],
  onVisibilityChange?: Anchor["onVisibilityChange"],
) {
  const anchor = { element, position, onVisibilityChange };
  anchors.add(anchor);
  return () => {
    setVisibility(anchor, false);
    anchors.delete(anchor);
  };
}

/** Update DOM transforms without React/store updates on every camera frame. */
export function projectActionAnchors(camera: Camera, width: number, height: number) {
  camera.updateMatrixWorld();
  for (const anchor of anchors) {
    const { element, position } = anchor;
    const point = position();
    if (!point || !point.every(Number.isFinite) || width <= 0 || height <= 0) {
      setVisibility(anchor, false);
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
    setVisibility(anchor, visible);
    if (visible) {
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      element.style.setProperty("--action-anchor-y", `${y}px`);
    }
  }
}

export function hideActionAnchors() {
  for (const anchor of anchors) setVisibility(anchor, false);
}
