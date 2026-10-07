/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { useMovingInteractable } from "@/game/interactions/dynamic";
import { PersonCollider } from "@/game/physics/PersonCollider";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useGame } from "@/state/game-store";
import { LOW_QUALITY } from "@/game/engine/quality";
import { trafficActors, trafficVehicles } from "@/game/traffic/traffic-runtime";
import { AMBIENT_PROFILES, crossingGap } from "./ambient-profiles";
import { populationForQuality, type NpcConfig } from "./population";
import { conversationStep, createBehavior, pauseDuration, turnToward } from "./behavior";

// Quality-budgeted actors, no pathfinding/raycasts. Existing worker simulation stays separate.
const actors = new Map<string, Group>();
function AmbientNpc({ config: c }: { config: NpcConfig }) {
  const ref = useRef<Group>(null);
  const parcel = useRef<Group>(null);
  const brain = useRef(createBehavior(c.seed));
  const gait = useRef(0);
  const animation = useRef<AvatarAnimation | undefined>(c.seat ? "Sit" : "Idle");
  const canInteract = useRef(true);
  const crossing = useRef(false);
  const activity = c.profile ? AMBIENT_PROFILES[c.profile].activity : c.activity;
  useMovingInteractable(ref, c, canInteract);
  useEffect(() => {
    if (ref.current) actors.set(c.id, ref.current);
    if (c.profile === "crossing-pedestrian")
      trafficActors.set(c.id, {
        position: () =>
          ref.current ? { x: ref.current.position.x, z: ref.current.position.z } : null,
        hit: () => false,
      });
    return () => {
      actors.delete(c.id);
      if (c.profile === "crossing-pedestrian") trafficActors.delete(c.id);
    };
  }, [c.id, c.profile]);
  useFrame((_, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05),
      s = brain.current,
      game = useGame.getState();
    const inRoad = c.profile === "crossing-pedestrian" && g.position.z > 16 && g.position.z < 24;
    canInteract.current = !inRoad;
    const talking = !inRoad && game.activeNpc === c.id && game.overlay === "dialogue";
    gait.current = 0;
    if (parcel.current) parcel.current.visible = !!c.carry && !talking;
    if (conversationStep(s, talking, dt)) {
      animation.current = c.seat ? "Sit" : talking ? "Talk" : "Idle";
      if (talking && !c.seat)
        g.rotation.y = turnToward(
          g.rotation.y,
          Math.atan2(game.playerPos[0] - g.position.x, game.playerPos[2] - g.position.z),
          dt,
        );
    } else if (s.state === "WALK") {
      const target = c.points[s.target]!;
      const dx = target[0] - g.position.x,
        dz = target[2] - g.position.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.06 || c.points.length === 1) {
        s.state = "WORK";
        crossing.current = false;
        s.left = pauseDuration(s, c.profile);
        animation.current = activity;
      } else {
        if (c.profile === "crossing-pedestrian" && !crossing.current) {
          if (!crossingGap(g.position.x, distance / c.speed, trafficVehicles.values())) {
            animation.current = "Idle";
            g.userData["npcState"] = "WAIT_CROSSING";
            return;
          }
          crossing.current = true;
        }
        const k = Math.min(1, (c.speed * dt) / distance),
          nx = g.position.x + dx * k,
          nz = g.position.z + dz * k;
        const playerAhead = Math.hypot(nx - game.playerPos[0], nz - game.playerPos[2]) < 0.95;
        let occupied = false;
        for (const [id, other] of actors) {
          if (id !== c.id && Math.hypot(other.position.x - nx, other.position.z - nz) < 0.85) {
            occupied = true;
            break;
          }
        }
        // A committed crossing has no idle waypoint or conversation stop in the roadway.
        animation.current = c.carry ? "CarryBox" : undefined;
        if (!playerAhead && !occupied) {
          g.position.x = nx;
          g.position.z = nz;
          gait.current = c.speed;
        } else animation.current = "Idle";
        g.rotation.y = turnToward(g.rotation.y, Math.atan2(dx, dz), dt);
      }
    } else {
      s.left -= dt;
      animation.current = c.seat ? "Sit" : s.state === "WORK" ? activity : "Idle";
      const observe =
        c.role === "kasir" &&
        Math.hypot(game.playerPos[0] - g.position.x, game.playerPos[2] - g.position.z) < 3;
      g.rotation.y = turnToward(
        g.rotation.y,
        observe
          ? Math.atan2(game.playerPos[0] - g.position.x, game.playerPos[2] - g.position.z)
          : c.yaw,
        dt,
      );
      if (s.left <= 0) {
        if (s.state === "IDLE") {
          s.state = "WORK";
          s.left = pauseDuration(s, c.profile);
        } else if (c.points.length > 1) {
          if (s.target === c.points.length - 1) s.direction = -1;
          if (s.target === 0) s.direction = 1;
          s.target += s.direction;
          s.state = "WALK";
        } else {
          s.state = "IDLE";
          s.left = pauseDuration(s, c.profile);
        }
      }
    }
    g.userData["npcState"] = s.state;
  });
  return (
    <>
      <group
        ref={ref}
        name={c.id}
        position={c.points[0]!}
        rotation-y={c.yaw}
        userData={{ npcRole: c.role, zone: c.zone, ambientProfile: c.profile }}
      >
        <group position-y={c.seat ? 0.2 : 0}>
          <BaseAvatarV2
            avatar={NPC_AVATARS[c.avatarId ?? c.id]}
            speed={gait}
            animation={animation}
            groundToWorld
          />
        </group>
        <NpcLabel text={c.label} />
        {c.carry && (
          <group ref={parcel} position={[0, 0.98, 0.42]}>
            <mesh>
              <boxGeometry args={[0.38, 0.3, 0.32]} />
              <meshStandardMaterial color="#be9564" />
            </mesh>
          </group>
        )}
      </group>
      <PersonCollider target={ref} />
    </>
  );
}
export function Npcs() {
  return (
    <group name="MapV2-NPCs">
      {populationForQuality(LOW_QUALITY).map((c) => (
        <AmbientNpc key={c.id} config={c} />
      ))}
    </group>
  );
}
