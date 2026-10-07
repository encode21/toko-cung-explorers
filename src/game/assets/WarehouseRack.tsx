/** @jsxImportSource @/game/jsx */
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StyledBatch } from "./StyledBatch";
import type { AssetPart } from "./parts";

const parts: AssetPart[] = [];
for (const x of [-1.04, 1.04])
  for (const z of [-0.29, 0.29])
    parts.push({ p: [x, 1.2, z], s: [0.065, 2.4, 0.065], color: "#637b81", finish: "metal" });
for (const y of [0.15, 0.88, 1.62, 2.34])
  parts.push({ p: [0, y, 0], s: [2.18, 0.07, 0.65], color: "#a8b8b6", finish: "metal" });
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 3; col++) {
    const x = -0.72 + col * 0.72,
      base = 0.2 + row * 0.735,
      h = 0.35 + ((row + col) % 2) * 0.15;
    parts.push({
      p: [x, base + h / 2, 0],
      s: [0.59, h, 0.5],
      color: (row + col) % 2 ? "#c4a984" : "#bba07a",
      finish: "cardboard",
    });
    parts.push({
      p: [x, base + h / 2, 0.255],
      s: [0.16, 0.1, 0.009],
      color: "#f1eddf",
      shape: "box",
      finish: "cardboard",
    });
  }
/** Fixed-width rack replaces oversized normalized bookcases without moving stock anchors. */
export function WarehouseRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="warehouse-stock-rack">
      <StyledBatch items={parts} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.1, 1.2, 0.34]} position={[0, 1.2, 0]} />
      </RigidBody>
    </group>
  );
}
