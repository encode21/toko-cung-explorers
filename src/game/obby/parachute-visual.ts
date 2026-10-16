import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Object3D,
  Vector3,
  type InstancedMesh,
} from "three";

export const CANOPY_CELLS = 9;
export const CANOPY_CENTER_Y = 3.4;
const UP = new Vector3(0, 1, 0);

/** Inflated wing section: curved span, rounded leading edge and a quilted cell profile. */
export function canopyPoint(span: number, angle: number, inflation = 1): [number, number, number] {
  return [
    1.9 * span,
    CANOPY_CENTER_Y - 0.55 * span * span + 0.23 * Math.sin(angle) * inflation,
    -0.08 + 0.76 * Math.cos(angle),
  ];
}

export function createCanopyCell(cell: number) {
  const segments = 6,
    around = 16;
  const positions: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const span = -1 + (2 * (cell + t)) / CANOPY_CELLS;
    for (let j = 0; j <= around; j++)
      positions.push(
        ...canopyPoint(span, (j / around) * Math.PI * 2, 0.78 + 0.22 * Math.sin(t * Math.PI)),
      );
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j,
        b = a + around + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // Closed end ribs keep the underside solid, including when viewed from the ground.
  for (const end of [0, segments]) {
    const span = -1 + (2 * (cell + end / segments)) / CANOPY_CELLS;
    const center = positions.length / 3;
    positions.push(1.9 * span, CANOPY_CENTER_Y - 0.55 * span * span, -0.08);
    for (let j = 0; j < around; j++) {
      const a = end * (around + 1) + j;
      indices.push(center, end === 0 ? a : a + 1, end === 0 ? a + 1 : a);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Resolve the palm, including live animation, wardrobe scale and player heading. */
export function readParachuteGrip(
  character: Object3D,
  side: "Left" | "Right",
  space: Object3D,
  out: Vector3,
) {
  const palm = character.getObjectByName(`${side}Wrist_skin`);
  if (palm instanceof Mesh) {
    if (!palm.geometry.boundingBox) palm.geometry.computeBoundingBox();
    palm.geometry.boundingBox!.getCenter(out);
    palm.localToWorld(out);
  } else {
    const hand = character.getObjectByName(`${side}Hand`);
    if (!hand) return false;
    // Base-avatar hand geometry is centred 4 cm below the wrist joint.
    hand.localToWorld(out.set(0, -0.04, 0.007));
  }
  space.worldToLocal(out);
  return Number.isFinite(out.x) && Number.isFinite(out.y) && Number.isFinite(out.z);
}

/** Quaternion alignment avoids the old Euler yaw/pitch cord endpoint error. */
export function setParachuteSegment(
  mesh: InstancedMesh,
  index: number,
  from: Vector3,
  to: Vector3,
  width: number,
  depth: number,
  scratch: Object3D,
  direction: Vector3,
) {
  direction.subVectors(to, from);
  const length = direction.length();
  scratch.position.addVectors(from, to).multiplyScalar(0.5);
  scratch.quaternion.setFromUnitVectors(UP, direction.normalize());
  scratch.scale.set(width, Math.max(length, 0.0001), depth);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}
