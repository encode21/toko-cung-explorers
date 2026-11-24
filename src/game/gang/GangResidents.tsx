/** @jsxImportSource @/game/jsx */
import { useRef, useState } from "react";
import { Group as ThreeGroup } from "three";
import { useMovingInteractable } from "@/game/interactions/dynamic";
import { NPC_SCRIPTS, useNpcScript } from "@/game/npc/scripts";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { useRenderBudget, selectBudgetLow } from "@/game/engine/AdaptiveQuality";
import { turnToward } from "@/game/npc/behavior";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { Barks } from "@/game/npc/NpcBarks";
import { useGame } from "@/state/game-store";
import { nearbyResidents, residentPose, type GangResident } from "./ambient";
import type { GangData } from "./model";

function Resident({ resident: r, origin }: { resident: GangResident; origin: readonly number[] }) {
  const root = useRef<Group>(null);
  // Talkable ("Bicara" → scripted chat): the interactable needs the world position, the group is gang-local.
  const talk = useRef<Group>(new ThreeGroup());
  const script = NPC_SCRIPTS[`gang-${r.id}`];
  useMovingInteractable(talk, {
    id: `gang-${r.id}`,
    label: script ? `${script.name} · ${script.role}` : "Warga",
    persona: "",
    role: "warga",
    avatarId: r.avatar,
  });
  const animation = useRef<AvatarAnimation | undefined>(r.activity);
  const speed = useRef(0);
  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    // Chatting: stand still and face the player (the walk resumes from the shared clock afterwards).
    if (useNpcScript.getState().id === `gang-${r.id}`) {
      const pp = useGame.getState().playerPos;
      const yaw = Math.atan2(
        pp[0] - origin[0]! - root.current.position.x,
        pp[2] - origin[2]! - root.current.position.z,
      );
      root.current.rotation.y = turnToward(root.current.rotation.y, yaw, dt);
      speed.current = 0;
      animation.current = "Talk";
      return;
    }
    const p = residentPose(r, clock.elapsedTime);
    root.current.position.set(p.x, 0, p.z);
    talk.current.position.set(p.x + origin[0]!, 0, p.z + origin[2]!);
    root.current.rotation.y = turnToward(root.current.rotation.y, p.yaw, dt);
    speed.current = p.moving ? r.speed : 0;
    animation.current = p.moving ? r.walk : r.activity;
  });
  return (
    <group
      ref={root}
      name={`GangResident:${r.id}`}
      position={[r.from[0], 0, r.from[1]]}
      rotation-y={r.yaw}
      scale={r.scale}
    >
      <LodAvatar lodId={`gang:${r.id}`} avatarId={r.avatar} animation={animation} speed={speed} />
      {r.basket && (
        <group position={[0, 0.55, 0.65]}>
          <mesh>
            <boxGeometry args={[0.85, 0.5, 0.6]} />
            <meshStandardMaterial color="#9a7451" />
          </mesh>
          {[-0.25, 0, 0.25].map((x) => (
            <mesh key={x} position={[x, 0.31, 0]}>
              <sphereGeometry args={[0.18, 5, 4]} />
              <meshStandardMaterial color="#5c8e43" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function GangResidents({ data }: { data: GangData }) {
  const low = useRenderBudget(selectBudgetLow);
  const [visible, setVisible] = useState<string[]>([]);
  const elapsed = useRef(1);
  useFrame(({ clock }, dt) => {
    elapsed.current += dt;
    if (elapsed.current < 0.5) return;
    elapsed.current = 0;
    const p = useGame.getState().playerPos;
    const next = nearbyResidents(
      data.ambient,
      p[0] - data.layout.origin[0],
      p[2] - data.layout.origin[2],
      clock.elapsedTime,
      low,
    );
    setVisible((old) => (old.join() === next.join() ? old : next));
  });
  const list = (seconds: number) =>
    data.ambient.residents.map((r) => {
      const p = residentPose(r, seconds);
      return {
        id: r.id,
        role: r.bark ?? "warga",
        x: p.x + data.layout.origin[0],
        z: p.z + data.layout.origin[2],
      } as const;
    });
  return (
    <>
      <Barks list={list} />
      {data.ambient.residents
        .filter((r) => visible.includes(r.id))
        .map((r) => (
          <Resident key={r.id} resident={r} origin={data.layout.origin} />
        ))}
    </>
  );
}
