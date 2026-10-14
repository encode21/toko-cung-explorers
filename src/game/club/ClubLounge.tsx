/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { CLUB_UPPER_Y as H, LOUNGE_SEATS, VENUE_FLOOR } from "./venue-layout";
const box = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
): AssetPart => ({ p, s, color, finish: "paint" });
const decks: AssetPart[] = [
  box([0, H - 0.15, 9], [22, 0.3, 4], "#40394f"),
  box([-8.5, H - 0.15, 1.5], [5, 0.3, 11], "#40394f"),
  ...[-10.5, -5.5, 5.5, 10.5].map((x) => box([x, 1.65, 10], [0.16, 3.3, 0.16], "#9a8071")),
  ...Array.from({ length: 18 }, (_, i) =>
    box(
      [9, ((i + 0.5) * H) / 18, -2 + (i + 0.5) * 0.5],
      [2.4, 0.09, 0.5],
      i % 2 ? "#707187" : "#575b70",
    ),
  ),
];
// Top-floor railings leave the stair landing and the west balcony connection open.
const rails: { p: [number, number, number]; s: [number, number, number] }[] = [
  { p: [0.5, H + 0.55, 10.65], s: [20.7, 1.1, 0.12] },
  { p: [0.8, H + 0.55, 7], s: [13.6, 1.1, 0.12] },
  { p: [-6, H + 0.55, 1.5], s: [0.12, 1.1, 11] },
  { p: [-8.5, H + 0.55, -4], s: [5, 1.1, 0.12] },
  { p: [-10.8, H + 0.55, 1.5], s: [0.12, 1.1, 18] },
  { p: [10.8, H + 0.55, 9], s: [0.12, 1.1, 3.3] },
];
const railParts: AssetPart[] = rails.flatMap(({ p, s }) => [
  box([p[0], H + 1.05, p[2]], [s[0], 0.09, s[2]], "#e3b97e"),
  box([p[0], H + 0.35, p[2]], [s[0], 0.06, s[2]], "#9d8ba8"),
  ...[-0.5, 0, 0.5].map((t) =>
    box(
      [p[0] + (s[0] > 0.2 ? t * s[0] : 0), H + 0.55, p[2] + (s[2] > 0.2 ? t * s[2] : 0)],
      [0.08, 1.1, 0.08],
      "#9d8ba8",
    ),
  ),
]);
export function ClubLounge() {
  return (
    <group name="ClubTwoFloors">
      <StyledBatch items={[...decks, ...railParts]} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[11, 0.15, 2]} position={[0, H - 0.15, 9]} />
        <CuboidCollider args={[2.5, 0.15, 5.5]} position={[-8.5, H - 0.15, 1.5]} />
        {rails.map(({ p, s }, i) => (
          <CuboidCollider key={i} position={p} args={[s[0] / 2, s[1] / 2, s[2] / 2]} />
        ))}
      </RigidBody>
      {/* Smooth physics under the individual treads avoids mobile capsules snagging on risers. */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[9, H / 2 - 0.065, 2.5]}
        rotation={[-Math.atan(H / 9), 0, 0]}
      >
        <mesh name="ClubStairRamp">
          <boxGeometry args={[2.4, 0.12, Math.hypot(9, H)]} />
          <meshStandardMaterial color="#45465c" />
        </mesh>
      </RigidBody>
      {[7.7, 10.3].map((x) => (
        <RigidBody
          key={x}
          type="fixed"
          colliders="cuboid"
          position={[x, H / 2 + 0.65, 2.5]}
          rotation={[-Math.atan(H / 9), 0, 0]}
        >
          <mesh>
            <boxGeometry args={[0.09, 0.7, Math.hypot(9, H)]} />
            <meshStandardMaterial color="#987b85" />
          </mesh>
        </RigidBody>
      ))}
      {LOUNGE_SEATS.map((seat) => {
        const sofa = seat.style === "sofa",
          stool = seat.style === "stool";
        const width = sofa ? 1.8 : 0.6,
          depth = sofa ? 0.85 : 0.6,
          h = seat.seatHeight;
        return (
          <group
            key={seat.id}
            position={[seat.position[0], seat.position[1] - VENUE_FLOOR, seat.position[2]]}
            rotation-y={seat.yaw}
          >
            <StyledBatch
              items={[
                box([0, h - 0.07, 0], [width, 0.14, depth], stool ? "#c08a65" : "#a1697b"),
                box(
                  [0, (h - 0.14) / 2, 0],
                  [stool ? 0.12 : width * 0.8, h - 0.14, stool ? 0.12 : depth * 0.75],
                  "#353345",
                ),
                ...(stool
                  ? []
                  : [box([0, h + 0.32, -depth / 2 + 0.06], [width, 0.6, 0.12], "#b8888d")]),
              ]}
            />
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider position={[0, h / 2, 0]} args={[width / 2, h / 2, depth / 2]} />
            </RigidBody>
          </group>
        );
      })}
      <pointLight
        position={[-7, 5.2, 5]}
        intensity={30}
        distance={15}
        color="#ffdbab"
        castShadow={false}
      />
      <Text position={[9, 2.3, -2.1]} fontSize={0.2} color="#f9d69a">
        BALKON ↑
      </Text>
      <Text position={[0, H + 1.4, 10.6]} fontSize={0.26} color="#f9d69a">
        LOUNGE · LANTAI 2
      </Text>
    </group>
  );
}
