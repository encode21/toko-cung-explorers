/** @jsxImportSource @/game/jsx */
import { Suspense, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useGame } from "@/state/game-store";
import {
  closeShowroomSales,
  SHOWROOM_SALES_AVATAR,
  SHOWROOM_SALES_LOCAL,
  SHOWROOM_SALES_NAME,
  SHOWROOM_SALES_POSITION,
  SHOWROOM_SALES_ROLE,
  useShowroomSales,
} from "./sales";

const FACE_GALLERY = 2.55;

export function ShowroomSalesNpc() {
  const actor = useRef<Group>(null);
  const label = useRef<Group>(null);
  const animation = useRef<AvatarAnimation | undefined>("Idle");
  useEffect(() => closeShowroomSales, []);

  useFrame(({ camera }, delta) => {
    if (!actor.current) return;
    const [x, , z] = useGame.getState().playerPos;
    const dx = x - SHOWROOM_SALES_POSITION[0];
    const dz = z - SHOWROOM_SALES_POSITION[2];
    const target = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : FACE_GALLERY;
    const yaw = actor.current.rotation.y;
    const turn = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
    actor.current.rotation.y = MathUtils.damp(yaw, yaw + turn, 7, delta);
    const talking = useShowroomSales.getState().open;
    animation.current = talking ? "Talk" : "Idle";
    if (label.current) {
      const cameraDistance = Math.hypot(
        camera.position.x - SHOWROOM_SALES_POSITION[0],
        camera.position.y - SHOWROOM_SALES_POSITION[1] - 2.08,
        camera.position.z - SHOWROOM_SALES_POSITION[2],
      );
      label.current.visible = !talking && cameraDistance >= 2.3;
    }
  });

  return (
    <group name="ShowroomSalesNadia" position={SHOWROOM_SALES_LOCAL}>
      <Suspense fallback={null}>
        <group ref={actor} rotation-y={FACE_GALLERY}>
          <BaseAvatarV2 avatar={SHOWROOM_SALES_AVATAR} animation={animation} />
        </group>
        <group ref={label}>
          <NpcLabel text={`${SHOWROOM_SALES_NAME} · ${SHOWROOM_SALES_ROLE}`} />
        </group>
      </Suspense>
    </group>
  );
}
