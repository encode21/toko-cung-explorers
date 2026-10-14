import { atConcert } from "@/game/club/venue-layout";
import { chooseSpawn, shouldYieldSpawn, spawnPreference } from "./spawn";
import { WALKABLE_POINTS } from "@/game/world/outdoor-layout";
import { PlayerChatBubble } from "@/game/net/PlayerChatBubble";
import { LocalPlayerNameBadge } from "@/game/net/PlayerNameBadge";
import { useGameplayZoom } from "./useGameplayZoom";
import { useCameraZoom } from "./camera-zoom";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useDungeon, isDungeonRoom } from "@/game/dungeon/store";
import { DungeonParcel } from "@/game/dungeon/DungeonScene";
import { useChannels } from "@/net/channel-store";
/** @jsxImportSource @/game/jsx */
import { missionInteraction } from "@/game/missions/runtime";
import { useMissions } from "@/game/missions/store";
import { MissionParcel } from "@/game/missions/MissionParcel";
import { useWorldEditor } from "@/game/editor/store";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  interactionGroups,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useClub, stopDanceOnMove } from "@/game/club/store";
import { connectionId } from "@/net/channel-store";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { INTERACTABLES } from "@/game/interactions/interactables";
import { dynamicInteractables } from "@/game/interactions/dynamic";
import { SPAWN, STORE } from "@/game/world/layout";
import { BENCHES, benchSitPose, PLAYER_VISUAL_DROP } from "@/game/world/street-props";
import { useKeyboard } from "@/game/player/useKeyboard";
import { useMouseDrive } from "@/game/player/useMouseDrive";
import { consumeTouchLook, getTouchDrive } from "@/game/player/touch-drive";
import { useControls } from "@/game/player/control-state";
import { useGame, type NearbyTarget } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useProfile } from "@/identity/profile-store";
import { trafficActors, vehicleBlocks } from "@/game/traffic/traffic-runtime";
import {
  canImpact,
  impactVelocity,
  hitDurationFor,
  INVULNERABILITY,
} from "@/game/traffic/traffic-math";
import { emptyImpact, ImpactVfx } from "@/game/traffic/ImpactReaction";
import { findNearestWalkablePosition } from "@/game/world/outdoor-layout";
import { LOW_QUALITY } from "@/game/engine/quality";
import { footSurfaceAt, footTravel } from "@/game/audio/world-acoustics";
import { playFootstepSfx } from "@/game/audio/sfx";
import { playerId, remoteStates } from "@/net/useWorldChannel";
import { setLocalNetAnim } from "@/net/local-pose";
import {
  consumeSocialHit,
  cancelSocialPoseOnMove,
  cancelChatEmote,
  getActiveChatEmote,
  peekLocalSocialAnim,
  registerChatEmoteGuard,
  registerLocalPose,
} from "@/game/social/social-actions";

const WALK = 4.2;
const RUN = 7.4;
const JUMP = 6.4;
const STAND_Y = PLAYER_VISUAL_DROP;
const CAM_DIST = 10.5;
const CAM_DIST_IN = 4.4;
const CAM_MIN_DIST = 0.15;
const PITCH_MIN = 0.12;
const PITCH_MAX = 0.78;
const LOOK_YAW_SENS = 0.0055;
const LOOK_PITCH_SENS = 0.0042;
const CAM_COLLIDE_BIAS = 0.28;

export function Player() {
  const [spawn] = useState(() => {
    const dungeonSpawn = useDungeon.getState().spawn;
    if (dungeonSpawn) return dungeonSpawn;
    const slot = spawnPreference(connectionId, 9);
    return [
      SPAWN[0] + ((slot % 3) - 1) * 1.1,
      SPAWN[1],
      SPAWN[2] + (Math.floor(slot / 3) - 1) * 1.1,
    ] as [number, number, number];
  });
  const spawnPlacement = useRef({ placed: false, finished: isDungeonRoom(), elapsed: 0 });
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null);
  const keys = useKeyboard();
  const drive = useMouseDrive();
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);
  const canvas = useThree((s) => s.gl.domElement);

  useGameplayZoom(canvas);
  const { world, rapier } = useRapier();
  const yaw = useRef(0);
  const pitch = useRef(isDungeonRoom() ? 0.3 : 0.18);
  const camDist = useRef(CAM_DIST);
  const camPos = useRef(new THREE.Vector3(spawn[0], spawn[1] + 3.4, spawn[2] + CAM_DIST));
  const lookAt = useRef(new THREE.Vector3(...spawn));
  const syncTimer = useRef(0);
  const gait = useRef(0);
  const stepPhase = useRef(0);
  const stepPosition = useRef<{ x: number; z: number } | null>(null);
  const strideLength = useRef(1.45);
  const lastSeat = useRef<(typeof BENCHES)[number] | null>(null);
  const avatarAnimation = useRef<AvatarAnimation | undefined>(undefined);
  const impact = useRef(emptyImpact());
  const safetyShape = useMemo(() => new rapier.Capsule(0.43, 0.37), [rapier]);
  const cameraShape = useMemo(() => new rapier.Ball(0.18), [rapier]);
  const cameraRotation = useMemo(() => ({ x: 0, y: 0, z: 0, w: 1 }), []);
  const profile = useProfile((s) => s.profile);
  const appearanceDraft = useProfile((s) => s.appearanceDraft);

  useEffect(() => {
    useControls.getState().setPlayerReady(true);
    registerLocalPose(() => {
      const p = body.current?.translation();
      return p ? { x: p.x, z: p.z } : null;
    });
    registerChatEmoteGuard(() => {
      const rb = body.current;
      if (!rb || !useChannels.getState().playing) return "Tunggu sampai karakter siap.";
      const game = useGame.getState();
      const hud = useHud.getState();
      if (useDungeon.getState().transition || game.pendingTeleport)
        return "Tunggu sampai perpindahan selesai.";
      if (game.sitting) return "Berdiri dari bangku dulu untuk memakai emote.";
      if (clock.elapsedTime - impact.current.at < hitDurationFor(impact.current.kind))
        return "Tunggu sampai karakter pulih.";
      if (
        game.overlay !== "none" ||
        hud.sheet !== null ||
        hud.principalPanel !== null ||
        useWorldEditor.getState().mode === "EDITOR"
      )
        return "Tutup panel lain dulu untuk memakai emote.";
      const velocity = rb.linvel();
      if (
        useControls.getState().jumpQueued ||
        Math.abs(velocity.y) > 0.55 ||
        avatarAnimation.current === "Jump"
      )
        return "Tunggu sampai karakter mendarat.";
      const key = keys.current;
      const touch = getTouchDrive();
      if (
        key.forward ||
        key.back ||
        key.left ||
        key.right ||
        (drive.current.active && Math.abs(drive.current.throttle) > 0.02) ||
        (touch.active && Math.hypot(touch.moveX, touch.moveY) > 0.02) ||
        Math.hypot(velocity.x, velocity.z) > 0.25
      )
        return "Berhenti bergerak dulu untuk memakai emote.";
      return null;
    });
    trafficActors.set("player", {
      position: () =>
        useClub.getState().inside && !useClub.getState().outdoor
          ? null
          : (body.current?.translation() ?? null),
      hit: (vehicle, now) => {
        const rb = body.current;
        if (
          !rb ||
          (useClub.getState().inside && !useClub.getState().outdoor) ||
          !canImpact(now, impact.current.at)
        )
          return false;
        const p = rb.translation();
        const kind = vehicle.kind === "truck" ? "truck" : "car";
        const velocity = impactVelocity(p, { ...vehicle, kind });
        impact.current = {
          at: now,
          x: p.x,
          z: p.z,
          vx: velocity.x,
          vz: velocity.z,
          vy: velocity.y,
          kind,
          recovered: false,
        };
        useGame.getState().setSitting(false);
        // Saat terpental/jatuh: lepas static supaya tidak tersangkut bangku/trotoar.
        rb.collider(0).setCollisionGroups(interactionGroups(1, kind === "truck" ? [] : [0]));
        rb.setLinvel(velocity, true);
        if (visual.current) visual.current.rotation.y = Math.atan2(velocity.x, velocity.z);
        return true;
      },
    });
    return () => {
      registerLocalPose(null);
      registerChatEmoteGuard(null);
      setLocalNetAnim(undefined);
      useControls.getState().setPlayerReady(false);
      trafficActors.delete("player");
    };
  }, [clock, drive, keys]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const rb = body.current;
    if (!rb) return;
    if (useWorldEditor.getState().mode === "EDITOR") {
      cancelChatEmote();
      setLocalNetAnim(undefined);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const overlayLocked = gameUiBlocked() || useGame.getState().overlay !== "none";
    const sheetLocked =
      useHud.getState().sheet !== null || useHud.getState().principalPanel !== null;

    // Pukulan dari pemain lain — Fall sama seperti ketabrak mobil.
    const social = consumeSocialHit();
    if (
      !isDungeonRoom() &&
      !(useClub.getState().inside && !useClub.getState().outdoor) &&
      social &&
      canImpact(clock.elapsedTime, impact.current.at)
    ) {
      impact.current = {
        at: clock.elapsedTime,
        x: rb.translation().x,
        z: rb.translation().z,
        vx: social.vx,
        vz: social.vz,
        vy: social.vy,
        kind: "car",
        recovered: false,
      };
      useGame.getState().setSitting(false);
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0]));
      rb.setLinvel({ x: social.vx, y: social.vy, z: social.vz }, true);
      if (visual.current) visual.current.rotation.y = Math.atan2(social.vx, social.vz);
    }

    const hitAge = clock.elapsedTime - impact.current.at;
    const hitKind = impact.current.kind;
    const recovering = hitAge < hitDurationFor(hitKind);
    const locked =
      !useChannels.getState().playing ||
      useDungeon.getState().transition ||
      overlayLocked ||
      sheetLocked ||
      recovering;
    const game = useGame.getState();
    // DEV/world teleports must move the rigidbody — zustand playerPos alone is display sync.
    if (game.pendingTeleport) {
      cancelChatEmote();
      spawnPlacement.current.finished = true;
      lastSeat.current = null;
      const target = game.pendingTeleport;
      const blocked = (p: { x: number; z: number }) =>
        vehicleBlocks(p) ||
        Boolean(
          world.intersectionWithShape(
            { x: p.x, y: 0.88, z: p.z },
            cameraRotation,
            safetyShape,
            undefined,
            undefined,
            undefined,
            rb,
          ),
        );
      const safe = (target[1] < -5
        ? null
        : findNearestWalkablePosition({ x: target[0], z: target[2] }, blocked)) ?? {
        x: target[0],
        z: target[2],
      };
      rb.setTranslation({ x: safe.x, y: target[1] < -5 ? target[1] : STAND_Y, z: safe.z }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      useGame.setState({
        pendingTeleport: null,
        playerPos: [safe.x, target[1] < -5 ? target[1] : STAND_Y, safe.z],
        sitting: false,
        sittingBenchId: null,
      });
    }
    if (recovering && game.sitting) game.setSitting(false);
    if (!game.sitting && hitAge >= INVULNERABILITY) {
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
    }
    if (
      !recovering &&
      !impact.current.recovered &&
      !(useClub.getState().inside && !useClub.getState().outdoor)
    ) {
      impact.current.recovered = true;
      const current = rb.translation();
      const blocked = (p: { x: number; z: number }) =>
        vehicleBlocks(p) ||
        Boolean(
          world.intersectionWithShape(
            { x: p.x, y: 0.88, z: p.z },
            cameraRotation,
            safetyShape,
            undefined,
            undefined,
            undefined,
            rb,
          ),
        );
      if (
        vehicleBlocks(current) ||
        (!(useClub.getState().inside && !useClub.getState().outdoor) && current.y < 0.2) ||
        Math.abs(current.x) > 53 ||
        Math.abs(current.z) > 53
      ) {
        const safe = findNearestWalkablePosition(current, blocked);
        if (safe) {
          rb.setTranslation({ x: safe.x, y: STAND_Y, z: safe.z }, true);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }
    const k = keys.current;

    const mouse = drive.current;
    const look = locked ? { x: 0, y: 0 } : consumeTouchLook();
    if (!locked) {
      if (k.yawLeft) yaw.current += delta * 2;
      if (k.yawRight) yaw.current -= delta * 2;
      if (mouse.active && mouse.turn !== 0) yaw.current += mouse.turn * delta * 2.4;
      yaw.current -= look.x * LOOK_YAW_SENS;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current + look.y * LOOK_PITCH_SENS,
        PITCH_MIN,
        PITCH_MAX,
      );
    }

    // `forward` = arah dari pemain ke kamera; gerak maju = berlawanan vektor ini.
    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const touch = getTouchDrive();
    const move = new THREE.Vector3();
    if (!locked) {
      if (k.forward) move.sub(forward);
      if (k.back) move.add(forward);
      if (k.left) move.sub(right);
      if (k.right) move.add(right);
      if (mouse.active && Math.abs(mouse.throttle) > 0.02) {
        move.addScaledVector(forward, -mouse.throttle);
      }
      if (touch.active) {
        // Stick: X+ = kanan, Y+ (jari ke bawah) = mundur → Y- = maju.
        move.addScaledVector(right, touch.moveX);
        move.addScaledVector(forward, touch.moveY);
      }
    }

    // Resolve late simultaneous arrivals only while still idle at the entry point.
    const placement = spawnPlacement.current;
    placement.elapsed += delta;
    if (
      move.lengthSq() > 0 ||
      useControls.getState().jumpQueued ||
      game.pendingTeleport ||
      game.sitting ||
      getActiveChatEmote() !== null ||
      recovering ||
      (useClub.getState().inside && !useClub.getState().outdoor) ||
      isDungeonRoom() ||
      placement.elapsed > 10
    ) {
      placement.finished = true;
    }
    const peers = [...remoteStates.values()];
    if (
      !placement.finished &&
      (!placement.placed || shouldYieldSpawn(playerId, rb.translation(), peers))
    ) {
      const candidates = WALKABLE_POINTS.filter(
        (point) => Math.hypot(point.x - SPAWN[0], point.z - SPAWN[2]) < 7,
      ).map((point) => ({ ...point, y: STAND_Y }));
      const point = chooseSpawn(
        playerId,
        candidates,
        peers,
        (candidate) =>
          vehicleBlocks(candidate) ||
          Boolean(
            world.intersectionWithShape(
              { ...candidate, y: 0.88 },
              cameraRotation,
              safetyShape,
              undefined,
              undefined,
              undefined,
              rb,
            ),
          ),
      );
      if (point) {
        rb.setTranslation(point, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        useGame.getState().setPlayerPos([point.x, point.y, point.z], false, 0);
        placement.placed = true;
      }
    }

    // A hit releases the seat; movement alone keeps the player seated.
    if (game.sitting && recovering) {
      game.setSitting(false);
    }
    // The first jump input stands up; consume it before applying a jump impulse.
    if (!locked && useGame.getState().sitting && useControls.getState().consumeJump()) {
      useGame.getState().interact();
    }

    const sitting = useGame.getState().sitting;
    const sittingBench = sitting
      ? BENCHES.find((b) => b.id === useGame.getState().sittingBenchId)
      : undefined;

    if (!sitting && lastSeat.current && !recovering) {
      const bench = lastSeat.current;
      rb.setTranslation(
        {
          x: bench.position[0] + Math.sin(bench.yaw) * (bench.standDistance ?? 1.05),
          y: bench.position[1] + STAND_Y,
          z: bench.position[2] + Math.cos(bench.yaw) * (bench.standDistance ?? 1.05),
        },
        true,
      );
      stepPosition.current = null;
    }
    lastSeat.current = sittingBench ?? null;

    const dragIntensity = touch.active
      ? Math.min(1, Math.hypot(touch.moveX, touch.moveY))
      : mouse.active
        ? Math.abs(mouse.throttle)
        : 0;
    const analog =
      move.lengthSq() > 0 && !k.forward && !k.back && !k.left && !k.right
        ? Math.min(1, dragIntensity)
        : 1;
    const speed = (k.run ? RUN : WALK) * Math.max(0.25, analog);
    const vel = rb.linvel();
    // Dungeon floors can be above ground level; reuse Rapier collision geometry for foot contact.
    const dungeonFloor =
      isDungeonRoom() ||
      atConcert(useGame.getState().playerPos) ||
      (useClub.getState().inside && !useClub.getState().outdoor)
        ? world.castRay(
            new rapier.Ray(rb.translation(), { x: 0, y: -1, z: 0 }),
            STAND_Y + 0.18,
            true,
            undefined,
            interactionGroups(1, [0]),
            undefined,
            rb,
          )
        : null;
    const grounded =
      !recovering &&
      (isDungeonRoom() ||
      atConcert(useGame.getState().playerPos) ||
      (useClub.getState().inside && !useClub.getState().outdoor)
        ? !!dungeonFloor && vel.y < 3
        : Math.abs(vel.y) < 0.45 && rb.translation().y < STAND_Y + 0.35);
    if (sitting) useControls.getState().consumeJump();
    if (!locked && grounded && !sitting && useControls.getState().jumpQueued) {
      cancelChatEmote();
      useControls.getState().consumeJump();
      rb.setLinvel({ x: vel.x, y: JUMP, z: vel.z }, true);
    }
    const airborne =
      !sitting &&
      (isDungeonRoom() ||
      atConcert(useGame.getState().playerPos) ||
      (useClub.getState().inside && !useClub.getState().outdoor)
        ? !grounded
        : rb.linvel().y > 0.55 || rb.translation().y > STAND_Y + 0.28);

    if (recovering) {
      if (hitKind === "truck") {
        const fade = hitAge < 0.4 ? Math.exp(-4.2 * hitAge) : 0;
        const pop = hitAge < 0.22 ? impact.current.vy * (1 - hitAge / 0.22) : Math.min(vel.y, 0);
        rb.setLinvel(
          { x: impact.current.vx * fade, y: pop > 0 ? pop : vel.y, z: impact.current.vz * fade },
          true,
        );
      } else {
        const fade = hitAge < 0.7 ? Math.exp(-3.5 * hitAge) : 0;
        rb.setLinvel({ x: impact.current.vx * fade, y: vel.y, z: impact.current.vz * fade }, true);
      }
    } else if (sitting && sittingBench) {
      // Bangku collider mendorong capsule → float; matikan static saat duduk.
      rb.collider(0).setCollisionGroups(interactionGroups(1, [2]));
      const seat = benchSitPose(sittingBench);
      const cur = rb.translation();
      const t = 1 - Math.exp(-16 * delta);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setTranslation(
        {
          x: THREE.MathUtils.lerp(cur.x, seat.x, t),
          y: THREE.MathUtils.lerp(cur.y, seat.y, t),
          z: THREE.MathUtils.lerp(cur.z, seat.z, t),
        },
        true,
      );
      if (visual.current) {
        const diff = Math.atan2(
          Math.sin(seat.yaw - visual.current.rotation.y),
          Math.cos(seat.yaw - visual.current.rotation.y),
        );
        visual.current.rotation.y += diff * Math.min(1, t * 1.4);
      }
    } else if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      rb.setLinvel({ x: move.x, y: rb.linvel().y, z: move.z }, true);
      if (visual.current) {
        const target = Math.atan2(move.x, move.z);
        const diff = Math.atan2(
          Math.sin(target - visual.current.rotation.y),
          Math.cos(target - visual.current.rotation.y),
        );
        visual.current.rotation.y += diff * (1 - Math.exp(-14 * delta));
      }
    } else {
      rb.setLinvel({ x: 0, y: rb.linvel().y, z: 0 }, true);
    }

    if (!sitting && !recovering) {
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
    }

    if (move.lengthSq() > 0 || airborne || sitting || recovering) stopDanceOnMove();
    if (
      move.lengthSq() > 0 ||
      airborne ||
      recovering ||
      sitting ||
      !useChannels.getState().playing ||
      useDungeon.getState().transition
    )
      cancelSocialPoseOnMove();
    const socialAnim = peekLocalSocialAnim();
    if (getActiveChatEmote()) stopDanceOnMove();
    avatarAnimation.current = recovering
      ? hitKind === "truck"
        ? "Hit"
        : hitAge < 0.22
          ? "Hit"
          : hitAge < 0.65
            ? "Fall"
            : "GetUp"
      : socialAnim
        ? socialAnim
        : sitting
          ? "Sit"
          : airborne
            ? "Jump"
            : undefined;
    if (!avatarAnimation.current && !recovering) {
      const mission = useMissions.getState().session.active;
      if (mission?.carrying) avatarAnimation.current = "CarryBox";
      else if (mission?.lastActionAt && Date.now() - mission.lastActionAt < 700)
        avatarAnimation.current = "Checkout";
    }
    setLocalNetAnim(avatarAnimation.current);

    const moving = move.lengthSq() > 0 && !sitting && !airborne;
    // Commanded speed (not position delta): physics hitches were restarting Walk
    // and making timeScale stutter. Avatar hysteresis still handles stop→Idle.
    gait.current = THREE.MathUtils.damp(gait.current, moving && !recovering ? speed : 0, 14, delta);

    // Sound follows measured displacement; animation retains its stable commanded gait.
    const footPos = rb.translation();
    const last = stepPosition.current;
    const travel = footTravel(
      last ? Math.hypot(footPos.x - last.x, footPos.z - last.z) : 0,
      delta,
      grounded && !airborne && !sitting && !recovering && !locked,
    );
    stepPosition.current = { x: footPos.x, z: footPos.z };
    if (travel > 0) {
      stepPhase.current += travel;
      if (stepPhase.current >= strideLength.current) {
        stepPhase.current = 0;
        strideLength.current = (k.run ? 1.8 : 1.45) * (0.96 + Math.random() * 0.08);
        playFootstepSfx(Math.min(1, travel / delta / RUN), footSurfaceAt(footPos.x, footPos.z));
      }
    } else if (!moving || !grounded || recovering || locked || delta >= 0.15) {
      stepPhase.current = 0;
    }
    // A render frame without a physics step contributes no distance, but must not
    // erase travel accumulated at the mobile 40 Hz physics rate.

    // Orbit third-person: yaw + pitch spherical, follow halus, hindari tembus dinding.
    const p = rb.translation();
    const indoor =
      useGame.getState().inside ||
      isDungeonRoom() ||
      (useClub.getState().inside && !useClub.getState().outdoor);
    const targetDist =
      (isDungeonRoom() ? 6.6 : indoor ? CAM_DIST_IN : CAM_DIST) * useCameraZoom.getState().distance;
    camDist.current = THREE.MathUtils.lerp(camDist.current, targetDist, 1 - Math.exp(-4 * delta));

    // Frame the taller landmark outdoors; retain the close indoor shopping camera.
    const focusY = p.y + (isDungeonRoom() ? 1.1 : indoor ? 0.55 : 2.3);
    const focus = new THREE.Vector3(p.x, focusY, p.z);
    const cosPitch = Math.cos(pitch.current);
    const sinPitch = Math.sin(pitch.current);
    const ideal = new THREE.Vector3(
      p.x + Math.sin(yaw.current) * camDist.current * cosPitch,
      Math.min(
        isDungeonRoom() ? 11 : indoor ? STORE.wallHeight - 0.25 : Infinity,
        focusY + camDist.current * sinPitch * 0.85 + 0.35,
      ),
      p.z + Math.cos(yaw.current) * camDist.current * cosPitch,
    );

    const toCam = ideal.clone().sub(focus);
    const idealLen = toCam.length();
    let finalDist = idealLen;
    if (idealLen > 0.001) {
      const dir = toCam.multiplyScalar(1 / idealLen);
      // Sweep the near-plane volume through Rapier's broadphase, not product triangles.
      const hit = world.castShape(
        focus,
        cameraRotation,
        dir,
        cameraShape,
        0,
        idealLen,
        true,
        undefined,
        undefined,
        undefined,
        rb,
        (collider) =>
          !(collider.parent()?.userData as { cameraPassThrough?: boolean } | undefined)
            ?.cameraPassThrough,
      );
      if (hit) finalDist = Math.max(CAM_MIN_DIST, hit.time_of_impact - CAM_COLLIDE_BIAS);
    }

    const desired =
      idealLen > 0.001
        ? focus.clone().add(ideal.clone().sub(focus).normalize().multiplyScalar(finalDist))
        : ideal;

    const follow = 1 - Math.exp(-7 * delta);
    const lookFollow = 1 - Math.exp(-9 * delta);
    camPos.current.lerp(desired, follow);
    // Recheck the interpolated position: smoothing must never travel through a wall.
    const safeDir = camPos.current.clone().sub(focus);
    const safeLen = safeDir.length();
    if (safeLen > 0.001) {
      safeDir.divideScalar(safeLen);
      const hit = world.castShape(
        focus,
        cameraRotation,
        safeDir,
        cameraShape,
        0,
        safeLen,
        true,
        undefined,
        undefined,
        undefined,
        rb,
        (collider) =>
          !(collider.parent()?.userData as { cameraPassThrough?: boolean } | undefined)
            ?.cameraPassThrough,
      );
      if (hit)
        camPos.current
          .copy(focus)
          .addScaledVector(safeDir, Math.max(CAM_MIN_DIST, hit.time_of_impact - CAM_COLLIDE_BIAS));
    }
    lookAt.current.lerp(focus, lookFollow);
    camera.position.copy(camPos.current);
    camera.lookAt(lookAt.current);
    if (hitAge < 0.23) {
      // Angular shake leaves the already collision-safe camera position untouched.
      const amount = (LOW_QUALITY ? 0.006 : 0.012) * (1 - hitAge / 0.23);
      camera.rotateZ(Math.sin(hitAge * 95) * amount);
      camera.rotateX(Math.cos(hitAge * 80) * amount * 0.5);
    }

    let best: NearbyTarget | null = null;
    let bestDist = Infinity;
    for (const it of isDungeonRoom() ? [] : [...INTERACTABLES, ...dynamicInteractables()]) {
      if (Math.abs(it.position[1] - (p.y - 0.83)) > 1.8) continue;
      const dx = it.position[0] - p.x;
      const dz = it.position[2] - p.z;
      const d = Math.hypot(dx, dz);
      if (d < it.radius && d < bestDist) {
        bestDist = d;
        best = { id: it.id, label: it.label, kind: it.kind };
      }
    }
    for (const [id, s] of remoteStates) {
      if (id === playerId || Math.abs(s.y - p.y) > 2) continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 2.4 && d < bestDist) {
        bestDist = d;
        best = { id, label: s.name, kind: "player" };
      }
    }
    const missionPoint = isDungeonRoom() ? null : missionInteraction();
    if (
      missionPoint &&
      Math.abs(p.y - 0.83 - missionPoint.position[1]) < 1.5 &&
      Math.hypot(p.x - missionPoint.position[0], p.z - missionPoint.position[2]) <
        missionPoint.radius
    )
      best = { id: missionPoint.id, label: missionPoint.label, kind: "mission" };
    // Physical club doors use the same nearby/F/touch interaction as seats.
    if (!isDungeonRoom())
      for (const door of useWorldEditor.getState().targets) {
        if (!door.active || door.type !== "CLUB_ENTRANCE") continue;
        const interior = useClub.getState().inside && !useClub.getState().outdoor;
        if (door.position.y < -5 !== interior) continue;
        if (
          Math.hypot(p.x - door.position.x, p.y - 0.83 - door.position.y, p.z - door.position.z) < 3
        ) {
          best = {
            id: door.id,
            label: door.tags.includes("club-exit") ? "Keluar ke kota" : "Masuk Cung Underground",
            kind: "door",
          };
          break;
        }
      }
    // Keep the exit action reachable even when another actor approaches the seat.
    if (sitting && sittingBench)
      best = { id: sittingBench.id, label: sittingBench.label, kind: "bench" };
    useGame.getState().setNearby(isDungeonRoom() ? null : best);

    syncTimer.current += delta;
    if (syncTimer.current > 0.15) {
      syncTimer.current = 0;
      const inside =
        !isDungeonRoom() &&
        !(useClub.getState().inside && !useClub.getState().outdoor) &&
        p.x > STORE.minX &&
        p.x < STORE.maxX &&
        p.z > -22 &&
        p.z < STORE.maxZ;
      useGame.getState().setPlayerPos([p.x, p.y, p.z], inside, visual.current?.rotation.y ?? 0);
    }
  });

  return (
    <RigidBody
      name="Player"
      ref={body}
      colliders={false}
      position={spawn}
      enabledRotations={[false, false, false]}
      linearDamping={0}
      canSleep={false}
      ccd
    >
      <CapsuleCollider args={[0.45, 0.38]} collisionGroups={interactionGroups(1, [0, 2])} />
      <ImpactVfx hit={impact} />
      <LocalPlayerNameBadge height={2.2 - PLAYER_VISUAL_DROP} />
      <PlayerChatBubble senderId={playerId} height={2.48 - PLAYER_VISUAL_DROP} />
      <group ref={visual} position={[0, -0.83, 0]}>
        {!isDungeonRoom() && <MissionParcel />}
        <DungeonParcel />
        <group name="CharacterVisual" scale={1}>
          <BaseAvatarV2
            playerAvatar
            avatar={appearanceDraft ?? profile?.avatar ?? DEFAULT_AVATAR}
            character={profile?.equippedCharacter}
            speed={gait}
            animation={avatarAnimation}
            dancePlayerId={connectionId}
            groundToWorld
          />
        </group>
      </group>
    </RigidBody>
  );
}
