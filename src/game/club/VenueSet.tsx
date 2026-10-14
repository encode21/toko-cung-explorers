/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { LOW_QUALITY } from "@/game/engine/quality";
import { clubNow, useClub } from "./store";
import { CONCERT_CENTER as C, CONCERT_SEATS } from "./venue-layout";
const p = (p: [number, number, number], s: [number, number, number], color: string): AssetPart => ({
  p,
  s,
  color,
  shape: "box",
  finish: "paint",
});
const clubDetails: AssetPart[] = [
  // DJ stage border, truss, acoustic panels and warm lounge accents.
  p([0, 0.07, -7.5], [8, 0.14, 4], "#191b29"),
  p([0, 4.6, -7.5], [10, 0.22, 0.25], "#8b93a3"),
  ...[-1, 1].flatMap((side) => [
    p([side * 5, 2.3, -7.5], [0.22, 4.6, 0.25], "#8b93a3"),
    p([side * 4.8, 0.04, 0], [0.07, 0.05, 9], "#53c5d2"),
    ...[-7, -3, 1, 5].map((z) => p([side * 11.7, 2.8, z], [0.15, 2.5, 2], "#1d2133")),
    p([side * 10.8, 0.1, 0], [0.08, 0.15, 16], "#ebbd72"),
  ]),
  // Bar has a clear customer side at z=-6.
  p([-8.3, 0.55, -7.7], [4.5, 1.1, 1.1], "#533c35"),
  p([-8.3, 1.15, -7.7], [4.8, 0.12, 1.35], "#d5ac74"),
  p([-8.3, 2.3, -10.5], [4.5, 0.12, 0.6], "#b78658"),
  ...Array.from({ length: 8 }, (_, i) =>
    p([-10 + i * 0.48, 2.55, -10.5], [0.16, 0.45, 0.16], i % 2 ? "#e7a94b" : "#65b9a3"),
  ),
];
const concertParts: AssetPart[] = [
  // Backline and microphone make the community stage usable for performances.
  p([C, 1.3, -8.5], [0.045, 1.8, 0.045], "#9da9b6"),
  p([C, 2.2, -8.35], [0.08, 0.08, 0.35], "#202532"),
  p([C, 0.44, -8.5], [0.6, 0.06, 0.45], "#303a44"),
  ...[-1, 1].flatMap((side) => [
    p([C + side * 4.2, 0.7, -7.7], [1.5, 0.6, 0.9], "#17232e"),
    p([C + side * 8.6, 6.2, -10.7], [0.2, 0.2, 5.6], "#7c8f9c"),
    p([C + side * 8.6, 3.1, -13.4], [0.2, 6.2, 0.2], "#7c8f9c"),
    p([C + side * 5.5, 0.46, -6.7], [4.5, 0.06, 0.08], "#68cbd6"),
    p([C + side * 11.4, 2.1, -1], [1.2, 4.2, 0.15], "#a43f58"),
  ]),
  p([C - 4, 0.95, -11], [1.8, 1.1, 0.9], "#27343f"),
  { ...p([C + 3, 1.05, -11], [1.1, 0.7, 1.1], "#b46154"), shape: "cylinder", rx: Math.PI / 2 },
  ...[2.2, 3.8].flatMap((x) => [
    p([C + x, 1.1, -11.4], [0.05, 1.4, 0.05], "#9da9b6"),
    { ...p([C + x, 1.85, -11.4], [1.1, 0.04, 1.1], "#dab771"), shape: "cylinder" as const },
  ]),

  p([C, -0.2, -1], [28, 0.4, 26], "#242833"),
  p([C, 0.2, -10], [16, 0.4, 7], "#353748"),
  p([C, 3.6, -13.5], [16, 6.8, 0.2], "#151e2d"),
  p([C, 6.2, -8], [18, 0.25, 0.25], "#91a1ad"),
  ...[-1, 1].flatMap((side) => [
    p([C + side * 9, 3.1, -8], [0.25, 6.2, 0.25], "#91a1ad"),
    p([C + side * 7, 1.4, -10], [1.5, 2.4, 1.2], "#111822"),

    ...[0, 3, 6, 9].map((z) => p([C + side * 7, 0.035, z], [0.07, 0.05, 1.6], "#d4a34f")),
  ]),

  ...CONCERT_SEATS.flatMap((seat) => [
    p([seat.position[0], 0.255, seat.position[2]], [2.5, 0.51, 0.9], "#805359"),
    p([seat.position[0], 0.9, seat.position[2] + 0.4], [2.5, 0.7, 0.15], "#b8846c"),
  ]),
];
function ConcertLights() {
  const ref = useRef<Group>(null);
  const lighting = useClub((s) => s.data?.lighting ?? "neon");
  const color = { neon: "#df72ed", ocean: "#55d5ed", sunset: "#ffbd73" }[lighting];
  useFrame(() => {
    if (!ref.current) return;
    const time = clubNow() / 1000;
    ref.current.children.forEach((child, i) => {
      child.rotation.z = Math.sin(time * 0.45 + i * 1.4) * 0.22;
      child.rotation.x = 0.22 + Math.cos(time * 0.35 + i) * 0.16;
    });
  });
  return (
    <group ref={ref} position={[C, 5.9, -7]}>
      {(LOW_QUALITY ? [-5, 5] : [-6, -2, 2, 6]).map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, -2.7, 0]} userData={{ tapThrough: true }}>
            <coneGeometry args={[1.6, 5.4, 8, 1, true]} />
            <meshBasicMaterial color={color} transparent opacity={0.09} depthWrite={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
export function VenueSet() {
  return (
    <>
      <StyledBatch items={clubDetails} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.25, 0.55, 0.55]} position={[-8.3, 0.55, -7.7]} />
      </RigidBody>
      <Text position={[-8.3, 3.1, -10.35]} fontSize={0.32} color="#ffca79">
        CUNG BAR · ES JERUK
      </Text>
    </>
  );
}
export function ConcertSet() {
  return (
    <>
      <StyledBatch items={concertParts} />
      <ConcertLights />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[14, 0.2, 13]} position={[C, -0.2, -1]} />
        <CuboidCollider args={[8, 0.2, 3.5]} position={[C, 0.2, -10]} />
        <CuboidCollider args={[14, 2, 0.15]} position={[C, 2, -14]} />

        {[-1, 1].flatMap((side) => [
          <CuboidCollider
            key={side + "speaker"}
            args={[0.75, 1.2, 0.6]}
            position={[C + side * 7, 1.4, -10]}
          />,
        ])}

        {CONCERT_SEATS.map((seat) => (
          <CuboidCollider
            key={seat.id}
            args={[1.25, 0.255, 0.45]}
            position={[seat.position[0], 0.255, seat.position[2]]}
          />
        ))}
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" position={[C, 0.12, -5]} rotation={[0.133, 0, 0]}>
        <mesh>
          <boxGeometry args={[4, 0.16, 3.2]} />
          <meshStandardMaterial color="#43485a" />
        </mesh>
      </RigidBody>
      <Text position={[C, 5.15, -13.3]} fontSize={0.65} color="#ffe3aa">
        CUNG LIVE
      </Text>
      <Text position={[C, 4.35, -13.3]} fontSize={0.22} color="#90d7de">
        COMMUNITY STAGE · MAMPANG
      </Text>
    </>
  );
}
