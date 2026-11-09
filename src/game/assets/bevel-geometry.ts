import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

/** A unit prop box with smooth bevel normals, using 44 rather than 108 triangles. */
export function createBeveledBox(radius: number) {
  const corners: Vector3[] = [];
  for (let axis = 0; axis < 3; axis++)
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const signs = [x, y, z];
          corners.push(
            new Vector3(...signs.map((sign, i) => sign * (i === axis ? 0.5 : 0.5 - radius))),
          );
        }
  const positions: number[] = [],
    normals: number[] = [];
  // Six faces, twelve bevel strips and eight triangular corners.
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1]) {
        const axes = Math.abs(x) + Math.abs(y) + Math.abs(z);
        if (!axes) continue;
        const normal = new Vector3(x, y, z);
        const extent = 0.5 + (axes - 1) * (0.5 - radius);
        const face = corners.filter((v) => Math.abs(v.dot(normal) - extent) < 1e-6);
        const center = face.reduce((sum, v) => sum.add(v), new Vector3()).divideScalar(face.length);
        normal.normalize();
        const u = face[0]!.clone().sub(center).normalize();
        const v = normal.clone().cross(u);
        face.sort(
          (a, b) =>
            Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u)) -
            Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)),
        );
        for (let i = 1; i < face.length - 1; i++)
          for (const point of [face[0]!, face[i]!, face[i + 1]!]) {
            positions.push(...point.toArray());
            normals.push(
              ...point
                .toArray()
                .map((coordinate) => (Math.abs(coordinate) === 0.5 ? Math.sign(coordinate) : 0)),
            );
          }
      }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
