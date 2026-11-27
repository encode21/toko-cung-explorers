/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { MathUtils, Vector3, type Group, type Mesh } from "three";
import { useGame } from "@/state/game-store";
import { remoteStates } from "@/net/net-store";
import { sameGang } from "@/game/gang/model";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { warungFacadePanels, WARUNG_DOOR } from "./storefront";

const HALF = WARUNG_DOOR.width / 2;
const LEAF = HALF - 0.02;
const HEIGHT = WARUNG_DOOR.height;
const leaves: OutdoorPart[] = [
  { p: [LEAF / 2, HEIGHT / 2, 0], s: [LEAF - 0.08, HEIGHT - 0.1, 0.045], color: "#586f73" },
  ...[0.035, LEAF - 0.035].map((x): OutdoorPart => ({
    p: [x, HEIGHT / 2, 0],
    s: [0.07, HEIGHT, 0.12],
    color: "#76583d",
  })),
  ...[0.06, HEIGHT - 0.05].map((y): OutdoorPart => ({
    p: [LEAF / 2, y, 0],
    s: [LEAF, 0.1, 0.12],
    color: "#76583d",
  })),
  { p: [LEAF / 2, 0.55, 0.025], s: [LEAF - 0.12, 0.035, 0.1], color: "#bca17a" },
  { p: [LEAF / 2, HEIGHT - 0.55, 0.025], s: [LEAF - 0.12, 0.035, 0.1], color: "#bca17a" },
  { p: [LEAF - 0.17, 1.3, 0.12], s: [0.055, 0.38, 0.1], color: "#f5d78d" },
];

/** The upgrade preview shares the closed leaves without mounting sensors or physics. */
export function WarungClosedDoors({ front }: { front: number }) {
  return (
    <group position={[0, WARUNG_DOOR.base, front]}>
      <group position-x={-HALF}>
        <OutdoorBatch items={leaves} />
      </group>
      <group position-x={HALF} scale-x={-1}>
        <OutdoorBatch items={leaves} />
      </group>
    </group>
  );
}

/** The leaves swing out without sweeping a physics body across the player's path. */
export function WarungEntranceDoor({
  front,
  back,
  width,
  gangId = null,
  enabled = true,
}: {
  front: number;
  back: number;
  width: number;
  gangId?: number | null;
  enabled?: boolean;
}) {
  const root = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const preview = useRef<Mesh>(null);
  const local = useRef(new Vector3());
  const opening = useRef(0);
  const hold = useRef(0);
  const blocker = useRef<RapierRigidBody>(null);
  const panels = warungFacadePanels(width);
  const half = Math.min(width / 2 - 0.25, 4.3);

  useFrame((_, delta) => {
    if (!root.current) return;
    const dt = Math.min(delta, 0.1);
    root.current.updateWorldMatrix(true, false);
    const near = (x: number, y: number, z: number) => {
      root.current!.worldToLocal(local.current.set(x, y, z));
      const point = local.current;
      return (
        Math.abs(point.x) < HALF + 1.1 &&
        Math.abs(point.z) < WARUNG_DOOR.approach + (hold.current > 0 ? 0.5 : 0) &&
        point.y > -0.2 &&
        point.y < 3.5
      );
    };
    const [x, y, z] = useGame.getState().playerPos;
    let occupied = enabled && near(x, y, z);
    if (enabled && !occupied) {
      for (const peer of remoteStates.values()) {
        if (sameGang(gangId, peer.gangId) && near(peer.x, peer.y, peer.z)) {
          occupied = true;
          break;
        }
      }
    }
    hold.current = occupied ? 0.45 : Math.max(0, hold.current - dt);
    opening.current = MathUtils.damp(opening.current, hold.current > 0 ? 1 : 0, 10, dt);
    const angle = opening.current * Math.PI * 0.49;
    if (left.current) left.current.rotation.y = -angle;
    if (right.current) right.current.rotation.y = angle;
    if (preview.current) preview.current.visible = opening.current > 0.02;
    const body = blocker.current;
    if (body?.isValid()) {
      const blocking = opening.current < (body.isEnabled() ? 0.67 : 0.09);
      if (body.isEnabled() !== blocking) body.setEnabled(blocking);
    }
  });

  return (
    <group ref={root} name="WarungEntranceDoors" position={[0, WARUNG_DOOR.base, front]}>
      <group ref={left} name="WarungDoorLeft" position-x={-HALF}>
        <OutdoorBatch items={leaves} />
      </group>
      <group ref={right} name="WarungDoorRight" position-x={HALF}>
        <group scale-x={-1}>
          <OutdoorBatch items={leaves} />
        </group>
      </group>
      <mesh
        ref={preview}
        name="WarungDoorWhitePreview"
        position={[0, HEIGHT / 2, -0.06]}
        visible={false}
      >
        <planeGeometry args={[WARUNG_DOOR.width, HEIGHT]} />
        <meshBasicMaterial color="#fffdf5" toneMapped={false} fog={false} />
      </mesh>
      <RigidBody
        ref={blocker}
        name="WarungDoorBlocker"
        type="fixed"
        colliders={false}
        userData={{ cameraPassThrough: true }}
      >
        <CuboidCollider args={[HALF, HEIGHT / 2, 0.06]} position={[0, HEIGHT / 2, 0]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={`side:${side}`}
            args={[0.12, 2.15, (front - back + 0.12) / 2]}
            position={[side * half, 2.07, (back - front) / 2]}
          />
        ))}
        {panels.map((panel) => (
          <CuboidCollider
            key={panel.x}
            args={[panel.width / 2, 1.85, 0.1]}
            position={[panel.x, 1.77, -0.07]}
          />
        ))}
      </RigidBody>
    </group>
  );
}
