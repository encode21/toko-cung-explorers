/** @jsxImportSource @/game/jsx */
import { TimedLampHeads, TimedPointLight } from "@/game/time/TimedFixtures";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useGame } from "@/state/game-store";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { setLocalSocialAnim } from "@/game/social/social-actions";
import { ConcertSet } from "./VenueSet";
import { ClubMusicScreen } from "./ClubMusicScreen";
import { atConcert, CONCERT_CENTER as C } from "./venue-layout";
import { clubCommand, stopDanceOnMove, useClub } from "./store";

const booths = [
  { x: C - 8, label: "ES JERUK CUNG", color: "#e4ae43" },
  { x: C + 8, label: "JAJAN MAMPANG", color: "#c55050" },
];
const venueLamps: [number, number, number][] = [
  [C - 12, 4.5, 10],
  [C + 12, 4.5, 10],
  [C - 8, 5.8, -8],
  [C + 8, 5.8, -8],
];
const lampPoles: AssetPart[] = venueLamps.slice(0, 2).map(([x, y, z]) => ({
  p: [x, y / 2, z],
  s: [0.12, y, 0.12],
  color: "#637787",
  finish: "metal",
}));
const parts: AssetPart[] = booths.flatMap(({ x, color }) => [
  { p: [x, 0.55, -0.5], s: [3, 1.1, 1.2], color: "#c59b6c", shape: "box" },
  { p: [x, 2.6, -0.5], s: [3.5, 0.2, 2], color, shape: "box" },
  ...[-1, 1].map((side) => ({
    p: [x + side * 1.4, 1.4, -1] as [number, number, number],
    s: [0.1, 2.8, 0.1] as [number, number, number],
    color: "#745744",
    shape: "box" as const,
  })),
  ...[-0.7, 0, 0.7].map((dx) => ({
    p: [x + dx, 1.2, -0.5] as [number, number, number],
    s: [0.25, 0.25, 0.25] as [number, number, number],
    color,
    shape: "cylinder" as const,
  })),
]);

function serveDrink(x: number) {
  const p = useGame.getState().playerPos;
  if (p[1] < -2 || Math.hypot(p[0] - x, p[2] - 0.6) > 3) {
    useGame.getState().setToast("Dekati booth untuk mengambil es jeruk");
    return;
  }
  useGame.getState().setSitting(false);
  stopDanceOnMove();
  setLocalSocialAnim("Drink", 3200);
  useGame.getState().setToast("Es jeruk gratis dari booth komunitas · Selamat menikmati!");
}

/** Walking onto the plaza joins the existing session without replacing the city or teleporting. */
export function OutdoorConcert() {
  const nextCheck = useRef(0);
  const waiting = useRef(false);
  const outdoor = useClub((s) => s.inside && s.outdoor);
  const mediaId = useClub((s) => s.data?.mediaId ?? null);
  useFrame(({ clock }) => {
    if (clock.elapsedTime < nextCheck.current || waiting.current) return;
    nextCheck.current = clock.elapsedTime + 5;
    const state = useClub.getState();
    if (state.busy) return;
    const nearby = atConcert(useGame.getState().playerPos);
    const action = nearby && !state.inside ? "enter" : !nearby && state.outdoor ? "exit" : null;
    if (action) {
      waiting.current = true;
      void clubCommand(action, { outdoor: true }).finally(() => {
        waiting.current = false;
      });
    }
  });
  return (
    <>
      <ConcertSet />
      <StyledBatch items={lampPoles} />
      <TimedLampHeads positions={venueLamps} />
      <TimedPointLight position={[C, 5, 4]} circuit="street" intensity={100} distance={23} />
      <TimedPointLight position={[C, 5, -8]} circuit="street" intensity={90} distance={21} />
      <group position={[C, 2.85, -13.15]}>
        {outdoor ? (
          <ClubMusicScreen color="#f2cf82" mediaId={mediaId} />
        ) : (
          <>
            <mesh>
              <boxGeometry args={[6.4, 2.25, 0.16]} />
              <meshBasicMaterial color="#152b45" />
            </mesh>
            <Text position={[0, 0.25, 0.12]} fontSize={0.5} color="#f5d89a">
              CUNG LIVE
            </Text>
            <Text position={[0, -0.4, 0.12]} fontSize={0.18} color="#b7e8e8">
              MUSIK · KOMUNITAS · MAMPANG
            </Text>
          </>
        )}
      </group>
      <StyledBatch items={parts} />
      <RigidBody type="fixed" colliders={false}>
        {booths.map((b) => (
          <CuboidCollider key={b.label} args={[1.5, 0.55, 0.6]} position={[b.x, 0.55, -0.5]} />
        ))}
      </RigidBody>
      {booths.map((b) => (
        <group key={b.label} userData={{ worldTap: () => serveDrink(b.x) }}>
          <Text position={[b.x, 2.3, 0.52]} fontSize={0.2} color="#fff4cc">
            {b.label}
          </Text>
          <mesh
            name={`vendor-${b.x}`}
            position={[b.x, 0.65, 0.12]}
            onClick={(event) => {
              event.stopPropagation();
              serveDrink(b.x);
            }}
          >
            <boxGeometry args={[2.8, 0.9, 0.06]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
          <Text position={[b.x, 0.7, 0.17]} fontSize={0.16} color="#fff4cc">
            KETUK · ES JERUK GRATIS
          </Text>
        </group>
      ))}
    </>
  );
}
