/** Chunky social-game hair: a thin fitted cap plus tapered locks sampled on the real head surface. */
import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const CENTER = new T.Vector3(0, 0.085, -0.015),
  RAD = Math.PI / 180,
  // Polar angle of a hat brim: locks above it are dropped while a crown hat is worn.
  HAT_LINE = 66;
const { lerp, smoothstep: smooth } = T.MathUtils;
export const HAIR_STYLES = [
  "short",
  "spiky",
  "bob",
  "buns",
  "buzz",
  "sidepart",
  "ponytail",
  "hijab",
];

function finish(position, index) {
  const g = new T.BufferGeometry()
    .setAttribute("position", new T.Float32BufferAttribute(position, 3))
    .setAttribute(
      "uv",
      new T.Float32BufferAttribute(new Float32Array((position.length / 3) * 2), 2),
    )
    .setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Tapered lock with a wide flat root and a pointed (or `tip`-wide blunt) end; its flat side faces the head. */
function lock(points, width, thick = width * 0.45, root = 0.65, tip = 0) {
  const curve = new T.CatmullRomCurve3(points),
    N = 12,
    M = 8,
    position = [],
    index = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      c = curve.getPoint(t),
      tangent = curve.getTangent(t),
      out = c.clone().sub(CENTER);
    out.addScaledVector(tangent, -out.dot(tangent));
    // A radial spike has no "away from the head" side; any perpendicular works.
    if (out.lengthSq() < 1e-4)
      out.crossVectors(tangent, Math.abs(tangent.y) < 0.9 ? T.Object3D.DEFAULT_UP : CENTER);
    out.normalize();
    const side = new T.Vector3().crossVectors(tangent, out),
      f = Math.min(1, root + (1 - root) * t * 4) * lerp(tip, 1, (1 - t ** 2.5) ** 0.8);
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2;
      position.push(
        ...c
          .clone()
          .addScaledVector(side, Math.cos(a) * width * f)
          .addScaledVector(out, Math.sin(a) * thick * f)
          .toArray(),
      );
      if (i) {
        const n = i * M + j,
          m = i * M + ((j + 1) % M);
        index.push(n - M, m, m - M, n - M, n, m);
      }
    }
  }
  position.push(...curve.getPoint(1).toArray());
  for (let j = 0; j < M; j++) index.push((N + 1) * M, N * M + ((j + 1) % M), N * M + j);
  return finish(position, index);
}

/** Fitted scalp surface down to `end(az)`; a final inset row closes the hairline edge. */
function cap(at, end, lift, round) {
  const position = [],
    index = [],
    ROWS = 24,
    COLS = 64;
  for (let row = 0; row <= ROWS + 1; row++)
    for (let col = 0; col <= COLS; col++) {
      const az = (col / COLS) * 360 - 180,
        polar = (Math.min(row, ROWS) / ROWS) * end(az);
      const point = at(az, polar, row > ROWS ? -0.012 : lift(az, polar));
      if (round) {
        const v = point.sub(CENTER);
        v.setLength(Math.max(v.length(), round(az, v.clone().normalize())));
        point.add(CENTER);
      }
      position.push(...point.toArray());
      if (row && col) {
        const n = row * (COLS + 1) + col,
          p = n - COLS - 1;
        index.push(n - 1, p, p - 1, n - 1, n, p);
      }
    }
  return finish(position, index);
}

const ellipsoid = (center, size) =>
  new T.SphereGeometry(1, 24, 16).scale(...size).translate(center.x, center.y, center.z);

/** Geometry for one style. `hat` builds the reduced lock set that fits under a crown hat. */
function style(id, at, hat) {
  const locks = [],
    always = [],
    accent = [];
  const edge = (front, side, back) => (az) => {
    const a = Math.abs(az);
    return a < 90 ? lerp(front, side, smooth(a, 0, 90)) : lerp(side, back, smooth(a, 90, 180));
  };
  // Surface-hugging lock from (az0, p0) to (az1, p1). az 0 is the face, polar 0 the crown.
  const strand = (az0, az1, p0, p1, width, lift = 0.03, bend = 1.5) => {
    const points = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8,
        polar = lerp(p0, p1, t);
      if (hat && polar < HAT_LINE) continue;
      points.push(
        at(
          lerp(az0, az1, t ** bend),
          polar,
          (hat ? 0.5 : 1) * lift * (0.35 + 0.65 * Math.sin(Math.PI * t)),
        ),
      );
    }
    if (points.length > 2) locks.push(lock(points, width));
  };
  const bangs = (tips, polar, width, root = 0.5, shift = 0) =>
    tips.forEach((az, i) => strand(az * root + shift, az, 16, polar + (i % 2 ? -3 : 2), width));
  const sideburns = (polar = 102) => {
    for (const s of [-1, 1]) strand(s * 72, s * 67, 40, polar, 0.055, 0.025, 1);
  };
  const nape = (polar, from = 30) =>
    [108, 132, 156, 180, 204, 228, 252].forEach((az, i) =>
      strand(az, az + (180 - az) * 0.08, from, polar + (i % 2 ? -6 : 0), 0.085),
    );
  let end = edge(60, 86, 112),
    lift = () => 0.02,
    round;

  if (id === "short") {
    bangs([-52, -30, -9, 13, 35, 54], 71, 0.075, 0.5, -8);
    sideburns();
    nape(114);
    // Crown whorl: two long locks swirling over the top give the cut its height.
    strand(-10, -120, 10, 50, 0.085, 0.06);
    strand(20, 140, 8, 54, 0.085, 0.06);
  }
  if (id === "spiky") {
    end = edge(60, 84, 108);
    bangs([-40, -14, 12, 38], 68, 0.07);
    sideburns(98);
    nape(108, 50);
    // Flat flame-like spikes leaning toward the crown; fewer and longer reads cleaner than a ball of cones.
    const spike = (az, polar, lean, length) =>
      locks.push(
        lock(
          [
            at(az, polar, 0),
            at(az + 5, polar + lean * 0.4, length * 0.5),
            at(az + 14, polar + lean, length),
          ],
          0.1,
          0.06,
          0.95,
        ),
      );
    if (!hat) {
      spike(0, 6, 0, 0.19);
      for (let az = 36; az < 360; az += 72) spike(az, 28, -10, 0.2);
      for (let az = 0; az < 360; az += 45) spike(az, 52, -14, 0.2);
      for (const az of [135, 180, 225]) spike(az, 78, 6, 0.15);
    }
  }
  if (id === "bob") {
    end = edge(60, 90, 112);
    bangs([-48, -32, -16, 0, 16, 32, 48], 72, 0.065, 0.7);
    // Curtain of hanging locks from temple to temple, curling in under the chin line.
    for (let az = 62; az <= 298.5; az += 21.5) {
      const q = at(az, 96, 0.05);
      locks.push(
        lock(
          [
            ...(hat ? [at(az, 68, 0.03)] : [at(az, 40, 0.02), at(az, 72, 0.045)]),
            q,
            new T.Vector3(q.x * 1.03, -0.07, q.z * 1.03),
            new T.Vector3(q.x * 0.9, -0.2, q.z * 0.92),
          ],
          0.09,
          0.05,
          0.65,
          0.55,
        ),
      );
    }
  }
  if (id === "buns") {
    end = edge(60, 86, 110);
    for (const s of [-1, 1]) {
      // Centre part with face-framing strands.
      strand(s * 4, s * 22, 18, 70, 0.075);
      strand(s * 6, s * 46, 18, 78, 0.075);
      strand(s * 8, s * 64, 20, 100, 0.06);
      strand(s * 104, s * 100, 35, 98, 0.07);
      if (!hat) locks.push(ellipsoid(at(s * 120, 42, 0.085), [0.13, 0.12, 0.13]));
    }
    nape(110);
  }
  if (id === "buzz") {
    end = edge(62, 84, 106);
    lift = (az, polar) => 0.01 + 0.014 * (1 - smooth(polar, 35, 75));
  }
  if (id === "sidepart") {
    // Parted at az -40: long locks sweep across the forehead with lift at the root.
    strand(-36, 58, 44, 73, 0.085, 0.06, 1.2);
    strand(-38, 74, 32, 84, 0.085, 0.055, 1.2);
    strand(-40, 100, 20, 88, 0.085, 0.045, 1.1);
    strand(-40, 150, 14, 100, 0.085, 0.04, 1.1);
    strand(-44, -58, 30, 76, 0.07);
    strand(-48, -70, 36, 100, 0.055);
    strand(-50, -102, 30, 96, 0.07);
    strand(70, 66, 60, 102, 0.055, 0.025, 1);
    nape(114);
  }
  if (id === "ponytail") {
    end = edge(60, 86, 106);
    bangs([-50, -28, -6, 16, 36], 72, 0.075, 0.5, -12);
    for (const s of [-1, 1]) strand(s * 60, s * 66, 30, 108, 0.055, 0.03, 1);
    nape(106);
    // Tied below the brim so the tail also works with hats.
    const tie = at(180, 68, 0.05);
    const tail = (x, length, width) =>
      always.push(
        lock(
          [
            [0, 0, 0],
            [x * 0.5, 0.04, -0.09],
            [x, -0.1 * length, -0.17],
            [x * 1.2, -0.27 * length, -0.15],
            [x, -0.4 * length, -0.08],
          ].map((p) => new T.Vector3(...p).add(tie)),
          width,
          width * 0.75,
          0.5,
        ),
      );
    tail(0, 1, 0.11);
    tail(-0.06, 0.8, 0.075);
    tail(0.06, 0.85, 0.075);
    accent.push(
      new T.TorusGeometry(0.05, 0.026, 8, 16).translate(tie.x, tie.y + 0.012, tie.z - 0.035),
    );
  }
  if (id === "hijab") {
    end = (az) => lerp(64, 124, smooth(Math.abs(az), 32, 62));
    lift = () => 0.035;
    // Away from the face the cloth rounds out over the ears instead of tracing them.
    round = (az, d) =>
      smooth(Math.abs(az), 40, 80) / Math.hypot(d.x / 0.41, d.y / 0.44, d.z / 0.33);
    const rim = [];
    for (let az = -62; az <= 62; az += 4) rim.push(at(az, end(az), 0.03));
    always.push(
      new T.TubeGeometry(new T.CatmullRomCurve3(rim), 48, 0.024, 8, false),
      ellipsoid(new T.Vector3(0, -0.27, -0.02), [0.37, 0.14, 0.29]),
    );
  }
  return { cap: hat ? null : cap(at, end, lift, round), locks, always, accent };
}

/** Adds every hair style under `head`; explorer-look.ts toggles them by userData. */
export function buildHair(head, face, hair, trim) {
  const shell = new T.Mesh(face, new T.MeshBasicMaterial({ side: T.DoubleSide })),
    ray = new T.Raycaster();
  const at = (az, polar, lift = 0) => {
    const d = new T.Vector3(
      Math.sin(polar * RAD) * Math.sin(az * RAD),
      Math.cos(polar * RAD),
      Math.sin(polar * RAD) * Math.cos(az * RAD),
    );
    ray.set(CENTER.clone().addScaledVector(d, 2), d.clone().negate());
    const hit = ray.intersectObject(shell, false)[0];
    if (!hit) throw new Error(`Missing scalp surface at ${az}, ${polar}`);
    return hit.point.addScaledVector(d, lift);
  };
  const merge = (list) => mergeVertices(mergeGeometries(list.map((g) => g.toNonIndexed())));
  for (const id of HAIR_STYLES) {
    const group = new T.Group();
    group.name = `HairStyle_${id}`;
    group.userData.hairStyle = id;
    head.add(group);
    const add = (name, list, material, flag) => {
      if (!list.length) return;
      const m = new T.Mesh(merge(list), material);
      m.name = `${name}_${id}`;
      m.castShadow = true;
      if (flag) m.userData[flag] = true;
      group.add(m);
    };
    const full = style(id, at, false),
      hat = style(id, at, true);
    add("HairCrown", [full.cap, ...full.always], hair);
    add("HairAccent", full.accent, trim);
    add("HairLocks", full.locks, hair, "hairCrown");
    add("HairHat", hat.locks, hair, "hairUnderHat");
  }
  shell.material.dispose();
}
