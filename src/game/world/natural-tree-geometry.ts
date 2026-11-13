import * as THREE from "three";

function geometryFrom(vertices: number[], colors?: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  if (colors) g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Needle sprays on each branch leave small windows of sky, not solid conical sheets. */
export function naturalPineGeometry() {
  const vertices: number[] = [],
    colors: number[] = [];
  for (let tier = 0; tier < 8; tier++) {
    const y = 1.8 + tier * 0.72,
      radius = 2.35 * (1 - tier * 0.105);
    for (let arm = 0; arm < 9; arm++) {
      const a = (arm * Math.PI * 2) / 9 + tier * 0.61;
      const point = (t: number, w: number, h: number) => [
        Math.sin(a) * radius * t + Math.cos(a) * w,
        y + (1 - t) * 0.7 - t * 0.28 + h,
        Math.cos(a) * radius * t - Math.sin(a) * w,
      ];
      for (let leaf = 0; leaf < 9; leaf++) {
        const t = 0.08 + leaf * 0.1,
          length = (1 - t) * radius * 0.44 + 0.06;
        for (const side of [-1, 1]) {
          vertices.push(
            ...point(t, 0, 0),
            ...point(t + 0.16, length * side, -0.08),
            ...point(t + 0.1, length * 0.2 * side, 0.035),
          );
          vertices.push(
            ...point(t, 0, 0.015),
            ...point(t + 0.1, length * 0.2 * side, 0.035),
            ...point(t + 0.07, length * side, 0.1),
          );
          const shade = 0.68 + leaf * 0.03 + (arm % 3) * 0.04;
          for (let n = 0; n < 6; n++) colors.push(shade * 0.9, shade, shade * 0.74);
        }
      }
    }
  }
  return geometryFrom(vertices, colors);
}

/** Small folded leaves form overlapping branchlets and a broken, translucent-looking silhouette. */
export function naturalBroadleafGeometry() {
  const vertices: number[] = [],
    colors: number[] = [];
  for (let tier = 0; tier < 4; tier++)
    for (let branch = 0; branch < 7; branch++) {
      const a = branch * 2.399 + tier * 0.9,
        radius = (1 - Math.abs(tier - 1.2) * 0.18) * 2.3;
      for (let leaf = 0; leaf < 14; leaf++) {
        const t = 0.25 + (leaf % 7) * 0.12 + Math.sin(leaf * 1.7 + branch) * 0.04,
          side = leaf < 7 ? -1 : 1;
        const x = Math.sin(a) * radius * t + Math.cos(a) * side * 0.37;
        const z = Math.cos(a) * radius * t - Math.sin(a) * side * 0.37;
        const y = 3.6 + tier * 0.78 + Math.sin(t * Math.PI) * 0.33 + (leaf % 3) * 0.15;
        const yaw = a + side * 0.7 + Math.sin(leaf * 2.1 + tier) * 0.55,
          length = 0.14 + (leaf % 3) * 0.033,
          width = length * (0.34 + (leaf % 4) * 0.045),
          tilt = Math.sin(leaf * 2.7 + branch) * 0.7;
        const leafPoint = (u: number, v: number, h: number) => [
          x + Math.sin(yaw) * u + Math.cos(yaw) * v,
          y + h * 0.55 + u * tilt,
          z + Math.cos(yaw) * u - Math.sin(yaw) * v,
        ];
        vertices.push(
          ...leafPoint(-length, 0, 0),
          ...leafPoint(0, -width, -0.055),
          ...leafPoint(0, 0, 0.07),
          ...leafPoint(0, -width, -0.055),
          ...leafPoint(length, 0, 0),
          ...leafPoint(0, 0, 0.07),
          ...leafPoint(length, 0, 0),
          ...leafPoint(0, width, -0.055),
          ...leafPoint(0, 0, 0.07),
          ...leafPoint(0, width, -0.055),
          ...leafPoint(-length, 0, 0),
          ...leafPoint(0, 0, 0.07),
        );
        const shade = 0.72 + (leaf % 4) * 0.08;
        for (let n = 0; n < 12; n++) colors.push(shade * 0.95, shade, shade * 0.77);
      }
    }
  return geometryFrom(vertices, colors);
}
