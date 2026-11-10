/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { Helipad } from "./Helicopter";
import { MOUNTAIN_HELIPAD, mountainGroundHeight, mountainWorldPoint } from "./model";
import { MountainCampfire, MountainTorch } from "./MountainFire";
import { MountainHikingGate } from "./MountainLandmarks";
import { MountainCampTent } from "./MountainCamps";
import { MountainCoast } from "./MountainCoast";
import { MountainOutfitStand } from "./MountainOutfitStand";
import { MountainLantern } from "./MountainLantern";

const wood = "#825c38",
  dark = "#4d3928";
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color = wood,
): OutdoorPart => ({ p, s, color });

function RangerShelter() {
  const frame = useMemo(
    () => [
      ...[-2.75, 2.75].flatMap((x) =>
        [-2.2, 2.2].map((z) => part([x, 1.55, z], [0.22, 3.1, 0.22], dark)),
      ),
      part([0, 2.85, 2.2], [5.8, 0.24, 0.2], dark),
      part([0, 2.85, -2.2], [5.8, 0.24, 0.2], dark),
      ...[-1.55, -1.15, -0.75, -0.35, 0.05].map((y) =>
        part([0, y + 1.75, -2.2], [5.5, 0.35, 0.12]),
      ),
      part([0, 0.85, -1], [3.9, 0.15, 0.85]),
      ...[-1.45, 1.45].map((x) => part([x, 0.42, -1], [0.15, 0.85, 0.65], dark)),
      part([-1.45, 0.36, 1], [1.8, 0.14, 0.5]),
      part([1.45, 0.36, 1], [1.8, 0.14, 0.5]),
    ],
    [],
  );
  return (
    <group
      position={mountainWorldPoint([379, 8, 74])}
      rotation-y={-Math.PI / 2}
      name="MountainRangerShelter"
    >
      <OutdoorBatch items={frame} />
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[side * 1.55, 3.45, 0]} rotation-z={-side * 0.36}>
          <boxGeometry args={[3.45, 0.14, 5.55]} />
          <meshStandardMaterial color="#4f6156" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 2.68, 2.32]}>
        <boxGeometry args={[4.4, 0.58, 0.1]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <Text position={[0, 2.69, 2.39]} fontSize={0.32} color="#f3ddb3">
        BASECAMP CUNG
      </Text>
      <RigidBody type="fixed" colliders={false}>
        {[-2.75, 2.75].flatMap((x) =>
          [-2.2, 2.2].map((z) => (
            <CuboidCollider key={`${x}:${z}`} args={[0.13, 1.55, 0.13]} position={[x, 1.55, z]} />
          )),
        )}
        <CuboidCollider args={[2.75, 0.95, 0.08]} position={[0, 0.95, -2.2]} />
        <CuboidCollider args={[1.95, 0.43, 0.43]} position={[0, 0.43, -1]} />
      </RigidBody>
    </group>
  );
}

/** Arrival camp sits on dry sand, with two sheltered piers over the southern coast. */
export function MountainBasecamp() {
  return (
    <group name="MountainBasecamp">
      <Helipad position={MOUNTAIN_HELIPAD.position} location="mountain" />
      <MountainCampfire position={mountainWorldPoint([344, 8, 68])} />
      <MountainCampTent position={mountainWorldPoint([349, 8, 78])} yaw={Math.PI} />
      <MountainCampTent position={mountainWorldPoint([369, 8, 78])} yaw={Math.PI} theme={1} />
      <MountainCampTent position={mountainWorldPoint([341, 8, 78])} yaw={Math.PI} theme={2} />
      <MountainCampTent position={mountainWorldPoint([377, 8, 78])} yaw={Math.PI} theme={0} />
      <RangerShelter />
      <MountainHikingGate />
      <MountainOutfitStand />
      <MountainCoast />
      {[
        [358, 50.6],
        [358, 57.4],
        [345, 50.6],
        [345, 57.4],
      ].map(([x, z]) => {
        const p = mountainWorldPoint([x!, 8, z!]);
        p[1] = mountainGroundHeight(p[0], p[2]);
        return <MountainLantern key={`${x}:${z}`} position={p} />;
      })}
      {[
        [339, 64],
        [349, 72],
        [373, 63],
        [380, 66],
        [356, 77],
      ].map(([x, z]) => {
        const p = mountainWorldPoint([x!, 8, z!]);
        p[1] = mountainGroundHeight(p[0], p[2]);
        return <MountainTorch key={`${x}:${z}`} position={p} />;
      })}
    </group>
  );
}
