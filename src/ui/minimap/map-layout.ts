export type MapView = { width: number; height: number; range: number; x: number; z: number };
export function projectMapPoint(x: number, z: number, view: MapView) {
  const scale = Math.min(view.width, view.height) / view.range;
  return { x: (x - view.x) * scale + view.width / 2, y: (z - view.z) * scale + view.height / 2 };
}
