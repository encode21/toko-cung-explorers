/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { MathUtils, type Group, type Mesh } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import type { WorldTarget } from "@/game/editor/store";
import { reducedMotion } from "@/game/vehicles/visual";
import { remoteStates } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { clubDoorLayout } from "./door-layout";

const frameDark = "#1b2030";
const slate = "#243748";

function panel(p: AssetPart["p"], s: AssetPart["s"], color: string): AssetPart {
  return { p, s, color, shape: "bevel", finish: "metal" };
}

export function ClubPortal({ target }: { target: WorldTarget }) {
  const door = useMemo(() => clubDoorLayout(target), [target]);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const white = useRef<Mesh>(null);
  const blocker = useRef<RapierRigidBody>(null);
  const progress = useRef(0);
  const hold = useRef(0);
  const half = door.width / 2;
  const h = door.height;
  const leafWidth = half - 0.026;
  const leaves = useMemo(
    () => [
      panel([leafWidth / 2, h / 2, 0], [leafWidth, h - 0.04, 0.12], frameDark),
      panel([leafWidth / 2, h / 2 + 0.11, 0.062], [leafWidth - 0.25, h - 0.51, 0.028], slate),
      panel([leafWidth - 0.16, 1.08, 0.088], [0.058, 0.41, 0.055], "#dbbc83"),
      panel([leafWidth / 2, 0.25, 0.064], [leafWidth - 0.22, 0.08, 0.03], "#3d4756"),
    ],
    [h, leafWidth],
  );
  const frame = useMemo(
    () => [
      ...[-1, 1].map((side) =>
        panel(
          [side * (half + 0.08), h / 2, 0.008],
          [0.16, h, 0.22],
          door.exit ? "#936e61" : frameDark,
        ),
      ),
      panel(
        [0, h + 0.085, 0.008],
        [door.width + 0.32, 0.17, 0.22],
        door.exit ? "#5e4750" : frameDark,
      ),
    ],
    [door.exit, door.width, h, half],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const [px, py, pz] = useGame.getState().playerPos;
    const [x, y, z] = door.position;
    const sin = Math.sin(door.yaw);
    const cos = Math.cos(door.yaw);
    const near = (playerX: number, playerY: number, playerZ: number) => {
      if (Math.abs(playerY - y - 0.83) > 1.3) return false;
      const dx = playerX - x;
      const dz = playerZ - z;
      const distance = dx * sin + dz * cos;
      return Math.abs(dx * cos - dz * sin) < half + 0.45 && distance > -0.8 && distance < 2.85;
    };
    let occupied = near(px, py, pz);
    if (!occupied) {
      for (const peer of remoteStates.values()) {
        if (near(peer.x, peer.y, peer.z)) {
          occupied = true;
          break;
        }
      }
    }
    hold.current = occupied ? 0.32 : Math.max(0, hold.current - dt);
    const open = hold.current > 0 ? 1 : 0;
    progress.current = reducedMotion() ? open : MathUtils.damp(progress.current, open, 13, dt);
    const angle = progress.current * Math.PI * 0.48;
    if (left.current) left.current.rotation.y = -angle;
    if (right.current) right.current.rotation.y = angle;
    if (white.current) white.current.visible = progress.current > 0.035;
    const body = blocker.current;
    if (body?.isValid()) {
      const blocking = progress.current < (body.isEnabled() ? 0.58 : 0.1);
      if (body.isEnabled() !== blocking) body.setEnabled(blocking);
    }
  });

  return (
    <group
      name={target.id}
      userData={{ entityId: target.id }}
      position={door.position}
      rotation-y={door.yaw}
    >
      <group name={door.exit ? "club-exit-door" : "club-entry-door"}>
        <StyledBatch items={frame} />
        <mesh position={[0, h + 0.085, 0.125]}>
          <boxGeometry args={[door.width - 0.1, 0.035, 0.025]} />
          <meshBasicMaterial color={door.exit ? "#e8c284" : "#b98bfd"} />
        </mesh>
        <group ref={left} name="ClubDoorLeft" position-x={-half + 0.025}>
          <StyledBatch items={leaves} />
        </group>
        <group ref={right} name="ClubDoorRight" position-x={half - 0.025}>
          <group scale-x={-1}>
            <StyledBatch items={leaves} />
          </group>
        </group>
        <mesh ref={white} name="ClubDoorWhite" position={[0, h / 2, -0.15]} visible={false}>
          <planeGeometry args={[door.width + 0.06, h + 0.05]} />
          <meshBasicMaterial color="#ffffff" fog={false} toneMapped={false} />
        </mesh>
        <RigidBody
          ref={blocker}
          type="fixed"
          colliders={false}
          userData={{ cameraPassThrough: true }}
        >
          <CuboidCollider args={[half, h / 2, 0.06]} position={[0, h / 2, 0]} />
        </RigidBody>
      </group>
    </group>
  );
}
