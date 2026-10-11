/** @jsxImportSource @/game/jsx */
import { playCue } from "@/game/audio/sound-palette";
import { distanceGain } from "@/game/audio/world-acoustics";
import { useEffect, useRef, useState } from "react";
import { useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useReactiveWorld } from "@/game/reactive-world/store";
import { customerCount } from "@/game/reactive-world/model";
import {
  outsideView,
  hiddenSpawn,
  CUSTOMER_ENTRIES,
  rushNpc,
} from "@/game/reactive-world/npc-effects";
import { useOps } from "@/state/ops-store";
import { isTrafficHost } from "@/game/traffic/traffic-sync";
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
const pendingAnchors = new Map<string, readonly number[]>();
function AmbientNpc({
  config: c,
  temporary = false,
  onExit,
}: {
  config: NpcConfig;
  temporary?: boolean;
  onExit?: () => void;
}) {
  const { world, rapier } = useRapier();
  const safetyShape = useRef(new rapier.Ball(0.35));
  const ref = useRef<Group>(null);
  const parcel = useRef<Group>(null);
  const brain = useRef(
    temporary
      ? { ...createBehavior(c.seed), state: "WALK" as const, target: 1 }
      : createBehavior(c.seed),
  );
  const gait = useRef(0);
  const animation = useRef<AvatarAnimation | undefined>(c.seat ? "Sit" : "Idle");
  const canInteract = useRef(true);
  const crossing = useRef(false);
  const nextScan = useRef(0);
  const courierStage = useRef("");
  const exitNotified = useRef(false);
  const activity = c.profile ? AMBIENT_PROFILES[c.profile].activity : c.activity;
  useMovingInteractable(ref, c, canInteract);
  useEffect(() => {
    if (ref.current) actors.set(c.id, ref.current);
    pendingAnchors.delete(c.id);
    if (temporary)
      useReactiveWorld.setState((s) =>
        c.zone === "warehouse" ? { workers: s.workers + 1 } : { customers: s.customers + 1 },
      );
    if (c.profile === "crossing-pedestrian")
      trafficActors.set(c.id, {
        position: () =>
          ref.current ? { x: ref.current.position.x, z: ref.current.position.z } : null,
        hit: () => false,
      });
    return () => {
      actors.delete(c.id);
      if (temporary)
        useReactiveWorld.setState((s) =>
          c.zone === "warehouse"
            ? { workers: Math.max(0, s.workers - 1) }
            : { customers: Math.max(0, s.customers - 1) },
        );
      if (c.profile === "crossing-pedestrian") trafficActors.delete(c.id);
    };
  }, [c.id, c.profile, c.zone, temporary]);
  useFrame(({ camera }, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05),
      s = brain.current,
      game = useGame.getState();
    const inRoad = c.profile === "crossing-pedestrian" && g.position.z > 16 && g.position.z < 24;
    canInteract.current = !inRoad;
    const talking = !inRoad && game.activeNpc === c.id && game.overlay === "dialogue";
    gait.current = 0;
    const pickup = c.id === "npc-courier" ? useOps.getState().pickup : null;
    const courierTask = pickup && (pickup.stage === "pickup" || pickup.stage === "returning");
    if (parcel.current) parcel.current.visible = (!!c.carry || !!courierTask) && !talking;
    const pressure = useReactiveWorld.getState();
    const workRate =
      1 +
      (c.zone === "warehouse"
        ? pressure.warehouse
        : ["retail", "promo", "cashier"].includes(c.zone)
          ? pressure.store
          : 0) *
        0.35;
    if (
      temporary &&
      s.target === c.points.length - 1 &&
      s.state !== "WALK" &&
      !talking &&
      outsideView(camera, [g.position.x, 0, g.position.z])
    ) {
      if (!exitNotified.current) {
        exitNotified.current = true;
        onExit?.();
      }
      return;
    }
    if (conversationStep(s, talking, dt)) {
      animation.current = c.seat ? "Sit" : talking ? "Talk" : "Idle";
      if (talking && !c.seat)
        g.rotation.y = turnToward(
          g.rotation.y,
          Math.atan2(game.playerPos[0] - g.position.x, game.playerPos[2] - g.position.z),
          dt,
        );
    } else if (courierTask) {
      const task = pickup.stage;
      if (courierStage.current !== task) {
        courierStage.current = task;
        s.state = "WALK";
      }
      const target = task === "pickup" ? [11.5, 10.5] : [11.5, 14.1];
      const dx = target[0]! - g.position.x,
        dz = target[1]! - g.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0.12) {
        const k = Math.min(1, (dt * 1.15) / distance);
        if (
          Math.hypot(
            g.position.x + dx * k - game.playerPos[0],
            g.position.z + dz * k - game.playerPos[2],
          ) > 0.95
        ) {
          g.position.x += dx * k;
          g.position.z += dz * k;
          gait.current = 1.15;
        }
        g.rotation.y = turnToward(g.rotation.y, Math.atan2(dx, dz), dt);
        animation.current = "CarryBox";
      } else {
        s.state = "WORK";
        animation.current = task === "pickup" ? "PickItem" : "Idle";
        if (isTrafficHost() && useOps.getState().courierAt !== task)
          useOps.setState({ courierAt: task });
      }
    } else if (s.state === "WALK") {
      const target = c.points[s.target]!;
      const dx = target[0] - g.position.x,
        dz = target[2] - g.position.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.06 || c.points.length === 1) {
        s.state = "WORK";
        crossing.current = false;
        s.left = temporary
          ? c.workStops?.includes(s.target)
            ? 5
            : 0.15
          : pauseDuration(s, c.profile);
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
        const fixtureBlocked =
          temporary &&
          !!world.intersectionWithShape(
            { x: nx, y: 0.85, z: nz },
            { x: 0, y: 0, z: 0, w: 1 },
            safetyShape.current,
            rapier.QueryFilterFlags.EXCLUDE_KINEMATIC |
              rapier.QueryFilterFlags.EXCLUDE_DYNAMIC |
              rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          );
        if (!playerAhead && !occupied && !fixtureBlocked) {
          g.position.x = nx;
          g.position.z = nz;
          gait.current = c.speed;
        } else animation.current = "Idle";
        g.rotation.y = turnToward(g.rotation.y, Math.atan2(dx, dz), dt);
      }
    } else {
      s.left -= dt * workRate;
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
          if (temporary && s.target === c.points.length - 1) {
            s.left = 1;
            return;
          }
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
    // Audible only during existing cashier work; its animation remains authoritative.
    const now = performance.now();
    if (c.role === "kasir" && s.state === "WORK" && !talking && now > nextScan.current) {
      nextScan.current = now + (6000 + Math.random() * 9000) / workRate;
      playCue(
        Math.random() < 0.75 ? "scan" : "receipt",
        distanceGain(
          Math.hypot(game.playerPos[0] - g.position.x, game.playerPos[2] - g.position.z),
          12,
        ),
      );
    }
    g.userData["npcState"] = s.state;
    g.userData["npcTarget"] = s.target;
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
        {(c.carry || c.id === "npc-courier") && (
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
/** Slots survive intensity reductions until their current visit has safely exited. */
function RushSlot({ slot, warehouse = false }: { slot: number; warehouse?: boolean }) {
  const [config, setConfig] = useState<NpcConfig | null>(null);
  const nextCheck = useRef(0);
  const pendingId = useRef("");
  useEffect(
    () => () => {
      pendingAnchors.delete(pendingId.current);
    },
    [],
  );
  useFrame(({ camera, scene }) => {
    if (config || performance.now() < nextCheck.current) return;
    nextCheck.current = performance.now() + 1000 + slot * 170;
    const state = useReactiveWorld.getState();
    const event = state.events.find(
      (e) => e.type === (warehouse ? "WAREHOUSE_RUSH" : "STORE_RUSH"),
    );
    const wanted = warehouse
      ? !LOW_QUALITY && state.warehouse >= 0.65
        ? 1
        : 0
      : customerCount(state.store, LOW_QUALITY);
    if (!event || slot >= wanted) return;
    const player = useGame.getState().playerPos;
    const entries = warehouse ? [0] : [...CUSTOMER_ENTRIES];
    // Stagger interior choices so multiple slots do not compete for a single visible doorway.
    const offset = slot % entries.length;
    const ordered = [...entries.slice(offset), ...entries.slice(0, offset)];
    const candidate = ordered
      .map((entry) =>
        rushNpc(`reactive-${event.id}-${warehouse ? "worker" : slot}`, slot, warehouse, entry),
      )
      .find((option) => {
        const p = option.points[0]!;
        if (Math.hypot(p[0] - player[0], p[2] - player[2]) < 4) return false;
        for (const other of actors.values())
          if (Math.hypot(p[0] - other.position.x, p[2] - other.position.z) < 2) return false;
        for (const used of pendingAnchors.values())
          if (Math.hypot(p[0] - used[0]!, p[2] - used[2]!) < 2) return false;
        return hiddenSpawn(camera, p, scene);
      });
    if (!candidate) return;
    const anchor = candidate.points[0]!;
    pendingId.current = candidate.id;
    pendingAnchors.set(candidate.id, anchor);
    setConfig(candidate);
  });
  return config ? (
    <AmbientNpc
      key={config.id}
      config={config}
      temporary
      onExit={() => {
        setConfig(null);
        nextCheck.current = performance.now() + 4000;
      }}
    />
  ) : null;
}
export function Npcs() {
  return (
    <group name="MapV2-NPCs">
      {Array.from({ length: LOW_QUALITY ? 2 : 4 }, (_, slot) => (
        <RushSlot key={slot} slot={slot} />
      ))}
      {!LOW_QUALITY && <RushSlot slot={0} warehouse />}
      {populationForQuality(LOW_QUALITY).map((c) => (
        <AmbientNpc key={c.id} config={c} />
      ))}
    </group>
  );
}
