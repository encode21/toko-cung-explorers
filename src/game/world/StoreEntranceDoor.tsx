/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { MathUtils, type Group, type Mesh } from "three";
import { remoteStates } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { STORE } from "./layout";
import { P } from "./palette";

const HINGE_X = STORE.doorHalfWidth - 0.025;
const LEAF_WIDTH = HINGE_X - 0.018;
const DOOR_BASE = 0.075;
const DOOR_HEIGHT = STORE.wallHeight - 0.65;
const OPEN_ANGLE = Math.PI * 0.49;
const HOLD_SECONDS = 0.45;
const APPROACH_DISTANCE = 4.5;
const RELEASE_DISTANCE = APPROACH_DISTANCE + 0.5;

const leafParts: OutdoorPart[] = [
  {
    p: [LEAF_WIDTH / 2, DOOR_HEIGHT / 2, 0],
    s: [LEAF_WIDTH - 0.11, DOOR_HEIGHT - 0.16, 0.038],
    color: P.entranceGlass,
  },
  { p: [0.035, DOOR_HEIGHT / 2, 0], s: [0.07, DOOR_HEIGHT, 0.095], color: "#354b51" },
  {
    p: [LEAF_WIDTH - 0.035, DOOR_HEIGHT / 2, 0],
    s: [0.07, DOOR_HEIGHT, 0.095],
    color: "#354b51",
  },
  { p: [LEAF_WIDTH / 2, 0.08, 0], s: [LEAF_WIDTH, 0.16, 0.095], color: "#354b51" },
  {
    p: [LEAF_WIDTH / 2, DOOR_HEIGHT - 0.045, 0],
    s: [LEAF_WIDTH, 0.09, 0.095],
    color: "#354b51",
  },
  {
    p: [LEAF_WIDTH / 2, 0.9, 0],
    s: [LEAF_WIDTH - 0.14, 0.055, 0.09],
    color: "#b7c9c6",
  },
  ...[-1, 1].map((face): OutdoorPart => ({
    p: [LEAF_WIDTH - 0.18, 1.23, face * 0.09],
    s: [0.065, 0.36, 0.09],
    color: "#d4c4a8",
  })),
];

function nearStoreEntrance(x: number, y: number, z: number, open: boolean) {
  return (
    y > 0.1 &&
    y < 3.6 &&
    Math.abs(x - STORE.doorX) < STORE.doorHalfWidth + (open ? 1.05 : 0.65) &&
    Math.abs(z - STORE.maxZ) < (open ? RELEASE_DISTANCE : APPROACH_DISTANCE)
  );
}

function showDoorPreview(entrance: Mesh | null, exit: Mesh | null, inside: boolean, open: boolean) {
  if (entrance) entrance.visible = open && !inside;
  if (exit) exit.visible = open && inside;
}

/** Proximity-operated doors. A fixed threshold collider avoids sweeping players with the leaves. */
export function StoreEntranceDoor() {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const entranceBackdrop = useRef<Mesh>(null);
  const exitBackdrop = useRef<Mesh>(null);
  const blocker = useRef<RapierRigidBody>(null);
  const opening = useRef(0);
  const hold = useRef(0);

  useLayoutEffect(
    () =>
      useGame.subscribe((game, previous) => {
        if (game.inside !== previous.inside) {
          showDoorPreview(
            entranceBackdrop.current,
            exitBackdrop.current,
            game.inside,
            opening.current > 0.02,
          );
        }
      }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const {
      inside,
      playerPos: [x, y, z],
    } = useGame.getState();
    const wasOpen = hold.current > 0;
    let occupied = nearStoreEntrance(x, y, z, wasOpen);
    if (!occupied) {
      for (const peer of remoteStates.values()) {
        if (nearStoreEntrance(peer.x, peer.y, peer.z, wasOpen)) {
          occupied = true;
          break;
        }
      }
    }
    hold.current = occupied ? HOLD_SECONDS : Math.max(0, hold.current - dt);

    const target = hold.current > 0 ? 1 : 0;
    const next = MathUtils.damp(opening.current, target, 14, dt);
    opening.current = Math.abs(target - next) < 0.001 ? target : next;
    const angle = opening.current * OPEN_ANGLE;
    if (left.current) left.current.rotation.y = -angle;
    if (right.current) right.current.rotation.y = angle;
    showDoorPreview(entranceBackdrop.current, exitBackdrop.current, inside, opening.current > 0.02);

    const body = blocker.current;
    if (!body?.isValid()) return;
    // Keep a clear passage during closing; the approach sensor can reopen it before contact.
    const enabled = body.isEnabled();
    const shouldBlock = opening.current < (enabled ? 0.67 : 0.09);
    if (enabled !== shouldBlock) body.setEnabled(shouldBlock);
  });

  return (
    <group name="TokoCung-EntranceDoors" position-x={STORE.doorX}>
      <group ref={left} name="EntranceLeafLeft" position={[-HINGE_X, DOOR_BASE, 0]}>
        <OutdoorBatch items={leafParts} shadows={false} />
      </group>
      <group ref={right} name="EntranceLeafRight" position={[HINGE_X, DOOR_BASE, 0]}>
        <group scale-x={-1}>
          <OutdoorBatch items={leafParts} shadows={false} />
        </group>
      </group>
      {/* The previews each face their approach side, including when the camera is across the threshold. */}
      <mesh
        ref={entranceBackdrop}
        name="EntranceWhiteBackdrop"
        visible={false}
        position={[0, DOOR_BASE + DOOR_HEIGHT / 2, -0.16]}
      >
        <planeGeometry args={[STORE.doorHalfWidth * 2, DOOR_HEIGHT]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} fog={false} />
      </mesh>
      <mesh
        ref={exitBackdrop}
        name="ExitWhiteBackdrop"
        visible={false}
        position={[0, DOOR_BASE + DOOR_HEIGHT / 2, 0.16]}
        rotation-y={Math.PI}
      >
        <planeGeometry args={[STORE.doorHalfWidth * 2, DOOR_HEIGHT]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} fog={false} />
      </mesh>
      <RigidBody
        ref={blocker}
        name="TokoCung-EntranceBlocker"
        type="fixed"
        colliders={false}
        userData={{ cameraPassThrough: true }}
      >
        <CuboidCollider
          args={[STORE.doorHalfWidth, DOOR_HEIGHT / 2, 0.08]}
          position={[0, DOOR_BASE + DOOR_HEIGHT / 2, 0]}
        />
      </RigidBody>
    </group>
  );
}
