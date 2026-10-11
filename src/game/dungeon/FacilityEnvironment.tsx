/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { InstancedMesh, Object3D } from "three";

type Vec = [number, number, number];
type Fitting = { p: Vec; s: Vec; color: string; yaw: number };
const fittings: Fitting[] = [];
const solids: { p: Vec; s: Vec }[] = [];
const ink = "#263f48",
  teal = "#3c7777",
  wood = "#b68d60",
  cream = "#ddd1ad";
function box(p: Vec, s: Vec, color = ink, yaw = 0) {
  fittings.push({ p, s, color, yaw });
}
function solid(p: Vec, s: Vec, color = ink) {
  box(p, s, color);
  solids.push({ p, s });
}
function carton(x: number, y: number, z: number, scale = 1) {
  box([x, y + scale * 0.4, z], [scale, scale * 0.8, scale * 0.8], wood);
  box([x, y + scale * 0.805, z], [scale * 0.15, 0.015, scale * 0.81], cream);
  box([x, y + scale * 0.42, z + scale * 0.405], [scale * 0.3, scale * 0.2, 0.016], cream);
}
function pallet(x: number, z: number, stacked = true) {
  for (const dz of [-0.55, 0.55]) box([x, 0.1, z + dz], [1.9, 0.2, 0.2], "#715b43");
  for (let n = 0; n < 5; n++) box([x - 0.8 + n * 0.4, 0.25, z], [0.32, 0.12, 1.6], wood);
  if (stacked) {
    carton(x - 0.45, 0.31, z, 0.8);
    carton(x + 0.45, 0.31, z, 0.8);
    carton(x, 0.95, z, 0.9);
    solids.push({ p: [x, 0.85, z], s: [1.9, 1.7, 1.6] });
  } else solids.push({ p: [x, 0.15, z], s: [1.9, 0.3, 1.6] });
}
function cabinet(x: number, y: number, z: number, color = teal) {
  solid([x, y + 1.05, z], [1.4, 2.1, 0.65], color);
  for (const dy of [0.4, 1, 1.6]) {
    box([x, y + dy, z + 0.34], [1.22, 0.5, 0.03], "#71817c");
    box([x, y + dy + 0.1, z + 0.38], [0.3, 0.045, 0.04], cream);
  }
}
function trolley(x: number, z: number) {
  solid([x, 0.3, z], [1.2, 0.2, 1.6], teal);
  for (const dx of [-0.5, 0.5]) {
    box([x + dx, 0.85, z - 0.7], [0.07, 1.1, 0.07]);
    for (const dz of [-0.55, 0.55]) box([x + dx, 0.13, z + dz], [0.16, 0.24, 0.24], "#252d31");
  }
  box([x, 1.4, z - 0.7], [1.1, 0.08, 0.08]);
  carton(x, 0.41, z, 0.85);
  solids.push({ p: [x, 0.8, z], s: [1.2, 1.6, 1.6] });
}
function portal(x: number, y: number, z: number, width: number, color: string) {
  for (const side of [-1, 1]) box([x + (side * width) / 2, y + 1.75, z], [0.18, 3.5, 0.35], color);
  box([x, y + 3.5, z], [width + 0.18, 0.35, 0.35], color);
}
function rail(x: number, z: number, length: number, alongZ = false) {
  const s: Vec = alongZ ? [0.08, 0.08, length] : [length, 0.08, 0.08];
  for (const y of [4.12, 4.55, 5.05]) box([x, y, z], s, "#d8a951");
  for (let d = -length / 2; d <= length / 2 + 0.01; d += 1.5) {
    box([x + (alongZ ? 0 : d), 4.55, z + (alongZ ? d : 0)], [0.09, 1.1, 0.09], ink);
  }
}

// Structural rhythm, a clerestory band and exposed roof trusses keep the camera open
// while giving the facility a consistent scale. No lights/shadows per individual prop.
for (const x of [-17.65, 17.65]) {
  box([x, 1, 0], [0.12, 2, 35.5], "#31565e");
  box([x, 3.75, 0], [0.16, 0.18, 35.5], teal);
  for (const z of [-15, -7, 1, 11]) {
    solid([x, 4, z], [0.4, 8, 0.45], ink);
    box([x, 6.65, z + 2.8], [0.16, 1.3, 3.5], "#91acac");
  }
}
for (const z of [-14, -4, 6]) {
  box([0, 7.95, z], [35.4, 0.25, 0.24]);
  box([0, 7.15, z], [35.4, 0.12, 0.18]);
  for (let x = -16; x <= 16; x += 4) box([x, 7.55, z], [0.12, 0.8, 0.16], teal);
}
box([0, 1, -17.77], [35.5, 2, 0.12], "#31565e");
box([0, 3.75, -17.76], [35.5, 0.18, 0.12], teal);
// Reception: wood slat counter, canopy, bench and a framed mission board.
box([-10, 1.08, 11.6], [4.3, 0.16, 1.4], "#ddd1ad");
for (let x = -11.8; x <= -8.2; x += 0.24) box([x, 0.5, 12.22], [0.09, 0.8, 0.055], "#735638");
box([-10, 3.65, 5], [7.5, 0.22, 1.8], teal);
solid([-16.8, 0.5, 9], [1.1, 0.25, 3.2], wood);
box([-17.23, 1, 9], [0.16, 1.2, 3.2], teal);
for (const z of [7.7, 10.3]) box([-16.8, 0.22, z], [0.75, 0.4, 0.18]);
for (const x of [-16.9, -13.1]) box([x, 1.7, 4.32], [0.12, 1.5, 0.08], cream);
for (const y of [0.96, 2.44]) box([-15, y, 4.32], [3.9, 0.1, 0.08], cream);
for (const x of [-16, -15, -14]) {
  box([x, 2.02, 4.325], [0.55, 0.16, 0.02], x === -15 ? teal : "#be8756");
  for (const y of [1.45, 1.6, 1.75]) box([x, y, 4.33], [0.38, 0.025, 0.015], "#8d8b79");
}
// Dog-leg entry to storage remains 3m wide; door frames never cross its opening.
for (const z of [-5, -2]) box([-3.8, 1.75, z], [0.35, 3.5, 0.18], teal);
box([-3.8, 3.5, -3.5], [0.35, 0.35, 3.18], teal);
// Inventory dressing sits against existing racks/outer walls, leaving both aisles open.
for (const [x, z] of [
  [-16, 1],
  [-6.5, -16],
  [-16.4, -10],
] as const)
  pallet(x, z);
for (const [x, z] of [
  [-15, -4],
  [-10, -4],
  [-6, -9],
] as const) {
  for (const y of [0.85, 2.05, 3.25]) {
    for (const dz of [-1.35, 0, 1.35]) {
      box([x + 0.82, y + 0.4, z + dz], [0.02, 0.18, 0.3], cream);
      box([x, y + 0.815, z + dz], [0.16, 0.02, 1.05], "#d0ba8d");
    }
  }
}
trolley(-6.5, 1.5);
// A return screen hides the label alcove from the main corridor, accessible from both ends.
solid([-11.3, 1.2, -9.5], [0.16, 2.4, 2.5], "#6e7b6c");
cabinet(-13, 0, -10.7, "#6e7b6c");
// B-07 has aged archive fittings, no directional sign or exact secret marker.
cabinet(-16.6, 0, -16.6, "#777264");
cabinet(-11.4, 0, -16.6, "#777264");
box([-14, 0.025, -14.9], [5.5, 0.025, 4.4], "#555b54");
box([-14, 1.1, -14.8], [2.3, 0.12, 0.75], wood);
for (const x of [-15, -13]) box([x, 0.53, -14.8], [0.12, 1.06, 0.6]);
// Dispatch: staging stacks, mobile cart, pallet jack and packing work area.
pallet(16, 13);
pallet(16, 16);
pallet(3, 16, false);
trolley(5, 9);
for (const x of [4.1, 13.9]) {
  solid([x, 0.65, 17], [0.25, 1.3, 0.25], "#dbb35e");
  box([x, 0.85, 17], [0.27, 0.17, 0.27]);
}
for (const x of [2.5, 3.3]) box([x, 0.15, 12], [0.2, 0.18, 1.8], "#bd8b43");
solid([2.9, 0.35, 11.2], [1.1, 0.6, 0.5], "#bd8b43");
box([2.9, 1.05, 11.05], [0.12, 1.1, 0.12]);
box([2.9, 1.58, 11.05], [0.7, 0.1, 0.12]);
// Packing room beneath mezzanine; entrance and central circulation remain clear.
solid([5.5, 1.8, -11.5], [0.2, 3.6, 10], "#587578");
solid([8, 1.8, -6.5], [5, 3.6, 0.2], "#587578");
portal(12.1, 0, -6.5, 3.2, teal);
pallet(15.5, -14);
trolley(15.5, -9);
box([8, 1.03, -10.5], [3.15, 0.1, 1.3], cream);
// Mezzanine fascia, support columns and open rails replace the solid gold parapet.
box([7.5, 3.65, -1], [19.1, 0.5, 0.15], teal);
for (const x of [-1.7, 5.5, 16.8]) solid([x, 1.8, -1.2], [0.28, 3.6, 0.28]);
rail(6, -2, 12);
rail(-2, 1, 6, true);
rail(0.8, 1, 6, true);
rail(-0.6, 4, 2.8);
solids.push({ p: [-0.6, 4.55, 4], s: [2.8, 1.1, 0.1] });
box([-0.6, 3.65, 1], [2.95, 0.3, 6], teal);
for (const z of [-1, 0, 1, 2, 3]) box([-0.6, 4.015, z], [2.5, 0.016, 0.035], "#a0aba4");
// Offices: portal headers, warm floor inset, drawers and archive folders.
portal(7, 4, -6, 2.5, "#bd9869");
portal(13.5, 4, -6, 4, "#bd9869");
box([8, 4.012, -12], [4.7, 0.02, 10], "#817862");
box([1.8, 4.012, -12], [6.3, 0.02, 10], "#70796c");
for (const x of [1, 3, 10, 12]) cabinet(x, 4, -16.6, "#6e7b6c");
for (const x of [1, 3, 10, 12])
  for (let n = 0; n < 5; n++) {
    box([x - 0.45 + n * 0.22, 6.38, -16.6], [0.17, 0.48, 0.38], n % 2 ? cream : teal);
  }
// Tables surround the existing server interaction positions; no quest-specific triggers.
for (const [x, y, z] of [
  [8, 4, -9.8],
  [2, 4, -10.8],
  [-13, 0, -9.8],
  [10, 0, 7.2],
  [8, 0, 12.2],
] as const) {
  box([x, y + 1.06, z], [1.6, 0.12, 0.8], wood);
  for (const dx of [-0.65, 0.65]) box([x + dx, y + 0.5, z], [0.1, 1, 0.6]);
  box([x + 0.53, y + 1.16, z], [0.32, 0.09, 0.42], cream);
  box([x - 0.55, y + 1.22, z - 0.17], [0.25, 0.22, 0.2], teal);
}
const batches = Array.from(new Set(fittings.map((f) => f.color))).map((color) => ({
  color,
  items: fittings.filter((f) => f.color === color),
}));
function FittingBatch({ color, items }: { color: string; items: Fitting[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new Object3D();
    items.forEach((item, n) => {
      transform.position.set(...item.p);
      transform.scale.set(...item.s);
      transform.rotation.set(0, item.yaw, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(n, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.88} />
    </instancedMesh>
  );
}
function Plaque({
  p,
  text,
  color = teal,
  yaw = 0,
}: {
  p: Vec;
  text: string;
  color?: string;
  yaw?: number;
}) {
  return (
    <group position={p} rotation-y={yaw}>
      <mesh>
        <boxGeometry args={[3, 0.52, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 0, 0.05]} fontSize={0.18} color="#efe1bd" maxWidth={2.8}>
        {text}
      </Text>
    </group>
  );
}
export function FacilityEnvironment() {
  return (
    <group>
      {batches.map((batch) => (
        <FittingBatch key={batch.color} {...batch} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {solids.map((s, n) => (
          <CuboidCollider key={n} position={s.p} args={[s.s[0] / 2, s.s[1] / 2, s.s[2] / 2]} />
        ))}
      </RigidBody>
      <Plaque p={[-10, 3.25, 4.23]} text="01 / PENERIMAAN" />
      <Plaque p={[-3.77, 3.15, -3.5]} yaw={Math.PI / 2} text="B / INVENTORY" />
      <Plaque p={[8, 6.85, -5.84]} text="02 / KOORDINATOR" color="#826c50" />
      <Plaque p={[2, 6.85, -5.84]} text="ARSIP / ADMINISTRASI" color="#826c50" />
      <Plaque p={[8, 3.05, -6.34]} text="PACKING / QUALITY CHECK" />
      <Plaque p={[9, 4.8, 17.55]} yaw={Math.PI} text="03 / DISPATCH" color="#826c50" />
      {([
        [4, 15],
        [14.5, 15.5],
        [-5.5, 3],
      ] as const).map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.055, 0]}>
            <boxGeometry args={[0.48, 0.11, 0.48]} />
            <meshStandardMaterial color={ink} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <coneGeometry args={[0.2, 0.65, 4]} />
            <meshStandardMaterial color="#c58144" />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.095, 0.135, 0.12, 4]} />
            <meshStandardMaterial color={cream} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
