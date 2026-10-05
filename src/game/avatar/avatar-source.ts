/** Original Toko Cung mesh source. Also the deterministic offline GLB authoring source.
 * No Box/Sphere primitives: closed, beveled cross-section surfaces with skin weights.
 * Coordinates are metres, +Z forward, origin between the soles. */
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const AVATAR_ANIMATIONS = [
  "Idle",
  "Walk",
  "Run",
  "Talk",
  "Wave",
  "Sit",
  "Jump",
  "CarryBox",
  "UsePhone",
  "PickItem",
  "Checkout",
  "Hit",
  "Fall",
  "GetUp",
] as const;
export type AvatarAnimation = (typeof AVATAR_ANIMATIONS)[number];
type V = [number, number, number];
type Section = [number, number, number, number?, number?]; // y, width, depth, x offset, z offset

/** Sixteen-point rounded rectangle; rings define taper, cheek, jaw and bevel. */
function surface(rings: Section[], bone: number, center: V = [0, 0, 0]) {
  const positions: number[] = [],
    indices: number[] = [],
    skin: number[] = [],
    weights: number[] = [];
  for (const [y, w, d, ox = 0, oz = 0] of rings) {
    const r = Math.min(w, d) * 0.2;
    for (let corner = 0; corner < 4; corner++) {
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (w / 2 - r);
      const cz = (corner < 2 ? 1 : -1) * (d / 2 - r);
      for (let k = 0; k < 4; k++) {
        const a = (corner * Math.PI) / 2 + (k * Math.PI) / 6;
        positions.push(
          center[0] + ox + cx + Math.cos(a) * r,
          center[1] + y,
          center[2] + oz + cz + Math.sin(a) * r,
        );
        skin.push(bone, 0, 0, 0);
        weights.push(1, 0, 0, 0);
      }
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++)
    for (let k = 0; k < 16; k++) {
      const a = ring * 16 + k,
        b = ring * 16 + ((k + 1) % 16);
      indices.push(a, a + 16, b, b, a + 16, b + 16);
    }
  for (let k = 1; k < 15; k++) {
    indices.push(0, k, k + 1);
    const top = (rings.length - 1) * 16;
    indices.push(top, top + k + 1, top + k);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("skinIndex", new T.Uint16BufferAttribute(skin, 4));
  g.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function createAvatarSource() {
  const scene = new T.Group();
  scene.name = "BaseAvatarV2";
  const bones: T.Bone[] = [],
    map: Record<string, number> = {},
    origins: Record<string, V> = {};
  function joint(name: string, parent: string | null, p: V) {
    const b = new T.Bone();
    b.name = name;
    const pp = parent ? origins[parent]! : [0, 0, 0];
    b.position.set(p[0] - pp[0]!, p[1] - pp[1]!, p[2] - pp[2]!);
    if (parent) bones[map[parent]!]!.add(b);
    else scene.add(b);
    map[name] = bones.length;
    origins[name] = p;
    bones.push(b);
  }
  joint("Root", null, [0, 0, 0]);
  joint("Hips", "Root", [0, 0.72, 0]);
  joint("Spine", "Hips", [0, 0.89, 0]);
  joint("Chest", "Spine", [0, 1.1, 0]);
  joint("Neck", "Chest", [0, 1.245, 0]);
  joint("Head", "Neck", [0, 1.31, 0]);
  for (const [side, sign] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    joint(`${side}Shoulder`, "Chest", [sign * 0.205, 1.18, 0]);
    joint(`${side}UpperArm`, `${side}Shoulder`, [sign * 0.265, 1.18, 0]);
    joint(`${side}LowerArm`, `${side}UpperArm`, [sign * 0.287, 0.945, 0]);
    joint(`${side}Hand`, `${side}LowerArm`, [sign * 0.302, 0.755, 0]);
    joint(`${side}UpperLeg`, "Hips", [sign * 0.105, 0.73, 0]);
    joint(`${side}LowerLeg`, `${side}UpperLeg`, [sign * 0.105, 0.405, 0]);
    joint(`${side}Foot`, `${side}LowerLeg`, [sign * 0.105, 0.105, 0]);
  }
  scene.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(bones);
  const mats: Record<string, T.MeshStandardMaterial> = {};
  for (const [name, color, roughness] of [
    ["Skin", "#d9a47a", 0.88],
    ["Top", "#446f85", 0.85],
    ["Bottom", "#334454", 0.9],
    ["Shoes", "#303c49", 0.8],
    ["Sole", "#dedbd0", 0.9],
    ["Hair", "#302522", 0.7],
    ["Ink", "#302a29", 0.8],
    ["Mouth", "#98584c", 0.85],
    ["White", "#fff6e7", 0.85],
    ["Accent", "#b94840", 0.85],
  ] as const) {
    mats[name] = new T.MeshStandardMaterial({ name, color, roughness, metalness: 0 });
  }
  const geometryBuckets: Record<string, T.BufferGeometry[]> = {};
  const meshMats: Record<string, string> = {};
  function add(name: string, mat: string, bone: string, rings: Section[], center?: V) {
    (geometryBuckets[name] ??= []).push(surface(rings, map[bone]!, center));
    meshMats[name] = mat;
  }
  function piece(name: string, mat: string, bone: string, p: V, size: V, bevel = 0.012) {
    const [w, h, d] = size,
      b = Math.min(bevel, h * 0.25);
    add(
      name,
      mat,
      bone,
      [
        [-h / 2, w * 0.82, d * 0.82],
        [-h / 2 + b, w, d],
        [h / 2 - b, w, d],
        [h / 2, w * 0.82, d * 0.82],
      ],
      p,
    );
  }
  add("BodyTop", "Top", "Chest", [
    [0.745, 0.34, 0.215],
    [0.78, 0.365, 0.235],
    [1.1, 0.44, 0.25],
    [1.19, 0.405, 0.235],
    [1.235, 0.3, 0.2],
  ]);
  // Torso deforms through a shared spine, rather than bobbing detached parts.
  const torso = geometryBuckets["BodyTop"]![0]!;
  const si = torso.getAttribute("skinIndex"),
    sw = torso.getAttribute("skinWeight"),
    pos = torso.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const mix = T.MathUtils.clamp((pos.getY(i) - 0.84) / 0.26, 0, 1);
    si.setXYZW(i, map["Spine"]!, map["Chest"]!, 0, 0);
    sw.setXYZW(i, 1 - mix, mix, 0, 0);
  }
  piece("BodyBottom", "Bottom", "Hips", [0, 0.746, 0], [0.355, 0.14, 0.224]);
  piece("BodySkin", "Skin", "Neck", [0, 1.255, 0], [0.12, 0.135, 0.12]);
  add("BodySkin", "Skin", "Head", [
    [1.29, 0.25, 0.23],
    [1.315, 0.32, 0.29],
    [1.39, 0.365, 0.315],
    [1.57, 0.365, 0.315],
    [1.655, 0.335, 0.295],
    [1.69, 0.265, 0.24],
  ]);
  piece("BodySkin", "Skin", "Head", [0, 1.449, 0.166], [0.048, 0.051, 0.036], 0.01);
  for (const [side, sign] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    piece("BodySkin", "Skin", "Head", [sign * 0.183, 1.461, 0], [0.045, 0.082, 0.067]);
    add(
      "BodyTop",
      "Top",
      `${side}UpperArm`,
      [
        [0.986, 0.145, 0.16],
        [1.015, 0.15, 0.175],
        [1.17, 0.16, 0.185],
        [1.21, 0.115, 0.145],
      ],
      [sign * 0.269, 0, 0],
    );
    add(
      "BodySkin",
      "Skin",
      `${side}UpperArm`,
      [
        [0.936, 0.113, 0.13],
        [1.04, 0.128, 0.145],
      ],
      [sign * 0.28, 0, 0],
    );
    add(
      "BodySkin",
      "Skin",
      `${side}LowerArm`,
      [
        [0.75, 0.096, 0.115],
        [0.78, 0.105, 0.123],
        [0.95, 0.115, 0.13],
        [0.967, 0.1, 0.115],
      ],
      [sign * 0.294, 0, 0],
    );
    piece(
      "BodySkin",
      "Skin",
      `${side}Hand`,
      [sign * 0.302, 0.715, 0.007],
      [0.114, 0.115, 0.132],
      0.018,
    );
    add(
      "BodyBottom",
      "Bottom",
      `${side}UpperLeg`,
      [
        [0.394, 0.153, 0.178],
        [0.43, 0.16, 0.187],
        [0.72, 0.172, 0.206],
        [0.775, 0.16, 0.19],
      ],
      [sign * 0.105, 0, 0],
    );
    add(
      "BodyBottom",
      "Bottom",
      `${side}LowerLeg`,
      [
        [0.115, 0.137, 0.157],
        [0.14, 0.144, 0.168],
        [0.4, 0.153, 0.178],
        [0.424, 0.142, 0.17],
      ],
      [sign * 0.105, 0, 0],
    );
    piece(
      "BodyShoes",
      "Shoes",
      `${side}Foot`,
      [sign * 0.105, 0.089, 0.038],
      [0.179, 0.125, 0.285],
      0.025,
    );
    piece(
      "BodySoles",
      "Sole",
      `${side}Foot`,
      [sign * 0.105, 0.023, 0.038],
      [0.183, 0.046, 0.29],
      0.01,
    );
    // Flat facial marks, never eyeballs. Individual nodes permit blink / wink.
    piece(`Eye${side}`, "Ink", "Head", [sign * 0.077, 1.492, 0.159], [0.027, 0.039, 0.004], 0.005);
    piece(`Blink${side}`, "Ink", "Head", [sign * 0.077, 1.486, 0.16], [0.032, 0.007, 0.004], 0.002);
    piece("Brows", "Hair", "Head", [sign * 0.076, 1.55, 0.16], [0.052, 0.009, 0.004], 0.002);
  }
  // Smile is a shallow ribbon hugging the frontal plane.
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.01;
    piece(
      "Smile",
      "Mouth",
      "Head",
      [x, 1.389 + Math.pow(x / 0.03, 2) * 0.014, 0.158],
      [0.012, 0.008, 0.004],
      0.002,
    );
  }
  piece("TalkMouth", "Mouth", "Head", [0, 1.397, 0.161], [0.045, 0.028, 0.004], 0.004);
  piece("Teeth", "White", "Head", [0, 1.403, 0.165], [0.034, 0.009, 0.003], 0.002);
  for (const style of [
    "short",
    "spiky",
    "bob",
    "buns",
    "cap",
    "buzz",
    "sidepart",
    "ponytail",
    "hijab",
  ]) {
    const name = `Hair_${style}`;
    add(name, "Hair", "Head", [
      [1.598, 0.378, 0.332],
      [1.67, 0.377, 0.334],
      [1.72, 0.325, 0.29],
      [1.74, 0.23, 0.2],
    ]);
    // Occipital volume connects to crown; frontal fringe stays above brows.
    piece(name, "Hair", "Head", [0, 1.552, -0.124], [0.367, 0.23, 0.09], 0.022);
    if (style !== "buzz" && style !== "hijab")
      piece(name, "Hair", "Head", [-0.07, 1.615, 0.127], [0.225, 0.085, 0.096], 0.018);
    if (style === "sidepart" || style === "spiky")
      piece(name, "Hair", "Head", [0.058, 1.699, 0.056], [0.235, 0.085, 0.22], 0.018);
    if (style === "bob" || style === "hijab")
      for (const sign of [-1, 1])
        piece(name, "Hair", "Head", [sign * 0.178, 1.455, -0.037], [0.073, 0.37, 0.26], 0.025);
    if (style === "buns")
      for (const sign of [-1, 1])
        piece(name, "Hair", "Head", [sign * 0.163, 1.662, -0.116], [0.13, 0.13, 0.15], 0.04);
    if (style === "ponytail")
      piece(name, "Hair", "Head", [0, 1.5, -0.223], [0.125, 0.31, 0.12], 0.026);
    if (style === "cap") piece(name, "Hair", "Head", [0, 1.616, 0.198], [0.36, 0.035, 0.23], 0.008);
    if (style === "hijab")
      piece(name, "Hair", "Head", [0, 1.292, -0.025], [0.35, 0.12, 0.26], 0.028);
  }
  // Modular role/accessory overlays all bind to the same joints.
  piece("Outfit_cashier", "Sole", "Spine", [0, 0.879, 0.129], [0.267, 0.25, 0.014], 0.004);
  piece("Outfit_warehouse", "Sole", "Chest", [0, 1.054, 0.129], [0.395, 0.032, 0.014], 0.004);
  piece("Outfit_smart", "Accent", "Chest", [0, 1.089, 0.132], [0.041, 0.17, 0.016], 0.004);
  piece("Badge", "White", "Chest", [-0.11, 1.119, 0.133], [0.07, 0.033, 0.009], 0.003);
  for (const sign of [-1, 1]) {
    for (const y of [1.46, 1.526])
      piece(
        "Accessory_glasses",
        "Ink",
        "Head",
        [sign * 0.078, y, 0.17],
        [0.103, 0.009, 0.009],
        0.002,
      );
    for (const x of [sign * 0.027, sign * 0.128])
      piece("Accessory_glasses", "Ink", "Head", [x, 1.493, 0.17], [0.009, 0.067, 0.009], 0.002);
  }
  piece("Accessory_glasses", "Ink", "Head", [0, 1.5, 0.17], [0.052, 0.009, 0.01], 0.002);
  piece("Accessory_headset", "Ink", "Head", [-0.21, 1.47, 0], [0.037, 0.115, 0.1]);
  piece("Accessory_headset", "Ink", "Head", [-0.18, 1.425, 0.105], [0.018, 0.018, 0.21], 0.004);
  piece("Accessory_scarf", "Accent", "Neck", [0, 1.248, 0.012], [0.2, 0.065, 0.2]);
  for (const [name, geos] of Object.entries(geometryBuckets)) {
    const geo = mergeGeometries(geos)!;
    const mesh = new T.SkinnedMesh(geo, mats[meshMats[name]!]!);
    mesh.name = name;
    scene.add(mesh);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    geos.forEach((g) => g.dispose());
  }
  const clips = AVATAR_ANIMATIONS.map((name) => {
    const duration =
      name === "Walk"
        ? 0.8
        : name === "Run"
          ? 0.58
          : name === "Jump"
            ? 0.55
            : name === "GetUp"
              ? 0.65
              : name === "Hit"
                ? 0.22
                : 2;
    const times = Array.from({ length: 25 }, (_, i) => (i * duration) / 24),
      tracks: T.KeyframeTrack[] = [];
    const poses: Record<string, (t: number) => V> = {};
    const sine = (t: number) => Math.sin(t * Math.PI * 2);
    poses["Chest"] = (t) => [0, Math.sin(t * Math.PI * 2) * 0.012, 0];
    poses["Head"] = (t) => [0.008, Math.sin(t * Math.PI * 2) * 0.025, 0];
    if (name === "Walk" || name === "Run")
      for (const [side, sign] of [
        ["Left", 1],
        ["Right", -1],
      ] as const) {
        const run = name === "Run";
        poses[`${side}UpperLeg`] = (t) => [sine(t) * sign * (run ? 0.8 : 0.53), 0, 0];
        poses[`${side}LowerLeg`] = (t) => [
          Math.max(0, -sine(t) * sign) * (run ? 1.15 : 0.72),
          0,
          0,
        ];
        poses[`${side}Foot`] = (t) => [-Math.max(0, -sine(t) * sign) * 0.25, 0, 0];
        poses[`${side}UpperArm`] = (t) => [-sine(t) * sign * (run ? 0.65 : 0.4), 0, sign * 0.04];
        poses[`${side}LowerArm`] = () => [run ? -1.1 : -0.12, 0, 0];
      }
    if (name === "Talk" || name === "Checkout" || name === "PickItem") {
      poses["RightUpperArm"] = (t) => [-0.35 + sine(t) * 0.1, 0, -0.08];
      poses["RightLowerArm"] = (t) => [-0.55 + sine(t) * 0.17, 0, 0];
      poses["Head"] = (t) => [sine(t) * 0.035, 0.05, 0];
    }
    if (name === "Wave") {
      poses["RightUpperArm"] = () => [0, 0, -2.35];
      poses["RightLowerArm"] = (t) => [0, 0, -0.3 + sine(t) * 0.25];
    }
    if (name === "CarryBox")
      for (const side of ["Left", "Right"]) {
        poses[`${side}UpperArm`] = () => [-0.5, 0, 0];
        poses[`${side}LowerArm`] = () => [-1, 0, 0];
      }
    if (name === "UsePhone") {
      poses["RightUpperArm"] = () => [-0.6, 0, 0];
      poses["RightLowerArm"] = () => [-1.5, 0, 0];
      poses["Head"] = () => [0.16, 0, 0];
    }
    if (name === "Sit" || name === "Fall" || name === "GetUp") {
      for (const side of ["Left", "Right"]) {
        poses[`${side}UpperLeg`] = (t) => [-1.45 * (name === "GetUp" ? 1 - t : 1), 0, 0];
        poses[`${side}LowerLeg`] = (t) => [
          (name === "Sit" ? 0.9 : 0.15) * (name === "GetUp" ? 1 - t : 1),
          0,
          0,
        ];
      }
      const amount = name === "Sit" ? 0.4 : 0.57;
      tracks.push(
        new T.VectorKeyframeTrack(
          "Hips.position",
          times,
          times.flatMap((t) => [0, 0.72 - amount * (name === "GetUp" ? 1 - t / duration : 1), 0]),
        ),
      );
      poses["Chest"] = (t) => [-0.18 * (name === "GetUp" ? 1 - t : 1), 0, 0];
    }
    if (name === "Jump") {
      poses["Chest"] = (t) => [t < 0.35 ? 0.08 : -0.12, 0, 0];
      for (const side of ["Left", "Right"] as const) {
        const sign = side === "Left" ? 1 : -1;
        poses[`${side}UpperLeg`] = (t) => [t < 0.3 ? 0.55 : -0.25, 0, 0];
        poses[`${side}LowerLeg`] = (t) => [t < 0.3 ? 0.85 : 0.15, 0, 0];
        poses[`${side}UpperArm`] = (t) => [t < 0.35 ? -0.35 : -1.4, 0, sign * 0.2];
        poses[`${side}LowerArm`] = () => [-0.4, 0, 0];
      }
      tracks.push(
        new T.VectorKeyframeTrack(
          "Hips.position",
          times,
          times.flatMap((t) => {
            const u = t / duration;
            const lift = u < 0.25 ? -0.04 : u < 0.7 ? 0.08 : 0.02;
            return [0, 0.72 + lift, 0];
          }),
        ),
      );
    }
    if (name === "Hit") {
      poses["Chest"] = (t) => [-Math.sin(t * Math.PI) * 0.3, 0, 0];
      for (const side of ["Left", "Right"]) poses[`${side}UpperArm`] = () => [-0.8, 0, 0];
    }
    // Every clip keys every joint: cross-fades never leave a stale limb pose behind.
    for (const b of bones) {
      tracks.push(
        new T.QuaternionKeyframeTrack(
          `${b.name}.quaternion`,
          times,
          times.flatMap((t) => {
            const p = poses[b.name]?.(t / duration) ?? [0, 0, 0];
            return new T.Quaternion().setFromEuler(new T.Euler(...p)).toArray();
          }),
        ),
      );
    }
    if (!["Sit", "Fall", "GetUp", "Jump"].includes(name))
      tracks.push(
        new T.VectorKeyframeTrack("Hips.position", [0, duration], [0, 0.72, 0, 0, 0.72, 0]),
      );
    if (name === "Idle")
      tracks.push(
        new T.VectorKeyframeTrack(
          "Chest.position",
          times,
          times.flatMap((t) => [0, 0.21 + Math.sin((t / duration) * Math.PI * 2) * 0.0025, 0]),
        ),
      );
    else
      tracks.push(
        new T.VectorKeyframeTrack("Chest.position", [0, duration], [0, 0.21, 0, 0, 0.21, 0]),
      );
    return new T.AnimationClip(name, duration, tracks);
  });
  scene.animations = clips;
  return { scene, animations: clips };
}
