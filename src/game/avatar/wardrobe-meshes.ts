import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
/** Geometry authored against the inspected rigid pivots, in original GLB units. */
export function buildWardrobe(
  root: T.Object3D,
  material: (name: string) => T.Material,
  generated: Set<T.BufferGeometry>,
) {
  const box = new RoundedBoxGeometry(1, 1, 1, 2, 0.13),
    sphere = new T.SphereGeometry(1, 16, 10),
    cylinder = new T.CylinderGeometry(1, 1, 1, 16);
  const group = (parent: T.Object3D, slot: string, id: string) => {
    const g = new T.Group();
    g.name = `Wardrobe_${slot}_${id}_${parent.name}`;
    g.userData["wardrobeSlot"] = slot;
    g.userData["wardrobeId"] = id;
    parent.add(g);
    return g;
  };
  const part = (g: T.Object3D, geo: T.BufferGeometry, p: number[], s: number[], color: string) => {
    generated.add(geo);
    const m = new T.Mesh(geo, material(color));
    m.position.fromArray(p);
    m.scale.fromArray(s);
    g.add(m);
    return m;
  };
  const b = (g: T.Object3D, p: number[], s: number[], c: string) => part(g, box, p, s, c);
  const ball = (g: T.Object3D, p: number[], s: number[], c: string) => part(g, sphere, p, s, c);
  const body = root.getObjectByName("Body")!,
    head = root.getObjectByName("Head")!;
  const originals: Record<string, { id: string; nodes: string[] }> = {
    top: {
      id: "explorer-jacket",
      nodes: [
        "Jacket",
        ...["1", "2", "3", "4", "5", "6", "35", "39", "48", "52"].map((n) => "Detail" + n),
      ],
    },
    bottom: { id: "jeans", nodes: [0, 40, 41, 53, 54].map((n) => "Detail" + n) },
    footwear: {
      id: "boots",
      nodes: [42, 43, 44, 45, 46, 47, 55, 56, 57, 58, 59, 60].map((n) => "Detail" + n),
    },
  };
  for (const [slot, { id, nodes }] of Object.entries(originals)) {
    const parents = new Map<T.Object3D, T.Group>();
    for (const name of nodes) {
      const node = root.getObjectByName(name)!;
      if (!node) throw new Error(`Wardrobe manifest ${name}`);
      const parent = node.parent!;
      if (!parents.has(parent)) parents.set(parent, group(parent, slot, id));
      parents.get(parent)!.add(node);
    }
  }
  const builtInScarf = group(body, "top", "explorer-jacket");
  builtInScarf.name += "Scarf";
  builtInScarf.userData["builtinNeck"] = true;
  for (const n of [8, 9, 10]) builtInScarf.add(root.getObjectByName("Detail" + n)!);
  // First end-to-end garment: rounded tee body and separate pivot-following short sleeves.
  for (const id of ["tshirt", "hoodie", "varsity", "overshirt"]) {
    const g = group(body, "top", id);
    b(g, [0, 1.3, 0], [id === "hoodie" ? 0.73 : 0.69, 0.68, 0.45], "jacket");
    const collar = part(
      g,
      new T.TorusGeometry(0.12, 0.028, 6, 16),
      [0, 1.635, 0],
      [1, 1, 1],
      "trim",
    );
    collar.rotation.x = Math.PI / 2;
    if (id === "tshirt") {
      b(g, [0.18, 1.44, 0.235], [0.1, 0.08, 0.016], "trim");
    }
    if (id === "hoodie") {
      ball(g, [0, 1.59, -0.15], [0.26, 0.18, 0.17], "jacket");
      b(g, [0, 1.12, 0.245], [0.35, 0.15, 0.045], "jacket");
      for (const s of [-1, 1]) b(g, [s * 0.08, 1.46, 0.244], [0.016, 0.21, 0.018], "shirt");
    }
    if (id === "varsity" || id === "overshirt") {
      b(g, [0, 1.3, 0.239], [0.026, 0.56, 0.02], "trim");
      for (let i = 0; i < 4; i++)
        ball(g, [0.025, 1.48 - i * 0.12, 0.255], [0.017, 0.017, 0.015], "trim");
      if (id === "varsity") {
        b(g, [-0.19, 1.44, 0.25], [0.1, 0.15, 0.026], "shirt");
        b(g, [0, 0.995, 0], [0.68, 0.06, 0.45], "trim");
      } else
        for (const s of [-1, 1]) {
          b(g, [s * 0.19, 1.43, 0.247], [0.17, 0.15, 0.025], "jacket");
          b(g, [s * 0.19, 1.5, 0.263], [0.17, 0.025, 0.022], "trim");
        }
    }
    for (const side of ["Left", "Right"]) {
      const arm = group(root.getObjectByName(side + "Arm")!, "top", id);
      part(
        arm,
        new T.CapsuleGeometry(0.13, id === "tshirt" ? 0.09 : 0.2, 4, 12),
        [0, -0.1, 0],
        [1, 1, 1],
        id === "varsity" ? "shirt" : "jacket",
      );
      if (id !== "tshirt") {
        const elbow = group(root.getObjectByName(side + "Elbow")!, "top", id);
        part(
          elbow,
          new T.CapsuleGeometry(0.096, 0.19, 4, 12),
          [0, -0.11, 0],
          [1, 1, 1],
          id === "varsity" ? "shirt" : "jacket",
        );
        b(elbow, [0, -0.24, 0], [0.195, 0.055, 0.195], "trim");
      }
    }
  }
  for (const id of ["cargo", "shorts", "skirt-leggings"]) {
    const g = group(body, "bottom", id);
    ball(g, [0, 0.97, 0], [0.32, 0.24, 0.23], "pants");
    if (id === "skirt-leggings")
      part(
        g,
        new T.CylinderGeometry(0.32, 0.41, 0.3, 16, 1, true),
        [0, 0.87, 0],
        [1, 1, 0.76],
        "jacket",
      );
    for (const side of ["Left", "Right"]) {
      const sign = side === "Left" ? -1 : 1,
        leg = group(root.getObjectByName(side + "Leg")!, "bottom", id),
        knee = group(root.getObjectByName(side + "Knee")!, "bottom", id);
      part(
        leg,
        new T.CapsuleGeometry(id === "cargo" ? 0.135 : 0.112, 0.23, 4, 12),
        [0, -0.19, 0],
        [1, 1, 1],
        "pants",
      );
      part(
        knee,
        new T.CapsuleGeometry(0.1, 0.2, 4, 12),
        [0, -0.12, 0],
        [1, 1, 1],
        id === "shorts" ? "skin" : "pants",
      );
      if (id === "cargo") b(leg, [sign * 0.13, -0.25, 0], [0.07, 0.18, 0.18], "pants");
      if (id === "shorts") b(leg, [0, -0.29, 0], [0.25, 0.05, 0.26], "trim");
    }
  }
  for (const id of ["sneakers", "slip-on"])
    for (const side of ["Left", "Right"]) {
      const g = group(root.getObjectByName(side + "Knee")!, "footwear", id);
      b(g, [0, -0.395, 0.07], [0.265, id === "sneakers" ? 0.17 : 0.125, 0.41], "shoes");
      b(g, [0, -0.457, 0.07], [0.28, 0.045, 0.43], "shirt");
      if (id === "sneakers") {
        b(g, [0, -0.34, 0.09], [0.19, 0.045, 0.26], "shoes");
        for (let j = 0; j < 3; j++)
          b(g, [0, -0.365 + j * 0.025, 0.28 - j * 0.004], [0.16, 0.012, 0.025], "trim");
      } else b(g, [0, -0.347, 0.15], [0.2, 0.016, 0.14], "trim");
    }
  function socket(slot: string) {
    let s = root.getObjectByName("Socket_" + slot);
    if (!s) {
      s = new T.Group();
      s.name = "Socket_" + slot;
      (slot === "neck" ? body : head).add(s);
    }
    return s;
  }
  function accessory(slot: string, id: string) {
    const g = new T.Group();
    g.name = id;
    socket(slot).add(g);
    return g;
  }
  function star(g: T.Object3D, p: number[], size: number, color = "trim") {
    const shape = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 + Math.PI / 2,
        r = i % 2 ? size * 0.45 : size;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (i) shape.lineTo(x, y);
      else shape.moveTo(x, y);
    }
    shape.closePath();
    part(
      g,
      new T.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }),
      p,
      [1, 1, 1],
      color,
    );
  }
  for (const id of ["cat-band", "rabbit-band", "bear-band", "star-band"]) {
    const g = accessory("headwear", id);
    part(g, new T.TorusGeometry(0.365, 0.025, 6, 18, Math.PI), [0, 0.1, 0], [1, 1, 1], "trim");
    for (const s of [-1, 1]) {
      if (id === "cat-band") {
        part(g, new T.ConeGeometry(0.115, 0.23, 3), [s * 0.25, 0.43, 0], [1, 1, 0.65], "jacket");
        part(g, new T.ConeGeometry(0.065, 0.14, 3), [s * 0.25, 0.44, 0.045], [1, 1, 0.3], "shirt");
      }
      if (id === "rabbit-band") {
        const ear = ball(g, [s * 0.19, 0.56, 0], [0.075, 0.23, 0.065], "shirt");
        ear.rotation.z = -s * 0.15;
        ball(g, [s * 0.19, 0.57, 0.05], [0.038, 0.15, 0.026], "trim");
      }
      if (id === "bear-band") {
        ball(g, [s * 0.25, 0.43, 0], [0.12, 0.12, 0.08], "shoes");
        ball(g, [s * 0.25, 0.44, 0.065], [0.07, 0.07, 0.023], "trim");
      }
      if (id === "star-band") star(g, [s * 0.23, 0.46, 0], 0.12);
    }
  }
  for (const id of ["bucket-hat", "beanie", "mini-crown"]) {
    const g = accessory("headwear", id);
    if (id === "bucket-hat") {
      part(g, new T.CylinderGeometry(0.29, 0.37, 0.25, 20), [0, 0.36, 0], [1, 1, 0.88], "jacket");
      part(g, new T.CylinderGeometry(0.37, 0.46, 0.07, 20), [0, 0.21, 0], [1, 1, 0.88], "jacket");
    }
    if (id === "beanie") {
      ball(g, [0, 0.29, -0.02], [0.38, 0.27, 0.33], "jacket");
      part(
        g,
        new T.TorusGeometry(0.35, 0.045, 6, 20),
        [0, 0.21, 0],
        [1, 1, 0.9],
        "trim",
      ).rotation.x = Math.PI / 2;
      ball(g, [0, 0.56, -0.02], [0.07, 0.07, 0.07], "trim");
    }
    if (id === "mini-crown") {
      part(g, new T.CylinderGeometry(0.16, 0.145, 0.1, 12), [0, 0.49, 0], [1, 1, 1], "trim");
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        part(
          g,
          new T.ConeGeometry(0.05, 0.13, 4),
          [Math.sin(a) * 0.14, 0.59, Math.cos(a) * 0.14],
          [1, 1, 1],
          "trim",
        );
      }
    }
  }
  for (const id of ["hair-bow", "star-clip", "flower-clip"]) {
    const g = accessory("hairDecoration", id);
    if (id === "hair-bow") {
      for (const s of [-1, 1])
        ball(g, [-0.2 + s * 0.085, 0.26, 0.25], [0.095, 0.07, 0.035], "jacket");
      ball(g, [-0.2, 0.26, 0.29], [0.035, 0.04, 0.03], "trim");
    }
    if (id === "star-clip") star(g, [-0.23, 0.24, 0.27], 0.09);
    if (id === "flower-clip") {
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ball(
          g,
          [-0.23 + Math.cos(a) * 0.055, 0.24 + Math.sin(a) * 0.055, 0.275],
          [0.042, 0.042, 0.025],
          "shirt",
        );
      }
      ball(g, [-0.23, 0.24, 0.302], [0.032, 0.032, 0.02], "trim");
    }
  }
  const hearts = accessory("eyewear", "heart-glasses");
  const heart = new T.Shape();
  heart.moveTo(0, -0.1);
  heart.bezierCurveTo(-0.2, 0.04, -0.1, 0.15, 0, 0.07);
  heart.bezierCurveTo(0.1, 0.15, 0.2, 0.04, 0, -0.1);
  for (const s of [-1, 1]) {
    part(
      hearts,
      new T.ExtrudeGeometry(heart, { depth: 0.012, bevelEnabled: false }),
      [s * 0.14, 0.07, 0.335],
      [0.8, 0.8, 1],
      "jacket",
    );
    b(hearts, [s * 0.26, 0.07, 0.19], [0.016, 0.018, 0.29], "trim");
  }
  b(hearts, [0, 0.07, 0.34], [0.08, 0.016, 0.015], "trim");
  const earrings = accessory("audio", "earrings");
  for (const s of [-1, 1])
    part(
      earrings,
      new T.TorusGeometry(0.047, 0.012, 6, 14),
      [s * 0.38, -0.055, 0.025],
      [1, 1, 1],
      "trim",
    );
  const scarf = accessory("neck", "neck-scarf");
  part(
    scarf,
    new T.TorusGeometry(0.13, 0.04, 6, 18),
    [0, 1.68, 0],
    [1, 1, 1],
    "jacket",
  ).rotation.x = Math.PI / 2;
  b(scarf, [0.07, 1.54, 0.24], [0.1, 0.23, 0.035], "trim");
  for (const id of ["sling-bag", "mini-pack", "animal-pack", "small-wings", "back-stars"]) {
    const g = accessory("back", id);
    if (id === "sling-bag") {
      ball(g, [0.26, 1.14, -0.24], [0.19, 0.2, 0.12], "backpack");
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(-0.26, 1.61, -0.16),
        new T.Vector3(-0.26, 1.57, 0.24),
        new T.Vector3(0.28, 1.1, 0.24),
        new T.Vector3(0.29, 1.11, -0.25),
        new T.Vector3(-0.26, 1.61, -0.16),
      ]);
      part(g, new T.TubeGeometry(curve, 24, 0.024, 5, false), [0, 0, 0], [1, 1, 1], "trim");
    }
    if (id === "mini-pack" || id === "animal-pack") {
      ball(g, [0, 1.32, -0.34], [0.23, 0.25, 0.15], "backpack");
      for (const s of [-1, 1]) {
        const c = new T.CatmullRomCurve3([
          new T.Vector3(s * 0.15, 1.48, -0.34),
          new T.Vector3(s * 0.26, 1.61, 0),
          new T.Vector3(s * 0.26, 1.21, 0.26),
          new T.Vector3(s * 0.15, 1.15, -0.34),
        ]);
        part(g, new T.TubeGeometry(c, 14, 0.025, 5, false), [0, 0, 0], [1, 1, 1], "backpack");
      }
      if (id === "mini-pack") b(g, [0, 1.23, -0.48], [0.24, 0.11, 0.03], "trim");
      else {
        for (const s of [-1, 1]) {
          ball(g, [s * 0.16, 1.53, -0.38], [0.075, 0.08, 0.055], "backpack");
          ball(g, [s * 0.08, 1.38, -0.48], [0.022, 0.025, 0.016], "eyes");
        }
        ball(g, [0, 1.28, -0.49], [0.09, 0.06, 0.035], "trim");
        ball(g, [0, 1.3, -0.525], [0.025, 0.019, 0.01], "eyes");
      }
    }
    if (id === "small-wings")
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const feather = ball(
            g,
            [s * (0.18 + i * 0.075), 1.35 + i * 0.035, -0.31],
            [0.085, 0.2 - i * 0.02, 0.04],
            "shirt",
          );
          feather.rotation.z = -s * (0.3 + i * 0.2);
        }
    if (id === "back-stars") {
      for (const s of [-1, 1]) {
        b(g, [s * 0.2, 1.44, -0.3], [0.02, 0.4, 0.025], "trim").rotation.z = -s * 0.45;
        star(g, [s * 0.3, 1.65, -0.32], 0.14);
      }
      star(g, [0, 1.33, -0.33], 0.17);
    }
  }
}
