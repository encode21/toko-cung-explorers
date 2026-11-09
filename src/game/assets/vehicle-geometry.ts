import { ExtrudeGeometry, Shape } from "three";

// Extruded side profiles give the nose and windows a real silhouette, not a box stack.
function profile(points: [number, number][], bevel: number) {
  const shape = new Shape();
  points.forEach(([z, y], i) => (i ? shape.lineTo(-z, y) : shape.moveTo(-z, y)));
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 1 - bevel * 2,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, -0.5 + bevel);
  geometry.rotateY(Math.PI / 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  geometry.scale(1, 1, 1 / (bounds.max.z - bounds.min.z));
  geometry.computeVertexNormals();
  return geometry;
}
export const hoodGeometry = profile(
  [
    [-0.5, -0.4],
    [0.5, -0.4],
    [0.5, -0.02],
    [0.38, 0.22],
    [-0.4, 0.4],
    [-0.5, 0.3],
  ],
  0.065,
);
export const sideWindowGeometry = profile(
  [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.28, 0.5],
    [-0.35, 0.5],
  ],
  0,
);
