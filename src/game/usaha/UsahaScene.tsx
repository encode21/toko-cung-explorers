/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { usahaOrigin, type UsahaKind, type UsahaSnapshot } from "./model";
import { useUsaha } from "./store";

const W = 6; // half width
const D = 5; // half depth
const WALL_H = 2.6; // low cutaway walls so the trailing camera sees inside
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

function shell(floorA: string, floorB: string, wall: string): AssetPart[] {
  const parts: AssetPart[] = [];
  for (let x = 0; x < 6; x++)
    for (let z = 0; z < 5; z++)
      parts.push(
        part(
          [-5 + x * 2, 0.01, -4 + z * 2],
          [1.98, 0.02, 1.98],
          (x + z) % 2 ? floorA : floorB,
          "box",
        ),
      );
  parts.push(
    part([0, WALL_H / 2, -D], [W * 2, WALL_H, 0.2], wall, "box"),
    part([-W, WALL_H / 2, 0], [0.2, WALL_H, D * 2], wall, "box"),
    part([W, WALL_H / 2, 0], [0.2, WALL_H, D * 2], wall, "box"),
    part([0, 0.03, D - 0.4], [2.2, 0.04, 0.9], "#6b8f4e", "box", "fabric"), // keset pintu keluar
  );
  return parts;
}

function wartegParts(data: UsahaSnapshot | null): AssetPart[] {
  const parts = shell("#efe3cc", "#f8f1e3", "#9ccbb5");
  // Etalase kaca + nampan lauk: one tray per cooked recipe, height = portions left.
  parts.push(
    part([0, 0.5, -3.2], [7, 1, 1.1], "#6d4c33", "bevel", "wood"),
    part([0, 1.25, -3.2], [7, 0.5, 1.1], "#cfeef7", "box", "glass"),
  );
  (data?.catalog.resep ?? []).forEach((r, i) => {
    const left = data?.warteg?.menu.find((m) => m.recipeId === r.id)?.portions ?? 0;
    if (left > 0)
      parts.push(
        part(
          [-2.6 + i * 1.75, 1.08, -3.2],
          [1.4, 0.06 + Math.min(left, 24) * 0.006, 0.8],
          r.color,
          "box",
        ),
      );
  });
  for (const x of [-3, 3]) {
    parts.push(
      part([x, 0.72, 0.6], [3.2, 0.08, 1.1], "#a77b52", "box", "wood"),
      part([x, 0.36, 0.6], [0.2, 0.72, 0.2], "#6b4a33", "box", "wood"),
      part([x, 0.4, -0.25], [3.2, 0.08, 0.35], "#8a5f3b", "box", "wood"),
      part([x, 0.4, 1.45], [3.2, 0.08, 0.35], "#8a5f3b", "box", "wood"),
    );
  }
  return parts;
}

function kosParts(data: UsahaSnapshot | null): AssetPart[] {
  const parts = shell("#d9d4cb", "#e6e1d8", "#f1d9a6");
  const rooms = data?.kos?.rooms ?? 4;
  const tenants = data?.kos?.tenants ?? 0;
  // Pintu kamar along the back and side walls; occupied rooms get a warm door + lamp.
  for (let i = 0; i < rooms; i++) {
    const back = i < 6;
    const x = back ? -5 + i * 2 : i % 2 ? W - 0.12 : -W + 0.12;
    const z = back ? -D + 0.12 : -2 + Math.floor((i - 6) / 2) * 2;
    const occupied = i < tenants;
    parts.push(
      part(
        [x, 1.05, z],
        back ? [1, 2.1, 0.08] : [0.08, 2.1, 1],
        occupied ? "#9b5d33" : "#c9c2b5",
        "box",
        "wood",
      ),
      part(
        [x, 2.3, z],
        back ? [0.5, 0.18, 0.1] : [0.1, 0.18, 0.5],
        occupied ? "#ffd36b" : "#7d7a73",
        "box",
      ),
    );
  }
  parts.push(
    part([0, 0.45, 1.6], [2.4, 0.9, 0.8], "#5e7f9b", "bevel", "fabric"), // sofa ruang tamu
    part([3.6, 0.4, 2.6], [1.2, 0.8, 0.7], "#b88a5a", "bevel", "wood"), // rak sepatu
  );
  return parts;
}

function Room({ kind }: { kind: UsahaKind }) {
  const data = useUsaha((s) => s.data);
  const parts = useMemo(
    () => (kind === "warteg" ? wartegParts(data) : kosParts(data)),
    [kind, data],
  );
  const [ox, oy, oz] = usahaOrigin(kind);
  return (
    <group position={[ox, oy, oz]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W, 0.1, D]} position={[0, -0.1, 0]} />
        <CuboidCollider args={[W, WALL_H, 0.1]} position={[0, WALL_H, -D]} />
        <CuboidCollider args={[0.1, WALL_H, D]} position={[-W, WALL_H, 0]} />
        <CuboidCollider args={[0.1, WALL_H, D]} position={[W, WALL_H, 0]} />
        {/* Invisible front wall: the room floats off the city grid. */}
        <CuboidCollider args={[W, WALL_H, 0.1]} position={[0, WALL_H, D + 0.1]} />
        {kind === "warteg" && <CuboidCollider args={[3.5, 0.9, 0.55]} position={[0, 0.9, -3.2]} />}
      </RigidBody>
      <StyledBatch items={parts} />
      <Text
        position={[0, WALL_H + 0.45, -D]}
        fontSize={0.5}
        color="#fff9e9"
        outlineWidth={0.03}
        outlineColor="#4b2a12"
      >
        {kind === "warteg" ? "WARTEG" : `KOS · ${data?.kos?.qualityName ?? ""}`}
      </Text>
    </group>
  );
}

/** Instance room for the player's warteg or kos; replaces the city scene while inside. */
export function UsahaScene() {
  const inside = useUsaha((s) => s.inside);
  return inside ? <Room kind={inside} /> : null;
}
