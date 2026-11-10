import * as T from "three";
import { mergeVertices, mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const SCALE = 1.74 / 2.45;
const height = [
  [0, 0],
  [0.51, 0.57],
  [0.94, 0.986],
  [1.5, 1.5],
  [1.9, 1.9],
  [3, 3],
];
function mapHeight(y, inverse = false) {
  const a = inverse ? 1 : 0,
    b = inverse ? 0 : 1;
  const i = Math.max(
    1,
    height.findIndex((k) => y <= k[a]),
  );
  const lo = height[i - 1],
    hi = height[i];
  return lo[b] + ((y - lo[a]) * (hi[b] - lo[b])) / (hi[a] - lo[a]);
}

/** Closed, smooth tailored surfaces; rings are [height, half-width, half-depth]. */
function loft(rings, segments = 32) {
  const positions = [],
    uv = [],
    indices = [];
  for (let i = 0; i < rings.length; i++) {
    const [y, x, z] = rings[i];
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * x, y, Math.sin(angle) * z);
      uv.push(j / segments, i / (rings.length - 1));
      if (i && j) {
        const n = i * (segments + 1) + j,
          p = n - segments - 1;
        indices.push(n - 1, p, p - 1, n - 1, n, p);
      }
    }
  }
  for (let j = 1; j < segments; j++) {
    indices.push(0, j, j + 1);
    const top = (rings.length - 1) * (segments + 1);
    indices.push(top, top + j + 1, top + j);
  }
  const g = new T.BufferGeometry()
    .setAttribute("position", new T.Float32BufferAttribute(positions, 3))
    .setAttribute("uv", new T.Float32BufferAttribute(uv, 2))
    .setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function sourcePart(source, name, bones, includeVertex = () => true) {
  const mesh = source.getObjectByName(name),
    g = mesh.geometry.toNonIndexed();
  const allowed = new Set(
    mesh.skeleton.bones.flatMap((b, i) => (bones.includes(b.name) ? [i] : [])),
  );
  const p = [],
    n = [],
    uv = [];
  for (let i = 0; i < g.attributes.position.count; i += 3) {
    const selected = [i, i + 1, i + 2].every((v) => {
      let weight = 0;
      for (let k = 0; k < 4; k++)
        if (allowed.has(g.attributes.skinIndex.getComponent(v, k)))
          weight += g.attributes.skinWeight.getComponent(v, k);
      return weight > 0.999 && includeVertex(g.attributes.position, v);
    });
    if (!selected) continue;
    for (let v = i; v < i + 3; v++) {
      p.push(...new T.Vector3().fromBufferAttribute(g.attributes.position, v).toArray());
      n.push(...new T.Vector3().fromBufferAttribute(g.attributes.normal, v).toArray());
      uv.push(g.attributes.uv?.getX(v) ?? 0, g.attributes.uv?.getY(v) ?? 0);
    }
  }
  g.dispose();
  if (!p.length) return null;
  return mergeVertices(
    new T.BufferGeometry()
      .setAttribute("position", new T.Float32BufferAttribute(p, 3))
      .setAttribute("normal", new T.Float32BufferAttribute(n, 3))
      .setAttribute("uv", new T.Float32BufferAttribute(uv, 2)),
  );
}

function fit(geometry, min, max) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox,
    size = box.getSize(new T.Vector3());
  const scale = new T.Vector3().fromArray(max).sub(new T.Vector3().fromArray(min)).divide(size);
  return geometry
    .translate(-box.min.x, -box.min.y, -box.min.z)
    .scale(scale.x, scale.y, scale.z)
    .translate(...min);
}

function tailoredTrousers(material) {
  const size = 48,
    field = new MarchingCubes(size, material, true, false, 20000);
  const blend = (a, b) => {
    const h = T.MathUtils.clamp(0.5 + (0.5 * (b - a)) / 0.035, 0, 1);
    return T.MathUtils.lerp(b, a, h) - 0.035 * h * (1 - h);
  };
  for (let iz = 0; iz < size; iz++)
    for (let iy = 0; iy < size; iy++)
      for (let ix = 0; ix < size; ix++) {
        const x = ((ix / size) * 2 - 1) * 0.34,
          y = ((iy / size) * 2 - 1) * 0.6 + 0.65,
          z = ((iz / size) * 2 - 1) * 0.2;
        let distance = (Math.hypot(x / 0.235, (y - 1.0) / 0.12, z / 0.145) - 1) * 0.12;
        const t = T.MathUtils.smoothstep(y, 0.22, 1.02);
        const rx = T.MathUtils.lerp(0.072, 0.11, t),
          rz = T.MathUtils.lerp(0.08, 0.125, t);
        for (const sign of [-1, 1]) {
          const radial = (Math.hypot((x - sign * 0.126) / rx, z / rz) - 1) * rx;
          const cap = Math.max(0.22 - y, y - 1.06);
          const leg =
            Math.min(Math.max(radial, cap), 0) + Math.hypot(Math.max(radial, 0), Math.max(cap, 0));
          distance = blend(distance, leg);
        }
        field.setCell(ix, iy, iz, field.isolation - distance * 100);
      }
  field.update();
  const g = new T.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const attribute = field.geometry.attributes[name];
    g.setAttribute(
      name,
      new T.Float32BufferAttribute(
        attribute.array.slice(0, field.count * attribute.itemSize),
        attribute.itemSize,
      ),
    );
  }
  field.geometry.dispose();
  return mergeVertices(g.scale(0.34, 0.6, 0.2).translate(0, 0.65, 0));
}

/** Build all body/garment geometry before fitting the entire wardrobe to V3 proportions. */
export function sculptFullBody(rig, social) {
  const root = rig.scene;
  const mat = (name) => rig.materials.get(name);
  function add(parent, geometry, color, name = `V3_${color}`) {
    const mesh = new T.Mesh(geometry, mat(color));
    mesh.name = `${parent.name}_${name}`;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function clearColor(parent, color) {
    for (const child of [...parent.children])
      if (child.isMesh && child.material.name === color) child.removeFromParent();
  }
  function ball(parent, position, size, color) {
    return add(
      parent,
      new T.SphereGeometry(1, 24, 16).scale(...size).translate(...position),
      color,
    );
  }
  const torso = sourcePart(social, "V3_Jacket", ["Spine", "Chest"]);
  const groups = [];
  root.traverse((o) => {
    if (o.userData.wardrobeSlot) groups.push(o);
  });
  for (const group of groups) {
    const { wardrobeSlot: slot, wardrobeId: id } = group.userData;
    const joint = group.parent.name;
    if (slot === "top" && joint === "Body" && !group.userData.builtinNeck) {
      clearColor(group, "jacket");
      add(
        group,
        fit(torso.clone(), [-0.345, 0.97, -0.215], [0.345, 1.64, 0.215]),
        "jacket",
        "TailoredTorso",
      );
      if (id === "hoodie") {
        clearColor(group, "shirt"); // The chosen navy/gold concept has a standing collar, not drawstrings.
        add(
          group,
          loft([
            [1.59, 0.1, 0.1],
            [1.61, 0.15, 0.13],
            [1.68, 0.14, 0.12],
            [1.69, 0.11, 0.1],
          ]),
          "jacket",
          "Collar",
        );
        const trim = new T.TorusGeometry(0.127, 0.012, 8, 40)
          .rotateX(Math.PI / 2)
          .scale(1.1, 1, 1)
          .translate(0, 1.683, 0);
        add(group, trim, "trim", "CollarTrim");
        for (const y of [1.47, 1.34, 1.21])
          ball(group, [0, y, 0.223], [0.025, 0.025, 0.012], "trim");
      }
    }
    if (slot === "top" && /Arm$/.test(joint) && id === "tshirt") {
      const color = id === "varsity" ? "shirt" : "jacket";
      clearColor(group, color);
      add(
        group,
        loft([
          [-0.33, 0.04, 0.04],
          [-0.3, 0.105, 0.1],
          [-0.2, 0.12, 0.12],
          [-0.03, 0.135, 0.13],
          [0.08, 0.09, 0.085],
          [0.095, 0.005, 0.005],
        ]),
        color,
        "Sleeve",
      );
    }
    if (slot === "bottom" && joint === "Body") {
      clearColor(group, "pants");
      add(
        group,
        loft([
          [0.82, 0.025, 0.07],
          [0.85, 0.12, 0.11],
          [0.9, 0.24, 0.17],
          [1.0, 0.29, 0.19],
          [1.04, 0.22, 0.16],
        ]),
        "pants",
        "TailoredHip",
      );
    }
    if (slot === "bottom" && /Leg$/.test(joint) && id === "shorts") {
      clearColor(group, "pants");
      add(
        group,
        loft([
          [-0.44, 0.08, 0.08],
          [-0.4, 0.118, 0.115],
          [-0.2, 0.14, 0.14],
          [-0.02, 0.145, 0.15],
          [0.1, 0.09, 0.1],
        ]),
        "pants",
        "TrouserThigh",
      );
    }
    if (slot === "footwear" && /Knee$/.test(joint)) {
      group.clear();
      const side = joint.startsWith("Left") ? "Right" : "Left";
      root.updateMatrixWorld(true);
      for (const [name, color] of [
        ["V3_Rubber", "shirt"],
        ["V3_Sneaker", "shoes"],
        ["V3_T-shirt", "shoes"],
        ["V3_Sneaker_accent", "trim"],
      ]) {
        if (id === "slip-on" && name === "V3_T-shirt") continue;
        const g = sourcePart(
          social,
          name,
          [side + "Foot"],
          (p, i) => id !== "slip-on" || name !== "V3_Rubber" || p.getY(i) < 0.1,
        );
        if (!g) continue;
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++)
          p.setXYZ(
            i,
            p.getX(i) / (SCALE * 0.72),
            mapHeight(p.getY(i) / SCALE + 0.035, true),
            p.getZ(i) / (SCALE * 0.8),
          );
        g.computeVertexNormals();
        g.applyMatrix4(group.matrixWorld.clone().invert());
        add(group, g, color, `Sculpted_${name}`);
      }
      if (id === "boots") ball(group, [0, -0.25, 0], [0.12, 0.15, 0.13], "shoes");
      if (id === "slip-on") ball(group, [0, -0.33, 0.16], [0.12, 0.012, 0.055], "trim");
    }
  }
  torso.dispose();
  const cap = root.getObjectByName("beanie");
  cap.clear();
  ball(cap, [0, 0.3, -0.02], [0.38, 0.29, 0.33], "jacket");
  add(
    cap,
    new T.TorusGeometry(0.35, 0.035, 12, 64)
      .rotateX(Math.PI / 2)
      .scale(1, 1, 0.9)
      .translate(0, 0.21, 0),
    "trim",
    "CapBand",
  );
  ball(cap, [0, 0.59, -0.02], [0.055, 0.04, 0.055], "trim");
  const scalp = root.getObjectByName("scalp");
  for (const x of [-0.17, -0.025, 0.13])
    ball(scalp, [x, 0.17, 0.29], [0.105, 0.045, 0.045], "hair");
  for (const side of ["Left", "Right"]) {
    const wrist = root.getObjectByName(side + "Wrist");
    clearColor(wrist, "skin");
    const skin = sourcePart(social, "V3_Skin", [(side === "Left" ? "Right" : "Left") + "Hand"]);
    add(wrist, fit(skin, [-0.105, -0.15, -0.065], [0.105, 0.035, 0.085]), "skin", "skin");
  }

  // Export a complete wardrobe once. Geometry is shared between runtime instances.
  root.updateMatrixWorld(true);
  const objects = [];
  root.traverse((o) => objects.push(o));
  const positions = new Map(objects.map((o) => [o, o.getWorldPosition(new T.Vector3())]));
  const underHead = (o) => {
    for (let p = o; p; p = p.parent) if (p.name === "Head") return true;
    return false;
  };
  const warp = (v, head) => {
    v.x *= head ? 1 : 0.72;
    v.z *= head ? 1 : 0.8;
    v.y = mapHeight(v.y);
    return v;
  };
  const worldGeometries = new Map();
  for (const o of objects) {
    if (!o.isMesh) continue;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const p = geometry.attributes.position,
      n = geometry.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(p, i),
        oldY = v.y;
      warp(v, underHead(o));
      p.setXYZ(i, v.x, v.y, v.z);
      const sy = (mapHeight(oldY + 0.0001) - mapHeight(oldY)) / 0.0001;
      const normal = new T.Vector3()
        .fromBufferAttribute(n, i)
        .divide(new T.Vector3(underHead(o) ? 1 : 0.72, sy, underHead(o) ? 1 : 0.8))
        .normalize();
      n.setXYZ(i, normal.x, normal.y, normal.z);
    }
    worldGeometries.set(o, geometry);
  }
  for (const o of objects) {
    const world = warp(positions.get(o).clone(), underHead(o));
    if (o.parent) o.parent.worldToLocal(world);
    o.position.copy(world);
    o.updateMatrixWorld(true);
    if (o.isMesh) o.geometry = worldGeometries.get(o).applyMatrix4(o.matrixWorld.clone().invert());
  }

  // Skin the full V3 sleeves and continuous trousers across elbows/knees, not rigid segments.
  const boneNames = [
    "Body",
    "Head",
    ...["Left", "Right"].flatMap((side) =>
      ["Arm", "Elbow", "Wrist", "Leg", "Knee"].map((part) => side + part),
    ),
  ];
  const bones = boneNames.map((name) => {
    const old = root.getObjectByName(name),
      bone = new T.Bone();
    bone.name = name;
    bone.position.copy(old.position);
    bone.quaternion.copy(old.quaternion);
    bone.scale.copy(old.scale);
    bone.userData = { ...old.userData };
    old.parent.add(bone);
    bone.add(...[...old.children]);
    old.removeFromParent();
    return bone;
  });
  root.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(bones);
  const index = (name) => boneNames.indexOf(name);
  function skinned(parent, geometry, color, name) {
    const mesh = new T.SkinnedMesh(geometry, mat(color));
    mesh.name = name;
    mesh.castShadow = true;
    root.add(mesh);
    mesh.bind(skeleton, new T.Matrix4());
    // Keep selection alongside its corresponding garment; attached skin cancels this transform.
    parent.attach(mesh);
    mesh.bindMatrix.copy(mesh.matrixWorld);
    return mesh;
  }
  social.updateMatrixWorld(true);
  for (const side of ["Left", "Right"]) {
    const sourceSide = side === "Left" ? "Right" : "Left";
    const upper = root.getObjectByName(side + "Arm"),
      elbow = root.getObjectByName(side + "Elbow"),
      wrist = root.getObjectByName(side + "Wrist");
    const sourceUpper = social.getObjectByName(sourceSide + "UpperArm"),
      sourceLower = social.getObjectByName(sourceSide + "LowerArm"),
      sourceHand = social.getObjectByName(sourceSide + "Hand");
    const positions = [upper, elbow, wrist].map((bone) => bone.getWorldPosition(new T.Vector3()));
    const sourcePositions = [sourceUpper, sourceLower, sourceHand].map((bone) =>
      bone.getWorldPosition(new T.Vector3()),
    );
    const transforms = [0, 1].map((i) => {
      const from = sourcePositions[i + 1].clone().sub(sourcePositions[i]);
      const to = positions[i + 1].clone().sub(positions[i]);
      const rotation = new T.Quaternion().setFromUnitVectors(
        from.clone().normalize(),
        to.clone().normalize(),
      );
      return new T.Matrix4()
        .compose(positions[i], rotation, new T.Vector3().setScalar(to.length() / from.length()))
        .multiply(
          new T.Matrix4().makeTranslation(...sourcePositions[i].clone().negate().toArray()),
        );
    });
    const original = social.getObjectByName("V3_Jacket"),
      source = original.geometry.toNonIndexed();
    const sourceIndices = [sourceUpper, sourceLower].map((bone) =>
      original.skeleton.bones.indexOf(bone),
    );
    const p = [],
      n = [],
      uvs = [],
      joints = [],
      weights = [];
    for (let v = 0; v < source.attributes.position.count; v += 3) {
      const w = [v, v + 1, v + 2].map((i) =>
        sourceIndices.map((bone) => {
          let total = 0;
          for (let k = 0; k < 4; k++)
            if (source.attributes.skinIndex.getComponent(i, k) === bone)
              total += source.attributes.skinWeight.getComponent(i, k);
          return total;
        }),
      );
      if (!w.every(([a, b]) => a + b > 0.999)) continue;
      for (let j = 0; j < 3; j++) {
        const i = v + j,
          point = new T.Vector3(),
          normal = new T.Vector3();
        for (let k = 0; k < 2; k++) {
          point.addScaledVector(
            new T.Vector3()
              .fromBufferAttribute(source.attributes.position, i)
              .applyMatrix4(transforms[k]),
            w[j][k],
          );
          normal.addScaledVector(
            new T.Vector3()
              .fromBufferAttribute(source.attributes.normal, i)
              .transformDirection(transforms[k]),
            w[j][k],
          );
        }
        p.push(...point.toArray());
        n.push(...normal.normalize().toArray());
        uvs.push(source.attributes.uv?.getX(i) ?? 0, source.attributes.uv?.getY(i) ?? 0);
        joints.push(index(side + "Arm"), index(side + "Elbow"), 0, 0);
        weights.push(...w[j], 0, 0);
      }
    }
    source.dispose();
    const sleeve = mergeVertices(
      new T.BufferGeometry()
        .setAttribute("position", new T.Float32BufferAttribute(p, 3))
        .setAttribute("normal", new T.Float32BufferAttribute(n, 3))
        .setAttribute("uv", new T.Float32BufferAttribute(uvs, 2))
        .setAttribute("skinIndex", new T.Uint16BufferAttribute(joints, 4))
        .setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4)),
    );
    for (const g of upper.children.filter(
      (o) => o.userData.wardrobeSlot === "top" && o.userData.wardrobeId !== "tshirt",
    )) {
      const id = g.userData.wardrobeId,
        color = id === "varsity" ? "shirt" : "jacket";
      clearColor(g, color);
      const lower = elbow.children.find((o) => o.userData.wardrobeId === id);
      if (lower) {
        clearColor(lower, color);
        clearColor(lower, "trim");
        const cuff = sourcePart(social, "V3_Knit_trim", [sourceSide + "LowerArm"]);
        cuff.applyMatrix4(transforms[1]).applyMatrix4(lower.matrixWorld.clone().invert());
        add(lower, cuff, "trim", "SculptedCuff");
      }
      skinned(g, sleeve, color, `${g.name}_V3Sleeve`);
    }
  }
  const trousers = tailoredTrousers(mat("pants"));
  const skinIndex = [],
    skinWeight = [],
    p = trousers.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      side = x < 0 ? "Left" : "Right";
    const hip = T.MathUtils.smoothstep(y, 0.88, 1.02);
    if (y > 0.8) {
      const right = T.MathUtils.smoothstep(x, -0.055, 0.055);
      skinIndex.push(index("Body"), index("LeftLeg"), index("RightLeg"), 0);
      skinWeight.push(hip, (1 - hip) * (1 - right), (1 - hip) * right, 0);
    } else {
      const knee = T.MathUtils.smoothstep(y, 0.49, 0.65);
      skinIndex.push(index(side + "Leg"), index(side + "Knee"), 0, 0);
      skinWeight.push(knee, 1 - knee, 0, 0);
    }
  }
  trousers.setAttribute("skinIndex", new T.Uint16BufferAttribute(skinIndex, 4));
  trousers.setAttribute("skinWeight", new T.Float32BufferAttribute(skinWeight, 4));
  for (const group of groups.filter(
    (o) => o.userData.wardrobeSlot === "bottom" && o.userData.wardrobeId !== "shorts",
  )) {
    clearColor(group, "pants");
    if (group.parent.name === "Body") skinned(group, trousers, "pants", `${group.name}_V3Trousers`);
    else if (group.userData.wardrobeId === "cargo" && /Leg$/.test(group.parent.name)) {
      const sign = group.parent.name.startsWith("Left") ? -1 : 1;
      add(
        group,
        new RoundedBoxGeometry(0.025, 0.15, 0.14, 2, 0.01).translate(sign * 0.11, -0.24, 0),
        "pants",
        "Pocket",
      );
    }
  }

  // One mesh per material and animated garment group, keeping wardrobe selection boundaries.
  for (const parent of objects.filter((o) => !o.isMesh)) {
    const buckets = new Map();
    for (const child of parent.children.filter((o) => o.isMesh && !o.isSkinnedMesh)) {
      const bucket = buckets.get(child.material) ?? [];
      bucket.push(child);
      buckets.set(child.material, bucket);
    }
    for (const [material, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        return (
          mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
        ).applyMatrix4(mesh.matrix);
      });
      const merged = new T.Mesh(mergeVertices(mergeGeometries(geometries)), material);
      merged.name = `${parent.name}_${material.name}`;
      merged.castShadow = true;
      parent.remove(...meshes);
      parent.add(merged);
      geometries.forEach((g) => g.dispose());
    }
  }
  root.getObjectByName("Explorer").userData.avatarVisual = "social-avatar-v3-full-body";
  const welded = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!welded.has(o.geometry)) welded.set(o.geometry, mergeVertices(o.geometry));
    o.geometry = welded.get(o.geometry);
  });
}

/** Preserve foot support (or seat hip height) while fitting clips to the new limb lengths. */
export function retargetBodyClips(before, after, clips) {
  const oldMixer = new T.AnimationMixer(before),
    newMixer = new T.AnimationMixer(after);
  const point = new T.Vector3();
  function footSamples(scene) {
    const meshes = [];
    scene.traverseVisible((o) => {
      if (o.isMesh && o.parent.userData.wardrobeSlot === "footwear") meshes.push(o);
    });
    return meshes;
  }
  const oldFeet = footSamples(before),
    newFeet = footSamples(after);
  function support(meshes) {
    let y = Infinity;
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position;
      if (mesh.isSkinnedMesh) mesh.skeleton.update();
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i);
        if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, point);
        y = Math.min(y, point.applyMatrix4(mesh.matrixWorld).y);
      }
    }
    return y;
  }
  const result = clips.map((clip) => {
    oldMixer.stopAllAction();
    newMixer.stopAllAction();
    oldMixer.clipAction(clip).reset().setLoop(T.LoopOnce, 1).play().clampWhenFinished = true;
    newMixer.clipAction(clip).reset().setLoop(T.LoopOnce, 1).play().clampWhenFinished = true;
    const times = [],
      values = [],
      frames = Math.ceil(clip.duration * 60);
    const seated = /^(Sit|Ride|Piggyback|Swim|Fly)/.test(clip.name);
    for (let i = 0; i <= frames; i++) {
      const time = (i / frames) * clip.duration;
      oldMixer.setTime(time);
      newMixer.setTime(time);
      before.updateMatrixWorld(true);
      after.updateMatrixWorld(true);
      const oldY = seated
        ? before.getObjectByName("LeftLeg").getWorldPosition(point).y
        : support(oldFeet);
      const newY = seated
        ? after.getObjectByName("LeftLeg").getWorldPosition(point).y
        : support(newFeet);
      const body = after.getObjectByName("Body").position;
      times.push(time);
      values.push(body.x, body.y + oldY - newY, body.z);
    }
    return new T.AnimationClip(clip.name, clip.duration, [
      ...clip.tracks
        .filter((track) => track.name !== "Body.position")
        .map((track) => track.clone()),
      new T.VectorKeyframeTrack("Body.position", times, values),
    ]);
  });
  oldMixer.stopAllAction();
  newMixer.stopAllAction();
  return result;
}
