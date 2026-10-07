/** @jsxImportSource @/game/jsx */
import { TimedEmission, TimedPointLight } from "@/game/time/TimedFixtures";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "../OutdoorBatch";
import { useGame } from "@/state/game-store";
import { FLOORS, LIFT } from "./plan";

const structure: OutdoorPart[] = [];
const add = (p: OutdoorPart["p"], s: OutdoorPart["s"], color: string) =>
  structure.push({ p, s, color });
const gray = "#727f84",
  trim = "#d1dadd",
  red = "#bf303b",
  glass = "#304952";
// Opaque, inset window panels avoid transparency sorting and extra glass passes.
for (const floor of FLOORS.slice(1)) {
  const y = floor.base;
  add([0, y, -9.5], [18.5, 0.2, 25.5], trim);
  add([-9, y + 1.6, -9.5], [0.35, 3.2, 25], gray);
  add([9, y + 1.6, -9.5], [0.35, 3.2, 25], gray);
  add([0, y + 1.6, -22], [18, 3.2, 0.35], gray);
  add([0, y + 1.6, 2.96], [18, 3.2, 0.2], gray);
  for (const x of [-7.3, -2.5, 2.5, 7.3]) {
    add([x, y + 1.6, 3.09], [2.15, 2.55, 0.12], trim);
    add([x, y + 1.6, 3.17], [1.94, 2.35, 0.08], glass);
    add([x, y + 1.6, 3.23], [0.06, 2.35, 0.06], trim);
    add([x, y + 1.35, 3.23], [1.94, 0.06, 0.06], trim);
  }
  // Reserved service core aligns vertically with the ground-floor lift.
  add([LIFT[0], y + 1.5, LIFT[2]], [2.5, 3, 2.5], "#59656b");
}
// Lightweight interior kits retained behind the sealed facade for future fit-out.
for (const x of [-5, 0, 5]) {
  add([x, 4.2, -5], [2, 0.15, 1], "#c6b090"); // service desks
  add([x, 3.8, -5], [0.25, 0.7, 0.6], gray);
  add([x, 7.5, -15], [2.4, 1.2, 1.6], "#ae8c5f"); // pallet stock
  add([x, 7, -15], [2.6, 0.15, 1.8], "#685744");
}
add([0, 7.7, -8], [4, 0.15, 1.5], "#c6b090"); // packing worktop
for (const x of [-4.9, 4.9]) add([x, 6.8, 3.3], [1.5, 6.8, 0.48], red);
add([0, 6.8, 3.29], [0.35, 6.8, 0.45], red);
for (const x of [-9.15, 9.15]) add([x, 5.2, 3.26], [0.4, 10.4, 0.6], trim);
add([0, 10.25, -9.5], [18.7, 0.35, 25.7], trim);
add([0, 10.55, 3.12], [18.7, 0.45, 0.45], gray);
add([0, 9.65, 3.62], [10, 1.3, 0.25], "#26383e");

const canopy: OutdoorPart[] = [
  { p: [0, 3.05, 4.65], s: [18.8, 0.16, 3.8], color: "#cbd2cf" },
  { p: [0, 3.03, 6.55], s: [18.8, 0.25, 0.14], color: red },
];
for (let x = -9; x <= 9; x += 0.6)
  canopy.push({ p: [x, 3.15, 4.65], s: [0.035, 0.045, 3.8], color: "#edf0e9" });
for (const x of [-8.6, 8.6])
  canopy.push({ p: [x, 1.5, 6.1], s: [0.16, 3, 0.16], color: "#44545a" });

/** Exterior cutaway follows existing indoor camera behavior; physics remains stable. */
export function ThreeFloorBuilding() {
  const inside = useGame((s) => s.inside);
  return (
    <group name="TokoCung-ThreeFloorShell">
      <TimedPointLight position={[0, 2.75, 4.4]} intensity={12} distance={10} />
      <group visible={!inside} name="UpperFloors" userData={{ ignoreCameraCollision: true }}>
        <OutdoorBatch items={structure} />
        <Text position={[0, 9.68, 3.78]} fontSize={0.78} letterSpacing={0.06} color="#fff9ef">
          TOKO CUNG
          <TimedEmission sign />
        </Text>
        <Text position={[0, 8.9, 3.65]} fontSize={0.2} color="#fff9ef">
          GROSIR & RETAIL · TOKO CUNG
        </Text>
      </group>
      <group visible={!inside} name="StorefrontCanopy" userData={{ ignoreCameraCollision: true }}>
        <OutdoorBatch items={canopy} />
        <Text position={[0, 3.04, 6.64]} fontSize={0.15} color="#ffffff">
          TOKO CUNG · SELAMAT DATANG
        </Text>
      </group>
      <RigidBody type="fixed" colliders={false}>
        {/* Unreleased floors are sealed volumes, not traversable empty shells. */}
        <CuboidCollider args={[9, 3.6, 12.5]} position={[0, 6.9, -9.5]} />
        {[-8.6, 8.6].map((x) => (
          <CuboidCollider key={x} args={[0.08, 1.5, 0.08]} position={[x, 1.5, 6.1]} />
        ))}
      </RigidBody>
    </group>
  );
}
