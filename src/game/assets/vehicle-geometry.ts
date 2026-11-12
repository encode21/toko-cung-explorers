import { BufferGeometry, Float32BufferAttribute, ExtrudeGeometry, Shape } from "three";

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

// The MPV flank is a continuous pressed panel, with real wheel-arch cutouts.
// Profile coordinates are normalized for a4.4m body and1m lower-body height.
const mpvSide: [number, number][] = [
  [-0.5, 0.04],
  [-0.49, 0.35],
  [-0.42, 0.5],
  [0.28, 0.5],
  [0.44, 0.31],
  [0.5, 0.13],
  [0.5, -0.4],
];
for (const center of [1.4, -1.4]) {
  mpvSide.push([(center + 0.48) / 4.4, -0.4]);
  for (let i = 0; i <= 12; i++) {
    const angle = (i * Math.PI) / 12;
    mpvSide.push([(center + Math.cos(angle) * 0.48) / 4.4, -0.35 + Math.sin(angle) * 0.48]);
  }
  mpvSide.push([(center - 0.48) / 4.4, -0.4]);
}
mpvSide.push([-0.5, -0.4]);
export const mpvPanelGeometry = profile(mpvSide, 0);
/** Closed loft with curved shoulders; longitudinal sections taper the whole silhouette. */
function loft(rings: { z: number; half: number; top: number; bottom: number }[]) {
  const positions: number[] = [],
    indices: number[] = [];
  for (const r of rings) {
    const h = r.top - r.bottom;
    const cross = [
      [-r.half, r.bottom + h * 0.12],
      [-r.half, r.top - h * 0.24],
      [-r.half * 0.86, r.top - h * 0.06],
      [0, r.top],
      [r.half * 0.86, r.top - h * 0.06],
      [r.half, r.top - h * 0.24],
      [r.half, r.bottom + h * 0.12],
      [r.half * 0.88, r.bottom],
      [-r.half * 0.88, r.bottom],
    ];
    for (const [x, y] of cross) positions.push(x!, y!, r.z);
  }
  const n = 9;
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < n; i++) {
      const a = r * n + i,
        b = r * n + ((i + 1) % n),
        c = (r + 1) * n + ((i + 1) % n),
        d = (r + 1) * n + i;
      indices.push(a, d, b, b, d, c);
    }
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i, i + 1);
    const end = (rings.length - 1) * n;
    indices.push(end, end + i + 1, end + i);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export const mpvHoodGeometry = loft([
  { z: -0.5, half: 0.47, top: 0.5, bottom: -0.5 },
  { z: -0.32, half: 0.5, top: 0.43, bottom: -0.5 },
  { z: 0.25, half: 0.48, top: 0.04, bottom: -0.5 },
  { z: 0.5, half: 0.42, top: -0.13, bottom: -0.46 },
]);
export const mpvRoofGeometry = loft([
  { z: -0.5, half: 0.43, top: 0.12, bottom: -0.36 },
  { z: -0.35, half: 0.49, top: 0.43, bottom: -0.25 },
  { z: 0, half: 0.5, top: 0.5, bottom: -0.22 },
  { z: 0.34, half: 0.47, top: 0.36, bottom: -0.31 },
  { z: 0.5, half: 0.42, top: -0.08, bottom: -0.46 },
]);
export const mpvFrontWindowGeometry = profile(
  [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.02, 0.5],
    [-0.45, 0.5],
  ],
  0,
);
export const truckCabGeometry = profile(
  [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, -0.1],
    [0.47, 0.3],
    [0.35, 0.5],
    [-0.44, 0.5],
    [-0.5, 0.36],
  ],
  0.035,
);
