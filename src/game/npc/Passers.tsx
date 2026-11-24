/** @jsxImportSource @/game/jsx */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { useRenderBudget, selectBudgetLow } from "@/game/engine/AdaptiveQuality";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { turnToward } from "@/game/npc/behavior";
import { residentPose, type GangResident } from "@/game/gang/ambient";
import { useGame } from "@/state/game-store";

/** A pedestrian walking back and forth between two points (scene-local x, z). Scenery only: no trades. */
export type Passer = {
  id: string;
  avatar: string;
  from: [number, number];
  to: [number, number];
  speed: number;
  offset: number;
};

function asResident(p: Passer): GangResident {
  return { ...p, scale: 1, pause: 1.5, yaw: 0, activity: "Idle", walk: "Walk" };
}

function Walker({ passer }: { passer: Passer }) {
  const root = useRef<Group>(null);
  const r = useRef(asResident(passer)).current;
  const animation = useRef<AvatarAnimation | undefined>("Walk");
  const speed = useRef(r.speed);
  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    const p = residentPose(r, clock.elapsedTime);
    root.current.position.set(p.x, 0, p.z);
    root.current.rotation.y = turnToward(root.current.rotation.y, p.yaw, dt);
    speed.current = p.moving ? r.speed : 0;
    animation.current = p.moving ? "Walk" : "Idle";
  });
  const look = NPC_AVATARS[passer.avatar];
  if (!look) return null;
  return (
    <group ref={root} name={`Passer:${passer.id}`} position={[passer.from[0], 0, passer.from[1]]}>
      <LodAvatar
        lodId={`passer:${passer.id}`}
        avatarId={passer.avatar}
        animation={animation}
        speed={speed}
      />
    </group>
  );
}

/**
 * Pedestrians that pass by without buying anything. `origin` is the world position of the scene-local frame,
 * used only to render them while the player is within `distance`. Low render budget shows half of them.
 */
export function Passers({
  passers,
  origin = [0, 0, 0],
  distance = 45,
}: {
  passers: Passer[];
  origin?: [number, number, number];
  distance?: number;
}) {
  const low = useRenderBudget(selectBudgetLow);
  const [near, setNear] = useState(false);
  const wait = useRef(1);
  useFrame((_, dt) => {
    wait.current += dt;
    if (wait.current < 0.5) return;
    wait.current = 0;
    const [px, , pz] = useGame.getState().playerPos;
    const close = passers.some(
      (p) =>
        Math.hypot(
          px - origin[0] - (p.from[0] + p.to[0]) / 2,
          pz - origin[2] - (p.from[1] + p.to[1]) / 2,
        ) < distance,
    );
    if (close !== near) setNear(close);
  });
  if (!near) return null;
  return (
    <>
      {(low ? passers.filter((_, i) => i % 2 === 0) : passers).map((p) => (
        <Walker key={p.id} passer={p} />
      ))}
    </>
  );
}
