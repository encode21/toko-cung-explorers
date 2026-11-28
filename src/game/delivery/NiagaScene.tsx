/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import {
  NIAGA_COUNTER_LOCAL,
  NIAGA_DISPLAY,
  NIAGA_EXIT_LOCAL,
  NIAGA_NAME,
  NIAGA_ROOM,
} from "./niaga";

const W = NIAGA_ROOM.halfWidth;
const D = NIAGA_ROOM.halfDepth;
const WALL_H = 2.6; // dinding rendah supaya kamera belakang tetap melihat ke dalam
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "box",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

const [cx, , cz] = NIAGA_COUNTER_LOCAL;
const PARTS: AssetPart[] = [
  part([0, 0.01, 0], [W * 2, 0.02, D * 2], "#d9dcd8", "box", "concrete"),
  part([0, WALL_H / 2, -D], [W * 2, WALL_H, 0.2], "#3f6b52"),
  part([-W, WALL_H / 2, 0], [0.2, WALL_H, D * 2], "#e8e4da"),
  part([W, WALL_H / 2, 0], [0.2, WALL_H, D * 2], "#e8e4da"),
  // Panggung pamer per unit
  ...NIAGA_DISPLAY.map((v) =>
    part([v.x, 0.06, v.z], [4.4, 0.12, 7.2], "#2c3339", "bevel", "metal"),
  ),
  // Meja sales + kursi
  part([cx, 0.5, cz], [3.4, 1, 0.9], "#f1c445", "bevel", "wood"),
  part([cx, 1.02, cz], [3.5, 0.06, 1], "#2c3339", "box", "metal"),
  part([cx, 0.45, cz - 1.1], [0.6, 0.9, 0.6], "#3a2d28", "bevel", "fabric"),
  // Keset pintu keluar
  part(
    [NIAGA_EXIT_LOCAL[0], 0.03, NIAGA_EXIT_LOCAL[2]],
    [2.4, 0.04, 1],
    "#6b8f4e",
    "box",
    "fabric",
  ),
];

/** Ruang pamer Cung Niaga; dimount sebagai scene sendiri saat pemain berada di ruangan. */
export function NiagaScene() {
  const [ox, oy, oz] = NIAGA_ROOM.origin;
  return (
    <group position={[ox, oy, oz]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W, 0.1, D]} position={[0, -0.1, 0]} />
        <CuboidCollider args={[W, WALL_H, 0.1]} position={[0, WALL_H, -D]} />
        <CuboidCollider args={[0.1, WALL_H, D]} position={[-W, WALL_H, 0]} />
        <CuboidCollider args={[0.1, WALL_H, D]} position={[W, WALL_H, 0]} />
        {/* Dinding depan tak terlihat: ruangan mengapung di luar grid kota. */}
        <CuboidCollider args={[W, WALL_H, 0.1]} position={[0, WALL_H, D + 0.1]} />
        <CuboidCollider args={[1.75, 0.55, 0.5]} position={[cx, 0.55, cz]} />
        {NIAGA_DISPLAY.map((v) => (
          <CuboidCollider key={v.kind} args={[1.3, 1, 3.2]} position={[v.x, 1, v.z]} />
        ))}
      </RigidBody>
      <StyledBatch items={PARTS} />
      {NIAGA_DISPLAY.map((v) => (
        <group key={v.kind} position={[v.x, 0.12, v.z]}>
          <VehicleModel kind={v.kind} color={v.color} emptyBed />
        </group>
      ))}
      <Text
        position={[0, WALL_H + 0.45, -D]}
        fontSize={0.55}
        color="#fff9e9"
        outlineWidth={0.03}
        outlineColor="#1f3a2b"
      >
        {NIAGA_NAME.toUpperCase()}
      </Text>
      <Text position={[cx, 1.35, cz + 0.52]} fontSize={0.2} color="#2c3339">
        SALES · KATALOG
      </Text>
    </group>
  );
}
