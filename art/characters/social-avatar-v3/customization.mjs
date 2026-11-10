import * as T from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { buildHair } from "./hair.mjs";

function select(geometry, accept) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const attributes = {};
  for (const key of ["position", "normal", "uv"]) attributes[key] = [];
  for (let i = 0; i < g.attributes.position.count; i += 3) {
    if (![i, i + 1, i + 2].every((v) => accept(g.attributes.position, v))) continue;
    for (const key of Object.keys(attributes)) {
      const a = g.attributes[key];
      for (let v = i; v < i + 3; v++)
        for (let k = 0; k < a.itemSize; k++) attributes[key].push(a.getComponent(v, k));
    }
  }
  const result = new T.BufferGeometry();
  for (const key of Object.keys(attributes))
    result.setAttribute(key, new T.Float32BufferAttribute(attributes[key], key === "uv" ? 2 : 3));
  if (g !== geometry) g.dispose();
  return mergeVertices(result);
}

export function customizeHead(root, materials) {
  const head = root.getObjectByName("Head");
  const headphoneShell = root.getObjectByName("headphones_shoes");
  if (headphoneShell) {
    const geometry = headphoneShell.geometry.clone(),
      p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setY(i, p.getY(i) + 0.07 * T.MathUtils.smoothstep(p.getY(i), 0.18, 0.46));
    geometry.computeVertexNormals();
    headphoneShell.geometry = geometry;
  }
  const hair = materials.get("hair"),
    skin = materials.get("skin");
  const add = (parent, name, geometry, material) => {
    const m = new T.Mesh(geometry, material);
    m.name = name;
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const ellipsoid = (position, size) =>
    new T.SphereGeometry(1, 24, 16).scale(...size).translate(...position);
  const curve = (points, radius = 0.006) =>
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      24,
      radius,
      8,
      false,
    );
  for (const name of ["scalp", "fringe", "Head_hair"])
    root.getObjectByName(name)?.removeFromParent();
  // The source ear is a separate sphere surface; shrink it without touching the face.
  const face = head.getObjectByName("Head_skin"),
    g = face.geometry.clone(),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const d =
      ((Math.abs(x) - 0.3402) / 0.063) ** 2 +
      ((y - 0.0106) / 0.0938) ** 2 +
      ((z + 0.0098) / 0.0532) ** 2;
    if (Math.abs(d - 1) < 0.03)
      p.setXYZ(
        i,
        Math.sign(x) * (0.337 + (Math.abs(x) - 0.3402) * 0.65),
        0.01 + (y - 0.0106) * 0.65,
        -0.012 + (z + 0.0098) * 0.6,
      );
  }
  g.computeVertexNormals();
  face.geometry = g;
  const inset = head.getObjectByName("Head_V3_Ear_inset");
  inset.geometry = select(inset.geometry, (p, i) => Math.abs(p.getX(i)) < 0.3);
  // A small fold uses the skin palette, avoiding the previous detached dark oval.
  for (const side of [-1, 1])
    add(
      head,
      `EarFold_${side}`,
      ellipsoid([side * 0.359, 0.009, 0.015], [0.012, 0.025, 0.009]),
      skin,
    );

  buildHair(head, g, hair, materials.get("trim"));

  // Small, shallow cartoon eyes follow the supplied social-game reference.
  for (const name of [
    "Head_V3_Eye_whites",
    "Head_V3_Iris",
    "Head_eyes",
    "Head_V3_Catchlight",
    "Head_V3_Lash_and_brow",
    "Head_V3_Ear_inset",
  ])
    head.getObjectByName(name)?.removeFromParent();
  const eyeWhites = new T.Group();
  eyeWhites.name = "Head_V3_Eye_whites";
  head.add(eyeWhites);
  const surface = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide })),
    ray = new T.Raycaster();
  const faceZ = (x, y) => {
    ray.set(new T.Vector3(x, y, 1), new T.Vector3(0, 0, -1));
    return ray.intersectObject(surface, false)[0].point.z + 0.004;
  };
  for (const sign of [-1, 1]) {
    const x = sign * 0.12,
      y = 0.075,
      z = faceZ(x, y);
    const pupil = add(
      head,
      `Head_eyes_${sign}`,
      ellipsoid([x, y, z], [0.023, 0.032, 0.006]),
      materials.get("eyes"),
    );
    pupil.userData.eyeSide = sign;
    const glint = add(
      eyeWhites,
      `Head_V3_Eye_whites_${sign}`,
      ellipsoid([x - 0.006, y + 0.011, z + 0.006], [0.006, 0.007, 0.002]),
      materials.get("V3_Eye_whites"),
    );
    glint.userData.eyeSide = sign;
    add(
      head,
      `Brow_${sign}`,
      curve(
        [
          [x - 0.033, 0.14, faceZ(x - 0.033, 0.14)],
          [x, 0.15, faceZ(x, 0.15)],
          [x + 0.033, 0.14, faceZ(x + 0.033, 0.14)],
        ],
        0.005,
      ),
      hair,
    );
    const blink = add(
      head,
      `ClosedEye_${sign}`,
      curve(
        [
          [x - 0.033, y, faceZ(x - 0.033, y)],
          [x, y - 0.012, faceZ(x, y - 0.012)],
          [x + 0.033, y, faceZ(x + 0.033, y)],
        ],
        0.005,
      ),
      materials.get("eyes"),
    );
    blink.userData.closedEyeSide = sign;
  }
  surface.material.dispose();
  const smile = head.getObjectByName("Head_V3_Smile");
  smile.userData.mouthExpression = "smile";
  add(
    head,
    "Mouth_calm",
    curve(
      [
        [-0.04, -0.109, 0.264],
        [0, -0.112, 0.268],
        [0.04, -0.109, 0.264],
      ],
      0.0045,
    ),
    smile.material,
  ).userData.mouthExpression = "calm";
  const grin = new T.Group();
  grin.name = "Mouth_grin";
  grin.userData.mouthExpression = "grin";
  head.add(grin);
  const opening = new T.Shape()
    .moveTo(-0.065, -0.087)
    .quadraticCurveTo(0, -0.105, 0.065, -0.087)
    .quadraticCurveTo(0, -0.16, -0.065, -0.087);
  const teeth = new T.Shape()
    .moveTo(-0.051, -0.094)
    .quadraticCurveTo(0, -0.108, 0.051, -0.094)
    .quadraticCurveTo(0, -0.122, -0.051, -0.094);
  add(grin, "Grin_open", new T.ShapeGeometry(opening, 24).translate(0, 0, 0.269), smile.material);
  add(
    grin,
    "Grin_teeth",
    new T.ShapeGeometry(teeth, 24).translate(0, 0, 0.271),
    materials.get("V3_Eye_whites"),
  );
}

/** Morph garment surfaces around unchanged joints; gameplay sockets keep their reach. */
export function customizeBody(root) {
  root.updateMatrixWorld(true);
  const shapes = ["slim", "heavy", "muscular", "female"];
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (let parent = mesh; parent; parent = parent.parent) if (parent.name === "Head") return;
    if (/Wrist|footwear/.test(mesh.name)) return;
    const geometry = mesh.geometry.clone(),
      base = geometry.attributes.position;
    const inverse = mesh.matrixWorld.clone().invert();
    const upper = mesh.name.match(/(Left|Right)(Arm|Elbow)/)?.[1];
    const center = upper
      ? root.getObjectByName(upper + "Arm").getWorldPosition(new T.Vector3()).x
      : 0;
    geometry.morphAttributes.position = shapes.map((shape) => {
      const p = base.clone();
      p.name = shape;
      for (let i = 0; i < p.count; i++) {
        const v = new T.Vector3().fromBufferAttribute(base, i).applyMatrix4(mesh.matrixWorld);
        const chest = T.MathUtils.smoothstep(v.y, 1.1, 1.55),
          hip = 1 - T.MathUtils.smoothstep(v.y, 1, 1.3);
        let x = 1,
          z = 1;
        if (shape === "slim") {
          x = upper ? 0.82 : 0.86;
          z = 0.83;
        }
        if (shape === "heavy") {
          x = upper ? 1.28 : 1.32 - chest * 0.12;
          z = 1.4 - chest * 0.15;
        }
        if (shape === "muscular") {
          x = upper ? 1.4 : 1.02 + chest * 0.3;
          z = 1.05 + chest * 0.2;
        }
        if (shape === "female") {
          x = upper ? 0.95 : 0.88 + hip * 0.18;
          z = 0.96;
        }
        const taper = T.MathUtils.smoothstep(v.y, 0.25, 0.7);
        v.x = center + (v.x - center) * T.MathUtils.lerp(1, x, taper);
        v.z *= T.MathUtils.lerp(1, z, taper);
        v.applyMatrix4(inverse);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      return p;
    });
    mesh.geometry = geometry;
    mesh.updateMorphTargets();
  });
}
