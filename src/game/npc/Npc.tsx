/** @jsxImportSource @/game/jsx */
import { playCue } from "@/game/audio/sound-palette";
import { distanceGain } from "@/game/audio/world-acoustics";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { useMovingInteractable } from "@/game/interactions/dynamic";
import { PersonCollider } from "@/game/physics/PersonCollider";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useGame } from "@/state/game-store";
import { SpeechBubble } from "@/game/net/PlayerChatBubble";
import { useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { LOW_QUALITY } from "@/game/engine/quality";
import { trafficActors, trafficVehicles } from "@/game/traffic/traffic-runtime";
import { ImpactVfx } from "@/game/traffic/ImpactReaction";
import { useNpcImpact } from "@/game/traffic/useNpcImpact";
import { AMBIENT_PROFILES, crossingGap } from "./ambient-profiles";
import { NPC_CONFIG, populationForQuality, type NpcConfig } from "./population";
import { LodAvatar } from "./LodAvatar";
import { Barks, type BarkActor } from "./NpcBarks";
import { Peci, QuestMarker } from "./QuestMarker";
import {
  WATCH_DIST,
  quarrelAnim,
  quarrelLine,
  punchLanded,
  quarrelRole,
  quarrels,
  startPunch,
  startQuarrel,
  stepQuarrel,
} from "./quarrel";
import { ownVehicle } from "@/game/vehicles/runtime";
import { miniParticipant } from "@/game/minigames/store";
import { useHud } from "@/state/hud-store";
import { conversationStep, createBehavior, pauseDuration, turnToward } from "./behavior";

// Quality-budgeted actors, no pathfinding/raycasts. Existing worker simulation stays separate.
const actors = new Map<string, Group>();
const CONFIG = new Map(NPC_CONFIG.map((n) => [n.id, n]));
function AmbientNpc({ config: c }: { config: NpcConfig }) {
  const ref = useRef<Group>(null);
  const parcel = useRef<Group>(null);
  const brain = useRef(createBehavior(c.seed));
  const gait = useRef(0);
  const animation = useRef<AvatarAnimation | undefined>(c.seat ? "Sit" : "Idle");
  const canInteract = useRef(true);
  const crossing = useRef(false);
  const nextScan = useRef(0);
  const said = useRef<string | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const pose = useRef<Group>(null);
  const { hit: knock, knocked } = useNpcImpact(c.id, ref, pose, !c.seat && !c.questGiver, () => {
    canInteract.current = false;
  });
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
    if (!knock.current.recovered) {
      animation.current = "Idle";
      gait.current = 0;
      return;
    }
    // 0.12 s keeps walking speed real down to ~8 FPS on phones (0.05 made NPCs crawl at low FPS).
    const dt = Math.min(raw, 0.12),
      s = brain.current,
      game = useGame.getState();
    const inRoad = c.profile === "crossing-pedestrian" && g.position.z > 16 && g.position.z < 24;
    canInteract.current = !inRoad;
    const talking = !inRoad && game.activeNpc === c.id && game.overlay === "dialogue";
    gait.current = 0;
    const q = quarrels.active;
    const who = q && !talking ? quarrelRole(q, c.id) : null;
    if (q && who !== null) {
      const o = actors.get((who === 0 ? q.b : q.a) ?? "")?.position;
      animation.current = quarrelAnim(q, who);
      const fx = (o ? o.x : game.playerPos[0]) - g.position.x,
        fz = (o ? o.z : game.playerPos[2]) - g.position.z,
        gap = Math.hypot(fx, fz);
      // Punch: aggressor charges, victim bolts, breaker walks over. No collision: it is a few metres.
      const run =
        q.phase === "CHARGE" && who === 0 ? 4.6 : q.phase === "FLEE" && who === 1 ? -4 : 0;
      const walk = q.phase === "BREAK" && who === 2 && gap > 1.8 ? 2.4 : 0;
      const step = ((run || walk) * dt) / Math.max(gap, 0.01);
      if (o && run && (run < 0 || gap > 1)) {
        g.position.x += fx * step;
        g.position.z += fz * step;
      }
      if (walk && o) {
        g.position.x += fx * step;
        g.position.z += fz * step;
      }
      if (q.phase === "CHARGE" && who === 0 && gap <= 1) punchLanded(q);
      if (q.phase !== "FALL")
        g.rotation.y = turnToward(g.rotation.y, Math.atan2(fx, fz) + (run < 0 ? Math.PI : 0), dt);
      const l = quarrelLine(q);
      const text = l && l.who === who ? l.text : null;
      if (text !== said.current) setSay((said.current = text));
      return;
    }
    if (said.current !== null) setSay((said.current = null));
    const pa =
      q && !talking && !c.seat && !c.questGiver && c.role !== "kasir"
        ? actors.get(q.a)?.position
        : undefined;
    if (pa && Math.hypot(pa.x - g.position.x, pa.z - g.position.z) < WATCH_DIST) {
      // Neighbours stop to watch; some film it.
      animation.current = c.seed % 2 || q?.kind === "punch" ? "UsePhone" : "Idle";
      g.rotation.y = turnToward(
        g.rotation.y,
        Math.atan2(pa.x - g.position.x, pa.z - g.position.z),
        dt,
      );
      return;
    }
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
        animation.current = c.stops?.[s.target] ?? activity;
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
        let bumped: string | null = null;
        for (const [id, other] of actors) {
          if (id !== c.id && Math.hypot(other.position.x - nx, other.position.z - nz) < 0.85) {
            occupied = true;
            const o = CONFIG.get(id);
            if (o && o.speed > 0 && !o.seat) bumped = id;
            break;
          }
        }
        // Bumping a walker (or the player blocking one) starts a quarrel, unless busy or low budget.
        if (
          (bumped !== null || playerAhead) &&
          !inRoad &&
          useRenderBudget.getState().tier !== "LOW" &&
          game.activeNpc !== c.id &&
          game.activeNpc !== bumped
        )
          startQuarrel(quarrels, c.id, bumped, c.seed + Math.floor(quarrels.now));
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
      animation.current = c.seat
        ? "Sit"
        : s.state === "WORK"
          ? (c.stops?.[s.target] ?? activity)
          : "Idle";
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
    // Audible only during existing cashier work; its animation remains authoritative.
    const now = performance.now();
    if (c.role === "kasir" && s.state === "WORK" && !talking && now > nextScan.current) {
      nextScan.current = now + 6000 + Math.random() * 9000;
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
        <group ref={pose} position-y={c.seat ? 0.2 : 0}>
          {c.questGiver ? (
            <BaseAvatarV2
              avatar={NPC_AVATARS[c.avatarId ?? c.id]}
              speed={gait}
              animation={animation}
              groundToWorld
              playerAvatar
            />
          ) : (
            <LodAvatar
              lodId={c.id}
              avatarId={c.avatarId ?? c.id}
              speed={gait}
              animation={animation}
              groundToWorld
            />
          )}
          {c.questGiver && <Peci />}
        </group>
        <NpcLabel text={c.label} />
        {c.questGiver && <QuestMarker host="walikota" />}
        {say && <SpeechBubble senderId={c.id} text={say} height={2.3} />}
        {knocked && <ImpactVfx hit={knock} />}
        {(c.carry || c.id === "npc-courier") && (
          <group ref={parcel} position={[0, 0.98, 0.42]}>
            <mesh>
              <boxGeometry args={[0.38, 0.3, 0.32]} />
              <meshStandardMaterial color="#be9564" />
            </mesh>
          </group>
        )}
      </group>
      <PersonCollider target={ref} npcId={c.id} disabled={knocked} />
    </>
  );
}
const isWalker = (id: string) => {
  const n = CONFIG.get(id);
  return !!n && n.speed > 0 && !n.seat && n.profile !== "crossing-pedestrian" && n.role !== "kasir";
};
const dist = (p: Group, q: Group) =>
  Math.hypot(p.position.x - q.position.x, p.position.z - q.position.z);
/** Ticks the quarrel clock and rolls "Preman Iseng" punches; dev `?npc=quarrel|punch` forces one next to the player. */
function QuarrelDriver() {
  const dev = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("npc") : null;
  const forced = useRef(dev === "quarrel" || dev === "punch");
  const wait = useRef(0);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.12);
    stepQuarrel(quarrels, dt);
    const ag = quarrels.active && actors.get(quarrels.active.a)?.position;
    quarrels.at = ag ? [ag.x, ag.z] : null;
    wait.current += dt;
    const [px, , pz] = useGame.getState().playerPos;
    const game = useGame.getState();
    const free =
      !quarrels.active &&
      useRenderBudget.getState().tier !== "LOW" &&
      game.overlay === "none" &&
      !game.activeNpc &&
      !useHud.getState().sheet &&
      !ownVehicle() &&
      !miniParticipant();
    if (dev === "punch" && forced.current) {
      if (wait.current < 2) return;
      wait.current = 0;
      const w = [...actors].filter(([id]) => isWalker(id));
      if (w.length < 2) return;
      quarrels.nextPunch = 0;
      if (!startPunch(quarrels, w[0]![0], w[1]![0], 1, w[2]?.[0] ?? null)) return;
      forced.current = false;
      w[0]![1].position.set(px + 6, 0, pz + 2);
      w[1]![1].position.set(px + 2, 0, pz + 2);
      w[2]?.[1].position.set(px + 3, 0, pz + 5);
      return;
    }
    // Random punch: an aggressor within ~15 m runs at its nearest walker neighbour.
    if (free && quarrels.now >= quarrels.nextPunch && wait.current >= 3) {
      wait.current = 0;
      const near = [...actors].filter(
        ([id, g]) => isWalker(id) && Math.hypot(g.position.x - px, g.position.z - pz) < 15,
      );
      const a = near[Math.floor(Math.random() * near.length)];
      const victim = a
        ? [...actors]
            .filter(
              ([id, g]) =>
                id !== a[0] &&
                isWalker(id) &&
                Math.hypot(g.position.x - a[1].position.x, g.position.z - a[1].position.z) < 9,
            )
            .sort((x, y) => dist(x[1], a[1]) - dist(y[1], a[1]))[0]
        : undefined;
      const by = [...actors].find(
        ([id, g]) =>
          id !== a?.[0] &&
          id !== victim?.[0] &&
          !CONFIG.get(id)?.seat &&
          !CONFIG.get(id)?.questGiver &&
          Math.hypot(g.position.x - px, g.position.z - pz) < 14,
      );
      if (a && victim)
        startPunch(quarrels, a[0], victim[0], Math.floor(Math.random() * 1000), by?.[0] ?? null);
    }
    if (!forced.current || dev !== "quarrel" || wait.current < 2) return;
    wait.current = 0;
    const walkers = [...actors].filter(([id]) => {
      const n = CONFIG.get(id);
      return n && n.speed > 0 && !n.seat && n.profile !== "crossing-pedestrian";
    });
    if (walkers.length < 2 || !startQuarrel(quarrels, walkers[0]![0], walkers[1]![0], 1)) return;
    forced.current = false;
    walkers[0]![1].position.set(px + 2, 0, pz + 2);
    walkers[1]![1].position.set(px + 2.7, 0, pz + 2);
  });
  return null;
}
const cityBarks = (): BarkActor[] =>
  [...actors].map(([id, g]) => ({
    id,
    role: CONFIG.get(id)?.bark ?? CONFIG.get(id)?.role ?? "warga",
    x: g.position.x,
    z: g.position.z,
  }));
export function Npcs() {
  return (
    <group name="MapV2-NPCs">
      <QuarrelDriver />
      <Barks list={cityBarks} warung={[-3.2, 6.2]} />
      {populationForQuality(LOW_QUALITY).map((c) => (
        <AmbientNpc key={c.id} config={c} />
      ))}
    </group>
  );
}
