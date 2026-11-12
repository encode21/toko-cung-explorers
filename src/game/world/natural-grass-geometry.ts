import * as THREE from "three";

/** The same bent, vertex-colored blades for Gunung Cung and city planting. No alpha overdraw. */
export function grassGeometry() {
  const vertices: number[] = [],
    colors: number[] = [];
  for (let blade = 0; blade < 11; blade++) {
    const a = blade * 2.399,
      r = 0.17 + (blade % 4) * 0.13;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = 0.65 + (blade % 3) * 0.17;
    const wx = Math.cos(a + 1.2) * 0.047,
      wz = Math.sin(a + 1.2) * 0.047;
    const tipX = x + Math.cos(a) * 0.31,
      tipZ = z + Math.sin(a) * 0.31;
    vertices.push(
      x - wx,
      0,
      z - wz,
      x + wx,
      0,
      z + wz,
      x + wx * 0.6,
      h * 0.6,
      z + wz * 0.6,
      x - wx,
      0,
      z - wz,
      x + wx * 0.6,
      h * 0.6,
      z + wz * 0.6,
      x - wx * 0.6,
      h * 0.6,
      z - wz * 0.6,
      x - wx * 0.6,
      h * 0.6,
      z - wz * 0.6,
      x + wx * 0.6,
      h * 0.6,
      z + wz * 0.6,
      tipX,
      h,
      tipZ,
    );
    for (const t of [0, 0, 0.6, 0, 0.6, 0.6, 0.6, 0.6, 1])
      colors.push(0.42 + t * 0.43, 0.62 + t * 0.32, 0.22 + t * 0.23);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
