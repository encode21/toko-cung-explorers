import {
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";

type Section = [z: number, width: number, bottom: number, top: number];
/** Crowned panels: broad shoulders, a flatter top and a tucked lower edge. */
function skin(sections: Section[], rounded = false) {
  const contour = rounded
    ? Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return [
          Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.65,
          (Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.65 + 1) / 2,
        ];
      })
    : [
        [0, 1],
        [0.7, 0.98],
        [1, 0.7],
        [0.96, 0.2],
        [0.6, 0],
        [-0.6, 0],
        [-0.96, 0.2],
        [-1, 0.7],
        [-0.7, 0.98],
      ].reverse();
  const curve = new CatmullRomCurve3(sections.map(([z, w, b, t]) => new Vector3(z, w, b)));
  const tops = new CatmullRomCurve3(sections.map(([, , , t]) => new Vector3(t, 0, 0)));
  const rows: Section[] = rounded
    ? Array.from({ length: 33 }, (_, i) => {
        const p = curve.getPoint(i / 32);
        return [p.x, p.y, p.z, tops.getPoint(i / 32).x];
      })
    : sections;
  const positions: number[] = [],
    indices: number[] = [],
    n = contour.length;
  for (const [z, w, b, t] of rows)
    for (const [x, y] of contour) positions.push(x! * w, b + y! * (t - b), z);
  for (let i = 0; i < rows.length - 1; i++)
    for (let j = 0; j < n; j++) {
      const a = i * n + j,
        b = i * n + ((j + 1) % n);
      indices.push(a, b, a + n, b, b + n, a + n);
    }
  for (const [row, reverse] of [
    [0, true],
    [rows.length - 1, false],
  ] as const) {
    const [z, , b, t] = rows[row]!,
      center = positions.length / 3;
    positions.push(0, (b + t) / 2, z);
    for (let j = 0; j < n; j++) {
      const a = row * n + j,
        b = row * n + ((j + 1) % n);
      indices.push(center, reverse ? b : a, reverse ? a : b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function upright(rows: [y: number, width: number, rear: number, front: number][], rounded = false) {
  return skin(
    rows.map(([y, w, r, f]) => [y, w, -f, -r]),
    rounded,
  ).rotateX(-Math.PI / 2);
}
/** Side silhouette extruded across the bike, bevelled only at panel edges. */
function side(points: [z: number, y: number][], width: number, bevel = 0.025, round = 0) {
  const shape = new Shape();
  const toward = ([z, y]: [number, number], [nextZ, nextY]: [number, number]) => {
    const fraction = Math.min(0.32, round / Math.hypot(nextZ - z, nextY - y));
    return [z + (nextZ - z) * fraction, y + (nextY - y) * fraction] as const;
  };
  points.forEach((point, i) => {
    if (!round) {
      if (i) shape.lineTo(...point);
      else shape.moveTo(...point);
      return;
    }
    const entry = toward(point, points[(i + points.length - 1) % points.length]!);
    const exit = toward(point, points[(i + 1) % points.length]!);
    if (i) shape.lineTo(...entry);
    else shape.moveTo(...entry);
    shape.quadraticCurveTo(...point, ...exit);
  });
  shape.closePath();
  return new ExtrudeGeometry(shape, {
    depth: width - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 16,
  })
    .translate(0, 0, -(width - 2 * bevel) / 2)
    .rotateY(-Math.PI / 2);
}
function fender() {
  const shape = new Shape();
  shape.absarc(0, 0, 0.5, 0.8, Math.PI - 0.45, false);
  shape.absarc(0, 0, 0.46, Math.PI - 0.45, 0.8, true);
  shape.closePath();
  return new ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 2,
    curveSegments: 24,
  })
    .translate(0, 0, -0.17)
    .rotateY(-Math.PI / 2);
}
function screen(rows: [y: number, z: number, width: number][], rounded = false) {
  const positions: number[] = [],
    indices: number[] = [];
  const stations = rounded
    ? new CatmullRomCurve3(rows.map(([y, z, width]) => new Vector3(y, z, width)))
        .getPoints(16)
        .map((point) => point.toArray())
    : rows;
  for (const [y, z, w] of stations)
    for (let j = 0; j <= 12; j++) {
      const x = j / 6 - 1;
      positions.push(x * w, y, z + 0.045 * (1 - x * x));
    }
  for (let i = 0; i < stations.length - 1; i++)
    for (let j = 0; j < 12; j++) {
      const a = i * 13 + j;
      indices.push(a, a + 1, a + 13, a + 1, a + 14, a + 13);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const spring = new CatmullRomCurve3(
  Array.from(
    { length: 65 },
    (_, i) =>
      new Vector3(
        Math.cos((i / 64) * Math.PI * 10) * 0.4,
        i / 64 - 0.5,
        Math.sin((i / 64) * Math.PI * 10) * 0.4,
      ),
  ),
);
export const motorcycleGeometries = {
  motoRound: new SphereGeometry(0.5, 24, 16),
  motoTire: new TorusGeometry(0.39, 0.11, 12, 40),
  motoRim: new TorusGeometry(0.46, 0.04, 8, 32),
  motoFender: fender(),
  motoSpring: new TubeGeometry(spring, 64, 0.07, 5, false),
  skupiPod: skin(
    [
      [-1.05, 0.07, 0.6, 0.7],
      [-0.91, 0.25, 0.48, 0.77],
      [-0.63, 0.29, 0.45, 0.79],
      [-0.3, 0.26, 0.46, 0.78],
      [0.03, 0.17, 0.49, 0.74],
    ],
    true,
  ),
  skupiApron: upright(
    [
      [0.38, 0.19, 0.27, 0.54],
      [0.5, 0.24, 0.37, 0.66],
      [0.78, 0.28, 0.46, 0.79],
      [1.04, 0.24, 0.44, 0.75],
      [1.19, 0.11, 0.39, 0.57],
    ],
    true,
  ),
  skupiSeat: skin(
    [
      [-1.04, 0.06, 0.77, 0.82],
      [-0.88, 0.225, 0.77, 0.855],
      [-0.63, 0.24, 0.75, 0.84],
      [-0.24, 0.22, 0.74, 0.83],
      [0.18, 0.11, 0.71, 0.81],
    ],
    true,
  ),
  skupiFloor: side(
    [
      [-0.4, 0.36],
      [0.43, 0.36],
      [0.62, 0.5],
      [0.47, 0.51],
      [0.35, 0.42],
      [-0.35, 0.42],
    ],
    0.54,
    0.018,
  ),
  pzxPod: skin([
    [-1.17, 0.025, 0.81, 0.87],
    [-0.95, 0.23, 0.64, 0.91],
    [-0.6, 0.28, 0.51, 0.89],
    [-0.2, 0.24, 0.38, 0.81],
    [0.2, 0.14, 0.36, 0.65],
  ]),
  pzxNose: upright([
    [0.39, 0.17, 0.17, 0.58],
    [0.62, 0.23, 0.3, 0.8],
    [0.89, 0.33, 0.36, 0.99],
    [1.02, 0.34, 0.39, 1.03],
    [1.24, 0.25, 0.35, 0.7],
    [1.32, 0.15, 0.34, 0.55],
  ]),
  pzxSeat: skin(
    [
      [-1.07, 0.06, 0.89, 0.94],
      [-0.89, 0.22, 0.87, 0.95],
      [-0.62, 0.245, 0.86, 0.93],
      [-0.38, 0.23, 0.8, 0.89],
      [0.02, 0.18, 0.79, 0.87],
      [0.19, 0.08, 0.76, 0.83],
    ],
    true,
  ),
  pzxSill: side(
    [
      [-0.65, 0.35],
      [0.6, 0.35],
      [0.76, 0.57],
      [0.52, 0.57],
      [0.32, 0.46],
      [-0.35, 0.47],
    ],
    0.57,
    0.02,
  ),
  pzxSide: side(
    [
      [-1.13, 0.81],
      [-0.78, 0.67],
      [-0.15, 0.39],
      [0.35, 0.43],
      [0.45, 0.56],
      [-0.15, 0.68],
      [-0.57, 0.85],
    ],
    0.04,
    0.009,
  ),
  pzxScreen: screen([
    [1.15, 0.75, 0.16],
    [1.28, 0.6, 0.245],
    [1.51, 0.38, 0.21],
    [1.55, 0.36, 0.13],
  ]),
  eclipseApron: upright(
    [
      [0.36, 0.15, 0.18, 0.47],
      [0.45, 0.23, 0.135, 0.59],
      [0.62, 0.26, 0.22, 0.73],
      [0.8, 0.3, 0.25, 0.875],
      [0.98, 0.292, 0.39, 0.93],
      [1.09, 0.2, 0.49, 0.815],
    ],
    true,
  ),
  eclipseNose: skin(
    [
      [0.25, 0.146, 1.01, 1.19],
      [0.41, 0.23, 0.96, 1.264],
      [0.63, 0.315, 0.924, 1.229],
      [0.81, 0.291, 0.917, 1.139],
      [0.972, 0.205, 0.921, 1.066],
      [1.041, 0.108, 0.952, 1.023],
    ],
    true,
  ),
  eclipseTail: skin(
    [
      [-1.17, 0.054, 0.927, 0.974],
      [-1.03, 0.156, 0.858, 0.979],
      [-0.82, 0.227, 0.74, 0.948],
      [-0.57, 0.244, 0.627, 0.913],
      [-0.31, 0.226, 0.53, 0.855],
      [0.055, 0.13, 0.48, 0.811],
    ],
    true,
  ),
  eclipseSeat: skin(
    [
      [-1.07, 0.053, 0.927, 0.961],
      [-0.86, 0.17, 0.855, 0.946],
      [-0.63, 0.209, 0.855, 0.937],
      [-0.37, 0.207, 0.798, 0.886],
      [0.02, 0.16, 0.792, 0.872],
      [0.19, 0.069, 0.79, 0.834],
    ],
    true,
  ),
  eclipseDeck: side(
    [
      [-0.645, 0.432],
      [-0.38, 0.378],
      [0.055, 0.375],
      [0.29, 0.39],
      [0.52, 0.47],
      [0.405, 0.574],
      [0.185, 0.47],
      [-0.375, 0.46],
    ],
    0.49,
    0.02,
    0.075,
  ),
  eclipseInset: side(
    [
      [-0.635, 0.511],
      [-0.44, 0.47],
      [0.214, 0.457],
      [0.43, 0.575],
      [0.383, 0.668],
      [0.15, 0.574],
      [-0.19, 0.58],
      [-0.36, 0.615],
    ],
    0.049,
    0.01,
    0.075,
  ),
  eclipseScreen: screen(
    [
      [1.137, 0.77, 0.182],
      [1.25, 0.672, 0.218],
      [1.373, 0.522, 0.197],
      [1.474, 0.394, 0.151],
      [1.501, 0.373, 0.111],
    ],
    true,
  ),
  eclipseFrontFender: skin(
    [
      [0.54, 0.092, 0.522, 0.552],
      [0.685, 0.131, 0.568, 0.629],
      [0.86, 0.134, 0.638, 0.694],
      [0.995, 0.12, 0.613, 0.677],
      [1.126, 0.101, 0.546, 0.589],
      [1.202, 0.074, 0.477, 0.509],
    ],
    true,
  ),
  zxTank: skin(
    [
      [-0.19, 0.09, 0.88, 0.97],
      [0.02, 0.22, 0.89, 1.15],
      [0.25, 0.25, 0.9, 1.22],
      [0.46, 0.19, 0.99, 1.19],
      [0.62, 0.065, 1.04, 1.1],
    ],
    true,
  ),
  zxNose: skin([
    [0.38, 0.19, 1.04, 1.23],
    [0.59, 0.29, 0.91, 1.22],
    [0.81, 0.34, 0.89, 1.15],
    [1.05, 0.29, 0.94, 1.06],
    [1.16, 0.025, 1, 1.03],
  ]),
  zxTail: skin([
    [-1.19, 0.025, 0.98, 1.02],
    [-0.95, 0.18, 0.9, 1.02],
    [-0.66, 0.23, 0.78, 0.95],
    [-0.35, 0.17, 0.77, 0.88],
  ]),
  zxSeat: skin(
    [
      [-1.08, 0.035, 0.98, 1.02],
      [-0.83, 0.17, 0.93, 0.99],
      [-0.64, 0.19, 0.91, 0.97],
      [-0.34, 0.18, 0.83, 0.91],
      [-0.04, 0.16, 0.83, 0.91],
      [0.12, 0.09, 0.84, 0.9],
    ],
    true,
  ),
  zxFairing: side(
    [
      [-0.35, 0.34],
      [0.54, 0.33],
      [0.77, 0.55],
      [0.7, 0.93],
      [0.42, 1.06],
      [0.13, 0.94],
      [-0.16, 0.71],
    ],
    0.075,
    0.015,
  ),
  zxVent: side(
    [
      [-0.08, 0.67],
      [0.4, 0.7],
      [0.53, 0.88],
      [0.36, 0.93],
      [0.05, 0.82],
    ],
    0.02,
    0.004,
  ),
  zxStripe: side(
    [
      [-0.25, 0.45],
      [0.44, 0.49],
      [0.57, 0.54],
      [0.04, 0.55],
    ],
    0.018,
    0.003,
  ),
  zxScreen: screen([
    [1.11, 0.82, 0.14],
    [1.25, 0.63, 0.21],
    [1.41, 0.43, 0.18],
    [1.44, 0.41, 0.11],
  ]),
} as const;
export type MotorcycleShape = keyof typeof motorcycleGeometries;
