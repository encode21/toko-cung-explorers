/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { MathUtils, type Group, type Mesh } from "three";
import { remoteStates } from "@/net/net-store";
import { reducedMotion } from "@/game/vehicles/visual";
import { EntryRing } from "@/game/home/EntryRing";
import { PEDESTRIAN_PAVING_Y } from "@/game/world/outdoor-layout";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { MOTOR_VENUE, type ShowroomVenue } from "./layout";
import { canStartShowroomWalk, startShowroomWalk } from "./passage";

export function ShowroomDoor({
  exit = false,
  venue = MOTOR_VENUE,
}: {
  exit?: boolean;
  venue?: ShowroomVenue;
}) {
  const { doorWidth: width, doorHeight: height } = venue.room;
  const hideExitRing = useGameUi((s) => exit && s.showroomIntro);
  const door = exit ? venue.exit : venue.entry;
  const [x, ground, z] = door.position;
  const y = ground + (exit ? 0 : PEDESTRIAN_PAVING_Y);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const light = useRef<Mesh>(null);
  const blocker = useRef<RapierRigidBody>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    const nearDoor = (px: number, py: number, pz: number) =>
      Math.abs(px - x) < width / 2 + 0.4 &&
      Math.abs(py - y - 0.83) < 1.4 &&
      pz > z - 3.3 &&
      pz < z + 0.7;
    const [px, py, pz] = useGame.getState().playerPos;
    let occupied = nearDoor(px, py, pz);
    if (!occupied) {
      for (const peer of remoteStates.values()) {
        if (nearDoor(peer.x, peer.y, peer.z)) {
          occupied = true;
          break;
        }
      }
    }
    const open = occupied ? 1 : 0;
    progress.current = reducedMotion()
      ? open
      : MathUtils.damp(progress.current, open, 12, Math.min(0.1, delta));
    const offset = width / 4 + progress.current * (width / 2 - 0.08);
    if (left.current) left.current.position.x = -offset;
    if (right.current) right.current.position.x = offset;
    if (light.current) light.current.visible = progress.current > 0.04;
    const body = blocker.current;
    if (body?.isValid()) {
      const blocking = progress.current < (body.isEnabled() ? 0.58 : 0.12);
      if (body.isEnabled() !== blocking) body.setEnabled(blocking);
    }
  });

  const direction = exit ? "exit" : "enter";
  return (
    <>
      <group
        name={`${venue.id}-${exit ? "ShowroomExitDoor" : "ShowroomEntryDoor"}`}
        position={[x, y, z]}
        rotation-y={door.yaw}
      >
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? left : right} position-x={(side * width) / 4}>
            <mesh position-y={height / 2}>
              <boxGeometry args={[width / 2 - 0.028, height - 0.08, 0.09]} />
              <meshStandardMaterial color="#263442" metalness={0.28} roughness={0.38} />
            </mesh>
            <mesh position={[0, height / 2 + 0.06, 0.054]}>
              <boxGeometry args={[width / 2 - 0.24, height - 0.62, 0.024]} />
              <meshStandardMaterial color="#506873" metalness={0.47} roughness={0.23} />
            </mesh>
            <mesh position={[side * -0.76, 1.3, 0.085]}>
              <boxGeometry args={[0.055, 0.47, 0.08]} />
              <meshStandardMaterial color="#e6e8e8" metalness={0.65} roughness={0.26} />
            </mesh>
          </group>
        ))}
        <mesh ref={light} position={[0, height / 2, -0.16]} visible={false}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#fffaf2" toneMapped={false} fog={false} />
        </mesh>
        <RigidBody
          ref={blocker}
          type="fixed"
          colliders={false}
          userData={{ cameraPassThrough: !exit }}
        >
          <CuboidCollider args={[width / 2, height / 2, 0.05]} position={[0, height / 2, 0]} />
        </RigidBody>
        <RigidBody type="fixed" colliders={false} userData={{ cameraPassThrough: !exit }}>
          <CuboidCollider args={[width / 2, height / 2, 0.05]} position={[0, height / 2, -0.62]} />
        </RigidBody>
      </group>
      {!hideExitRing && (
        <EntryRing
          position={door.marker}
          groundY={y}
          labelMinCameraDistance={exit ? 3 : 0}
          label={exit ? "Keluar ke kota" : `Masuk ${venue.name}`}
          canEnter={() => canStartShowroomWalk(direction, venue)}
          onEnter={() => startShowroomWalk(direction, venue)}
        />
      )}
    </>
  );
}
