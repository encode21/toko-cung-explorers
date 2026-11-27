import { halteCameraCeiling } from "@/game/world/halte-camera";
import { useGang, localGangId } from "@/game/gang/store";
import { sameGang } from "@/game/gang/model";
import { applyPrologCamera } from "@/game/prolog/camera";
import { useProlog } from "@/game/prolog/store";
import { completeHomeSleepMotion, endHomeSleep, usePulang } from "@/game/prolog/pulang/steps";
import { useEnergy } from "@/game/energy/store";
import { tiredSpeedFactor } from "@/game/energy/model";
import { isGangPosition, gangFacingAt } from "@/game/gang/store";
import { currentWeather } from "@/game/weather/store";
import { floodSpeedFactor } from "@/game/weather/cycle";
import { floodSurfaceAt } from "@/game/weather/flood-surface";
import { HOME_ORIGIN, HOME_ROOM, isHomeRoom } from "@/game/home/model";
import { HOME_SOFA_SEATS, nearbyHomeSofaSeat } from "@/game/home/seats";
import { createHomeBedMotion } from "@/game/home/bed-motion";
import { miniRacePose, miniParticipant, miniCommand, useMinigames } from "@/game/minigames/store";
import { vehicleSeatAnchor } from "@/game/vehicles/definitions";
import { rideAnimation } from "@/game/vehicles/model";
import { mobilityNow } from "@/game/mobility/store";
import {
  renderedVehicleMotion,
  cancelVehicle,
  rideTelemetry,
  takeCrashThrow,
} from "@/game/vehicles/runtime";
import {
  ownVehicle,
  leaveVehicle,
  useVehicleInput,
  renderedVehicles,
  vehicleExits,
} from "@/game/vehicles/runtime";
import { rideSeatPose, type RidePose } from "@/game/vehicles/model";
/** @jsxImportSource @/game/jsx */
import { sendTruckInput, requestMission } from "@/game/missions/runtime";
import { truckPhysics, renderedTruck } from "@/game/missions/truck-state";
import { type TruckState } from "@/game/missions/truck-model";
import { flightAnimation } from "@/game/avatar/flight-clips";
import { useMobility, releaseCarry, mobilityAvailable } from "@/game/mobility/store";
import { blendCarryMount, createCarryBlend, remoteRenderPose } from "@/game/mobility/render-pose";
import { activePair, passengerPose } from "@/game/mobility/model";
import { waterAt, shouldSwim, swimVerticalVelocity, SWIM_SPEED } from "@/game/swimming/model";
import { MIN_SPLASH_DEPTH } from "@/game/swimming/splash-pool";
import { closeFishing, fishingNow, fishingAction, useFishing } from "@/game/fishing/store";
import { easyJobAnimation } from "@/game/easyjobs/store";
import { atFishingSpot, catchRevealing } from "@/game/fishing/model";
import { useObby } from "@/game/obby/store";
import {
  belowObbyRoute,
  atObbyExit,
  inObbyBounds,
  OBBY_PLATFORMS,
  platformPosition,
} from "@/game/obby/model";
import { ObbyParachute } from "@/game/obby/ObbyParachute";
import { parachuteVelocity, shouldDeployObbyParachute } from "@/game/obby/parachute";
import { WALK_SPEED as WALK, RUN_SPEED as RUN, JUMP_SPEED as JUMP } from "./movement";
import {
  JUMP_ANTICIPATION_SECONDS,
  JUMP_LANDING_SECONDS,
  isJumpAnimation,
} from "@/game/avatar/jump-clips";
import { chooseSpawn, shouldYieldSpawn, spawnPreference } from "./spawn";
import { WALKABLE_POINTS } from "@/game/world/outdoor-layout";
import { PlayerChatBubble } from "@/game/net/PlayerChatBubble";
import { LocalPlayerNameBadge } from "@/game/net/PlayerNameBadge";
import { useGameplayZoom } from "./useGameplayZoom";
import { useCameraZoom } from "./camera-zoom";
import { KioskCameraFocus } from "./kiosk-camera";
import { StoreEntryCamera } from "./store-entry-camera";
import { ShowroomEntryCamera, skipShowroomIntro } from "@/game/showroom/entry-camera";
import { ShowroomCatalogCamera } from "@/game/showroom/catalog-camera";
import { isShowroomDoorReturn, isShowroomRoom, SHOWROOM_ROOM } from "@/game/showroom/layout";
import { cancelShowroomWalk, showroomWalkSpeed } from "@/game/showroom/passage";
import { KIOSK } from "@/game/interactions/kiosk";
import { useKioskView } from "@/game/warung/kiosk-view";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useDungeon, isDungeonRoom } from "@/game/dungeon/store";
import { DungeonParcel } from "@/game/dungeon/DungeonScene";
import { useChannels } from "@/net/channel-store";
import { missionInteraction } from "@/game/missions/runtime";
import { useMissions } from "@/game/missions/store";
import { MissionParcel } from "@/game/missions/MissionParcel";
import { CarriedBoxes } from "@/game/warung/KulakanDeliveryScene";
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
import { isClubDoorReturn, useClub, stopDanceOnMove } from "@/game/club/store";
import { cancelClubDoorWalk, clubDoorWalkSpeed } from "@/game/club/venue-actions";
import { connectionId } from "@/net/channel-store";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { INTERACTABLES } from "@/game/interactions/interactables";
import { dynamicInteractables } from "@/game/interactions/dynamic";
import { isStoreInterior, SPAWN, STORE } from "@/game/world/layout";
import { travelBlocksTeleport, useLoader } from "@/ui/hud/travel-loader";
import { BENCH_SEATS, benchSitPose, PLAYER_VISUAL_DROP } from "@/game/world/street-props";
import { availableBenchSeat, benchSeatClaims } from "@/game/world/bench-occupancy";
import { useKeyboard } from "@/game/player/useKeyboard";
import { useMouseDrive } from "@/game/player/useMouseDrive";
import {
  consumeTouchLook,
  getTouchDrive,
  resetTouchDrive,
  useTouchDrive,
} from "@/game/player/touch-drive";
import { useControls } from "@/game/player/control-state";
import { useGame, type NearbyTarget } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { usePhoto } from "@/game/photo/photo-store";
import { SelfieStick } from "@/game/photo/SelfieStick";
import { MOUNTAIN_SEATS } from "@/game/mountain/seats";
import { MountainSummitBoard } from "@/game/mountain/MountainSummitBoard";
import { mountainOutfitAvatar } from "@/game/mountain/outfits";
import { Flashlight } from "@/game/mountain/Flashlight";
import { useMountain } from "@/game/mountain/store";
import { warungOrigin, warungSlotAt } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { WALL_H } from "@/game/warung/room-parts";
import {
  cancelWarungEntry,
  isWarungDoorReturn,
  warungEntryWalkSpeed,
} from "@/game/warung/entrance";
import { WARUNG_COUNTER_CAMERA, WARUNG_COUNTER_TARGET } from "@/game/warung/counter-view";
import {
  CITY_HELIPAD,
  MOUNTAIN_BOUNDS,
  MOUNTAIN_RESCUE_Y,
  checkpointAt,
  isMountainPosition,
  mountainRespawn,
} from "@/game/mountain/model";
import { photoCameraPose } from "@/game/photo/photo-camera";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useProfile } from "@/identity/profile-store";
import { trafficActors, vehicleBlocks } from "@/game/traffic/traffic-runtime";
import {
  canImpact,
  atTrafficHeight,
  impactVelocity,
  hitDurationFor,
  INVULNERABILITY,
} from "@/game/traffic/traffic-math";
import { emptyImpact, ImpactVfx } from "@/game/traffic/ImpactReaction";
import { findNearestWalkablePosition } from "@/game/world/outdoor-layout";
import { LOW_QUALITY } from "@/game/engine/quality";
import { footSurfaceAt, footTravel } from "@/game/audio/world-acoustics";
import { playFootstepSfx } from "@/game/audio/sfx";
import { updateRideAudio } from "@/game/audio/ride-engine";
import { useBusRide } from "@/game/world/bus-ride";
import { rideEngineKind } from "@/game/audio/ride-engine-params";
import { playerId, remoteStates } from "@/net/useWorldChannel";
import { setLocalNetAnim } from "@/net/local-pose";
import {
  consumeSocialHit,
  queueSocialHit,
  cancelSocialPoseOnMove,
  cancelChatEmote,
  getActiveChatEmote,
  peekLocalSocialAnim,
  registerChatEmoteGuard,
  registerLocalPose,
  canInteractWithPlayer,
} from "@/game/social/social-actions";

const STAND_Y = PLAYER_VISUAL_DROP;
const EXPLORER_BED_LIE_Y = -0.14;
const CAM_DIST = 10.5;
const CAM_DIST_IN = 4.4;
const CAM_PITCH = 0.18;
const CAM_MIN_DIST = 0.15;
const PITCH_MIN = 0.12;
const PITCH_MAX = 0.78;
const LOOK_YAW_SENS = 0.0055;
const LOOK_PITCH_SENS = 0.0042;
const CAM_COLLIDE_BIAS = 0.28;
const HOME_CAM_YAW = 0.42;
const ROOM_CAM_PITCH = 0.24;
const ROOM_CAM_DISTANCE = 3.1;
const ROOM_PITCH_MIN = -0.15;
const ROOM_PITCH_MAX = 0.68;
const ROOM_CAM_INSET = 0.24;
const HOME_CAM_BOUNDS = new THREE.Box3(
  new THREE.Vector3(
    HOME_ORIGIN[0] - HOME_ROOM.w / 2 + ROOM_CAM_INSET,
    HOME_ORIGIN[1] + ROOM_CAM_INSET,
    HOME_ORIGIN[2] - HOME_ROOM.d / 2 + ROOM_CAM_INSET,
  ),
  new THREE.Vector3(
    HOME_ORIGIN[0] + HOME_ROOM.w / 2 - ROOM_CAM_INSET,
    HOME_ORIGIN[1] + HOME_ROOM.h - ROOM_CAM_INSET,
    HOME_ORIGIN[2] + HOME_ROOM.d / 2 - ROOM_CAM_INSET,
  ),
);

function playerInsideStore({ x, y, z }: { x: number; y: number; z: number }) {
  const club = useClub.getState();
  return !isDungeonRoom() && !(club.inside && !club.outdoor) && isStoreInterior(x, y, z);
}

export function Player() {
  const mountainSupport = useRef<number | null>(null);
  const lastVehicle = useRef<
    (RidePose & { id: string; room: string; exit: [number, number, number] | undefined }) | null
  >(null);
  const lastTruck = useRef<TruckState | null>(null);
  // Engine audio: speed from frame-to-frame motion (the truck pose has no speed field).
  const rideMotion = useRef<{ x: number; z: number; speed: number } | null>(null);
  useEffect(() => () => updateRideAudio(null, 0), []);
  const truckBrakeUntil = useRef(0);
  const suppressedTruck = useRef("");
  const [spawn] = useState(() => {
    const game = useGame.getState();
    if (game.pendingTeleport) return game.pendingTeleport;
    if (useLoader.getState().loader?.mode === "scene" && !isDungeonRoom()) return game.playerPos;
    const dungeonSpawn = useDungeon.getState().spawn;
    if (dungeonSpawn) return dungeonSpawn;
    const slot = spawnPreference(connectionId, 9);
    return [
      SPAWN[0] + ((slot % 3) - 1) * 1.1,
      SPAWN[1],
      SPAWN[2] + (Math.floor(slot / 3) - 1) * 1.1,
    ] as [number, number, number];
  });
  const spawnPlacement = useRef({
    placed: false,
    finished: isDungeonRoom() || useLoader.getState().loader?.mode === "scene",
    elapsed: 0,
  });
  const body = useRef<RapierRigidBody>(null);
  // Keep metadata stable so Rapier cannot copy a stale rendered pose back over a teleport.
  const bodyData = useMemo(() => ({ playerConnection: playerId }), []);
  const visual = useRef<THREE.Group>(null);
  const avatarVisual = useRef<THREE.Group>(null);
  const keys = useKeyboard();
  const drive = useMouseDrive();
  const carryBlend = useRef(createCarryBlend());
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);
  const canvas = useThree((s) => s.gl.domElement);
  const kioskCamera = useMemo(() => new KioskCameraFocus(), []);
  const storeEntryCamera = useMemo(() => new StoreEntryCamera(), []);
  const showroomEntryCamera = useMemo(() => new ShowroomEntryCamera(), []);
  const showroomCatalogCamera = useMemo(() => new ShowroomCatalogCamera(), []);
  useEffect(
    () => () => {
      storeEntryCamera.interrupt();
      cancelShowroomWalk();
      skipShowroomIntro();
    },
    [storeEntryCamera],
  );
  const reducedCameraMotion = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedCameraMotion.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      if (camera instanceof THREE.PerspectiveCamera) kioskCamera.reset(camera);
    };
  }, [camera, kioskCamera]);

  useGameplayZoom(canvas);
  const { world, rapier } = useRapier();
  const yaw = useRef(0);
  const rideLookAt = useRef(0);
  const pitch = useRef(isDungeonRoom() ? 0.3 : CAM_PITCH);
  const roomOrbit = useRef({ pitch: ROOM_CAM_PITCH, distance: null as number | null });
  const warungCameraBounds = useRef(new THREE.Box3());
  const courseCameraBlend = useRef(0);
  const inHalteCamera = useRef(false);
  const halteReframe = useRef(false);
  const camDist = useRef(CAM_DIST);
  const focusLift = useRef(2.3);
  const camPos = useRef(new THREE.Vector3(spawn[0], spawn[1] + 3.4, spawn[2] + CAM_DIST));
  const lookAt = useRef(new THREE.Vector3(...spawn));
  // Reused each frame — avoid `new Vector3` / `.clone()` GC pressure on long mobile sessions.
  const scratch = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    air: new THREE.Vector3(),
    focus: new THREE.Vector3(),
    ideal: new THREE.Vector3(),
    toCam: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    safeDir: new THREE.Vector3(),
    roomRay: new THREE.Ray(),
  });
  const syncTimer = useRef(0);
  const gait = useRef(0);
  const stepPhase = useRef(0);
  const stepPosition = useRef<{ x: number; z: number } | null>(null);
  const strideLength = useRef(1.45);
  const heldForTravel = useRef(false);
  const lastSeat = useRef<(typeof BENCH_SEATS)[number] | null>(null);
  const avatarAnimation = useRef<AvatarAnimation | undefined>(undefined);
  const bedMotion = useRef<ReturnType<typeof createHomeBedMotion> | null>(null);
  const impact = useRef(emptyImpact());
  const swim = useRef({ active: false, stroke: 0 });
  const jump = useRef({ anticipation: 0, landing: 0, wasAirborne: false });
  const parachute = useRef({ open: false, toasted: false });
  const parachuteVisual = useRef<THREE.Group>(null);
  const safetyShape = useMemo(() => new rapier.Capsule(0.43, 0.37), [rapier]);
  const cameraShape = useMemo(() => new rapier.Ball(0.18), [rapier]);
  const cameraRotation = useMemo(() => ({ x: 0, y: 0, z: 0, w: 1 }), []);
  const profile = useProfile((s) => s.profile);
  const appearanceDraft = useProfile((s) => s.appearanceDraft);
  const outfit = useMountain((s) => s.outfit);
  const mountainRegion = useGame((s) => isMountainPosition(s.playerPos[0], s.playerPos[2]));
  const activeOutfit = mountainRegion && !appearanceDraft ? outfit : null;
  const avatar = useMemo(
    () => mountainOutfitAvatar(appearanceDraft ?? profile?.avatar ?? DEFAULT_AVATAR, activeOutfit),
    [appearanceDraft, profile?.avatar, activeOutfit],
  );

  function updateRoomCamera(
    p: { x: number; y: number; z: number },
    delta: number,
    bounds: THREE.Box3,
  ) {
    const orbit = roomOrbit.current;
    const v = scratch.current;
    const follow = orbit.distance === null ? 1 : 1 - Math.exp(-10 * delta);
    const height = THREE.MathUtils.lerp(lookAt.current.y, p.y + 0.55, follow);
    const focus = lookAt.current.set(p.x, height, p.z);
    bounds.clampPoint(focus, focus);
    const horizontal = Math.cos(orbit.pitch);
    const direction = v.toCam.set(
      Math.sin(yaw.current) * horizontal,
      Math.sin(orbit.pitch),
      Math.cos(yaw.current) * horizontal,
    );

    // Keep the near plane inside the room even at the door opening, then sweep against furniture.
    const boundary = v.roomRay.set(focus, direction).intersectBox(bounds, v.ideal);
    const distance = Math.min(
      ROOM_CAM_DISTANCE * useCameraZoom.getState().distance,
      boundary ? focus.distanceTo(boundary) : 0,
    );
    const hit =
      distance > 0 &&
      world.castShape(
        focus,
        cameraRotation,
        direction,
        cameraShape,
        0,
        distance,
        true,
        rapier.QueryFilterFlags.ONLY_FIXED | rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      );
    const clear = hit ? Math.max(0, hit.time_of_impact - 0.06) : distance;
    // Shorten immediately at a solid object and ease back out after the path clears.
    orbit.distance = Math.min(clear, THREE.MathUtils.lerp(orbit.distance ?? clear, clear, follow));
    camPos.current.copy(focus).addScaledVector(direction, orbit.distance);
    camera.position.copy(camPos.current);
    camera.lookAt(v.ideal.copy(camPos.current).sub(direction));
    if (visual.current) visual.current.visible = orbit.distance > 0.75;
  }

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
      if (swim.current.active) return "Keluar dari air dulu untuk memakai emote.";
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
        isJumpAnimation(avatarAnimation.current)
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
          !atTrafficHeight(rb.translation()) ||
          activePair(useMobility.getState().carries, playerId)?.passenger === playerId ||
          useMobility.getState().flying ||
          !!ownVehicle() ||
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
      endHomeSleep();
      useObby.getState().reset();
      useControls.getState().consumeJump();
      useControls.getState().setPlayerReady(false);
      cancelWarungEntry();
      cancelClubDoorWalk();
      trafficActors.delete("player");
    };
  }, [clock, drive, keys]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const rb = body.current;
    if (!rb) return;
    // Hold the current pose while the loader covers travel or waits for a destination.
    if (travelBlocksTeleport()) {
      storeEntryCamera.interrupt();
      cancelWarungEntry();
      cancelClubDoorWalk();
      if (!heldForTravel.current) {
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rb.setEnabled(false);
        heldForTravel.current = true;
      }
      return;
    }
    if (heldForTravel.current) {
      rb.setEnabled(true);
      heldForTravel.current = false;
    }
    if (useWorldEditor.getState().mode === "EDITOR") {
      storeEntryCamera.interrupt();
      cancelWarungEntry();
      cancelClubDoorWalk();
      updateRideAudio(null, delta);
      cancelChatEmote();
      setLocalNetAnim(undefined);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }
    // Seated in the bus: the chase camera owns the view until the drop-off teleport.
    if (useBusRide.getState().riding && !useGame.getState().pendingTeleport) {
      storeEntryCamera.interrupt();
      cancelWarungEntry();
      cancelClubDoorWalk();
      updateRideAudio(null, delta);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (visual.current) visual.current.visible = false;
      return;
    }

    const race = useGame.getState().pendingTeleport ? null : miniRacePose();
    const mini = miniParticipant();
    if (
      race &&
      useControls.getState().consumeJump() &&
      useMinigames.getState().round?.phase === "running" &&
      !gameUiBlocked()
    )
      void miniCommand("jump");
    const mobility = useMobility.getState();
    const ridingVehicle = ownVehicle();
    const pair = activePair(mobility.carries, playerId);
    const carrierState = pair?.passenger === playerId ? remoteStates.get(pair.carrier) : undefined;
    const carrier =
      carrierState && sameGang(localGangId(), carrierState.gangId) ? carrierState : undefined;
    const carried = !!carrier && mobilityAvailable();
    const flying = mobility.flying && mobilityAvailable();
    if (pair && (!mobilityAvailable() || (pair.passenger === playerId && !carrier))) releaseCarry();
    const sheetLocked =
      useHud.getState().sheet !== null || useHud.getState().principalPanel !== null;

    // Pukulan dari pemain lain — Fall sama seperti ketabrak mobil.
    const delivery = useMissions.getState().session.active;
    const drivingTruck =
      delivery?.truck?.driver === playerId && delivery.id !== suppressedTruck.current
        ? delivery.truck
        : null;
    if (delivery?.id === suppressedTruck.current) {
      sendTruckInput({ throttle: 0, steer: 0, brake: true });
      if (!useMissions.getState().pending) requestMission("cancel");
    }
    const social = consumeSocialHit();
    if (
      !isDungeonRoom() &&
      !(useClub.getState().inside && !useClub.getState().outdoor) &&
      !carried &&
      !flying &&
      !drivingTruck &&
      !ridingVehicle &&
      !mini &&
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
    const game = useGame.getState();
    const prolog = useProlog.getState();
    const position = rb.translation();
    const inShowroom = isShowroomRoom(position.x, position.z);
    showroomEntryCamera.observe(
      inShowroom &&
        useChannels.getState().playing &&
        !game.pendingTeleport &&
        game.overlay === "none" &&
        !sheetLocked,
      reducedCameraMotion.current,
    );
    const faceStorefront =
      storeEntryCamera.observe(position, {
        inside: playerInsideStore(position),
        continuous:
          !inShowroom &&
          !game.pendingTeleport &&
          position.y >= 0 &&
          position.y < STORE.wallHeight - STAND_Y,
        reducedMotion: reducedCameraMotion.current,
        delta: rawDelta,
        canPlay:
          useChannels.getState().playing &&
          !useDungeon.getState().transition &&
          !(prolog.presenting && prolog.data?.step === "reveal") &&
          game.overlay === "none" &&
          !game.pendingTeleport &&
          !game.sitting &&
          !sheetLocked &&
          !recovering &&
          !useMountain.getState().flight &&
          !flying &&
          !carried &&
          !race &&
          !drivingTruck &&
          !ridingVehicle,
      }) === "exit";
    if (faceStorefront) {
      yaw.current = 0;
      pitch.current = CAM_PITCH;
    }
    if (
      game.pendingTeleport ||
      recovering ||
      flying ||
      carried ||
      mini ||
      drivingTruck ||
      ridingVehicle
    ) {
      cancelWarungEntry();
      cancelClubDoorWalk();
      cancelShowroomWalk();
    }
    const { inside: warungRoom, serviceView } = useWarung.getState();
    const overlayLocked = gameUiBlocked() || game.overlay !== "none";
    const locked =
      !useChannels.getState().playing ||
      useDungeon.getState().transition ||
      overlayLocked ||
      sheetLocked ||
      (warungRoom !== null && serviceView) ||
      recovering ||
      !!useMountain.getState().flight ||
      carried ||
      !!race;
    // DEV/world teleports must move the rigidbody — zustand playerPos alone is display sync.
    if (game.pendingTeleport) {
      roomOrbit.current.distance = null;
      endHomeSleep();
      bedMotion.current = null;
      if (avatarVisual.current) avatarVisual.current.position.y = 0;
      if (mini) void miniCommand("leave");
      if (ridingVehicle) cancelVehicle();
      lastVehicle.current = null;
      if (visual.current) visual.current.rotation.z = 0;
      rb.setGravityScale(1, true);
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
      if (drivingTruck && delivery) {
        suppressedTruck.current = delivery.id;
        sendTruckInput({ throttle: 0, steer: 0, brake: true }, true);
        requestMission("cancel");
        lastTruck.current = null;
      }
      releaseCarry();
      const target = game.pendingTeleport;
      // Elevated destinations (obby Finish) keep exact Y; ground snaps stay walkable.
      const elevated = target[1] > STAND_Y + 1;
      const mountainTarget = isMountainPosition(target[0], target[2]);
      const helipadTarget =
        Math.hypot(target[0] - CITY_HELIPAD.spawn[0], target[2] - CITY_HELIPAD.spawn[2]) < 1;
      // Warung rooms are off the city grid: snapping to the nearest city walkway drops the player in the void.
      const warungTarget = warungSlotAt(target[0], target[2]) >= 0;
      const exact =
        elevated ||
        mountainTarget ||
        helipadTarget ||
        warungTarget ||
        isGangPosition(target[0], target[2]) ||
        isShowroomRoom(target[0], target[2]) ||
        // Home rooms (F5 prolog) are off the city grid too; snapping drops the player into the void.
        isHomeRoom(target[0], target[2]);
      mountainSupport.current = mountainTarget ? target[1] - STAND_Y : null;
      const underground = target[1] < -5;
      if (!elevated) useObby.getState().reset();
      jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
      parachute.current = {
        open: false,
        toasted: elevated && useObby.getState().status === "complete",
      };
      cancelChatEmote();
      spawnPlacement.current.finished = true;
      lastSeat.current = null;
      carryBlend.current.id = null;
      drive.current = { active: false, throttle: 0, turn: 0 };
      for (const key of Object.keys(keys.current) as (keyof typeof keys.current)[])
        keys.current[key] = false;
      impact.current = emptyImpact();
      useControls.setState({ jumpQueued: false });
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
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
      const targetXZ = { x: target[0], z: target[2] };
      const safe =
        exact ||
        underground ||
        ((isWarungDoorReturn(target) || isClubDoorReturn(target) || isShowroomDoorReturn(target)) &&
          !blocked(targetXZ))
          ? targetXZ
          : (findNearestWalkablePosition(targetXZ, blocked) ?? targetXZ);
      const y = exact || underground ? target[1] : STAND_Y;
      if (isGangPosition(target[0], target[2])) yaw.current = gangFacingAt(target[0], target[2]);
      const before = rb.translation();
      const offset = scratch.current.move.set(safe.x - before.x, y - before.y, safe.z - before.z);
      camPos.current.add(offset);
      lookAt.current.add(offset);
      rb.setTranslation({ x: safe.x, y, z: safe.z }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      useGame.setState({
        pendingTeleport: null,
        playerPos: [safe.x, y, safe.z],
        inside: playerInsideStore({ x: safe.x, y, z: safe.z }),
        sitting: false,
        sittingBenchId: null,
      });
      gait.current = 0;
      avatarAnimation.current = undefined;
      setLocalNetAnim(undefined);
      return;
    }
    const inHome = isHomeRoom(position.x, position.z);
    const visitingWarung = warungRoom !== null && !serviceView;
    const roomLook = inHome || visitingWarung;
    if (!roomLook) roomOrbit.current.distance = null;
    else if (roomOrbit.current.distance === null) {
      // The visitor arrives just inside the front door, facing the counter.
      yaw.current = inHome ? HOME_CAM_YAW : 0;
      roomOrbit.current.pitch = ROOM_CAM_PITCH;
      if (visual.current) visual.current.rotation.y = yaw.current + Math.PI;
      if (visitingWarung) {
        const [x, y, z] = warungOrigin(warungRoom.id);
        const { min, max } = warungCameraBounds.current;
        min.set(x - 6 + ROOM_CAM_INSET, y + ROOM_CAM_INSET, z - 5 + ROOM_CAM_INSET);
        max.set(x + 6 - ROOM_CAM_INSET, y + WALL_H - ROOM_CAM_INSET, z + 5 - ROOM_CAM_INSET);
      }
    }
    const sleep = usePulang.getState();
    if (sleep.sleepMotion || bedMotion.current) {
      const position = rb.translation();
      const inRoom = isHomeRoom(position.x, position.z);
      if (sleep.sleepMotion && inRoom && useChannels.getState().playing) {
        if (!bedMotion.current) {
          bedMotion.current = createHomeBedMotion(position);
          resetTouchDrive();
          cancelChatEmote();
          stopDanceOnMove();
          game.setSitting(false);
          jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
          rb.setGravityScale(0, true);
          rb.collider(0).setCollisionGroups(interactionGroups(1, []));
        }
        const pose = bedMotion.current.update(document.hidden ? 0 : delta);
        rb.setTranslation(pose.position, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        useControls.getState().consumeJump();
        gait.current = pose.moving ? 2.5 : 0;
        avatarAnimation.current = pose.lying ? "LieDown" : undefined;
        setLocalNetAnim(avatarAnimation.current);
        if (avatarVisual.current) {
          // The Explorer LieDown rig floats higher than the base rig over the same bed.
          const height = pose.lying && !profile?.equippedCharacter ? EXPLORER_BED_LIE_Y : 0;
          avatarVisual.current.position.y = THREE.MathUtils.damp(
            avatarVisual.current.position.y,
            height,
            16,
            delta,
          );
        }
        if (visual.current) {
          const rotation = visual.current.rotation;
          const turn = pose.yaw - rotation.y;
          rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-16 * delta));
        }
        syncTimer.current += delta;
        if (syncTimer.current > 0.15) {
          syncTimer.current = 0;
          const { x, y, z } = pose.position;
          game.setPlayerPos([x, y, z], false, visual.current?.rotation.y ?? 0);
        }
        updateRoomCamera(pose.position, delta, HOME_CAM_BOUNDS);
        if (pose.lying && sleep.sleepMotion !== "lying")
          usePulang.setState({ sleepMotion: "lying" });
        if (pose.ready && !sleep.sleeping) completeHomeSleepMotion();
        return;
      }
      if (bedMotion.current) {
        if (inRoom) rb.setTranslation(bedMotion.current.floorEdge, true);
        if (avatarVisual.current) avatarVisual.current.position.y = 0;
        rb.setGravityScale(1, true);
        rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
        bedMotion.current = null;
        stepPosition.current = null;
        resetTouchDrive();
        useControls.getState().consumeJump();
      }
      endHomeSleep();
    }
    if (drivingTruck || ridingVehicle) {
      const entering = !lastTruck.current && !lastVehicle.current;
      lastTruck.current = drivingTruck;
      const k = keys.current;
      const touch = drivingTruck ? getTouchDrive() : useTouchDrive.getState();
      const brakeTap = useControls.getState().consumeJump();
      if (brakeTap) truckBrakeUntil.current = clock.elapsedTime + 0.65;
      const paused = overlayLocked || sheetLocked || !useChannels.getState().playing;
      const input = {
        throttle: paused ? 0 : touch.active ? -touch.moveY : Number(k.forward) - Number(k.back),
        steer: paused
          ? 0
          : touch.active
            ? touch.moveX
            : Number(k.right || k.yawRight) - Number(k.left || k.yawLeft),
        brake:
          paused ||
          useControls.getState().truckBrakeHeld ||
          k.jump ||
          clock.elapsedTime < truckBrakeUntil.current,
      };
      const t = drivingTruck
        ? renderedTruck.ready
          ? { ...drivingTruck, ...renderedTruck }
          : drivingTruck
        : (renderedVehicles.get(ridingVehicle!.id) ?? ridingVehicle!.pose);
      if (drivingTruck) sendTruckInput(input);
      else {
        const driver = ridingVehicle!.occupants.some(
          (s) => s.seat === 0 && s.connectionId === playerId,
        );
        // Ignore a slight Y drift when the player is only steering the stick.
        const throttle = touch.active && Math.abs(touch.moveY) < 0.08 ? 0 : input.throttle;
        // Pull back to slow down before engaging reverse. Keep Space for keyboard driving.
        const stickBrake = touch.active && throttle < 0 && t.speed > 0.08;
        useVehicleInput.setState({
          throttle: driver && !stickBrake ? throttle : 0,
          steer:
            paused || !driver ? 0 : touch.active ? touch.moveX : Number(k.right) - Number(k.left),
          brake: paused || !driver || k.jump || stickBrake,
        });
      }
      const motion = rideMotion.current;
      // A gate crossing moves the ride to another scene in one frame: snap the camera, not a swoop.
      const jumped = !!motion && Math.hypot(t.x - motion.x, t.z - motion.z) > 50;
      const moved =
        motion && delta > 0 && !jumped ? Math.hypot(t.x - motion.x, t.z - motion.z) / delta : 0;
      const speed = motion ? motion.speed + (moved - motion.speed) * (1 - Math.exp(-8 * delta)) : 0;
      const accel = motion && delta > 0 ? (speed - motion.speed) / delta : 0;
      rideMotion.current = { x: t.x, z: t.z, speed };
      rideTelemetry.speed = speed;
      const controls = ridingVehicle ? useVehicleInput.getState() : input;
      const drives =
        drivingTruck ||
        ridingVehicle!.occupants.some((s) => s.seat === 0 && s.connectionId === playerId);
      updateRideAudio(
        {
          id: ridingVehicle ? ridingVehicle.id : "delivery-truck",
          kind: rideEngineKind(drivingTruck ? "truck" : ridingVehicle!.model),
          speed,
          // Passengers hear the driver's gas through the acceleration they feel.
          throttle: drives ? controls.throttle : Math.max(0, Math.min(1, accel / 5)),
          brake: drives ? controls.brake : accel < -6,
        },
        delta,
      );
      if (ridingVehicle)
        lastVehicle.current = {
          ...ridingVehicle.pose,
          ...t,
          id: ridingVehicle.id,
          exit:
            ridingVehicle.occupants.find((s) => s.connectionId === playerId)?.transition?.phase ===
            "exiting"
              ? ridingVehicle.occupants.find((s) => s.connectionId === playerId)!.transition!.to
              : undefined,
          room: useChannels.getState().lease?.channel ?? "",
        };
      const anchor = ridingVehicle
        ? rideSeatPose(
            ridingVehicle,
            t as RidePose,
            playerId,
            mobilityNow(),
            renderedVehicleMotion.get(ridingVehicle.id),
          )
        : vehicleSeatAnchor("truck", t, 0, renderedVehicleMotion.get("delivery-truck"));
      rb.collider(0).setCollisionGroups(interactionGroups(1, []));
      rb.setGravityScale(0, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setTranslation({ x: anchor.x, y: anchor.y, z: anchor.z }, true);
      visual.current?.parent?.position.set(anchor.x, anchor.y, anchor.z);
      if (visual.current) {
        visual.current.rotation.set(0, anchor.ry, anchor.rz);
        visual.current.visible = true;
      }
      avatarAnimation.current = ridingVehicle
        ? rideAnimation(ridingVehicle, playerId, mobilityNow())
        : "RideDrive";
      setLocalNetAnim(avatarAnimation.current);
      gait.current = avatarAnimation.current === "Walk" ? 2.5 : 0;
      spawnPlacement.current.finished = true;
      impact.current = emptyImpact();
      stepPosition.current = null;
      cancelChatEmote();
      useGame.getState().setNearby(null);
      const desiredYaw = t.yaw + Math.PI;
      const look = consumeTouchLook();
      const now = performance.now();
      if (look.x || look.y) rideLookAt.current = now;
      if (entering) yaw.current = desiredYaw;
      // Let a look drag hold the view for a moment before easing back behind the vehicle.
      else if (now - rideLookAt.current > 2000)
        yaw.current +=
          Math.atan2(Math.sin(desiredYaw - yaw.current), Math.cos(desiredYaw - yaw.current)) *
          (1 - Math.exp(-3 * delta));
      yaw.current -= look.x * LOOK_YAW_SENS;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current + look.y * LOOK_PITCH_SENS,
        PITCH_MIN,
        PITCH_MAX,
      );
      const v = scratch.current;
      const focus = v.focus.set(t.x, 2.3, t.z);
      const length = 11 * useCameraZoom.getState().distance;
      const desired = v.desired.set(
        t.x + Math.sin(yaw.current) * length * Math.cos(pitch.current),
        2.8 + length * Math.sin(pitch.current),
        t.z + Math.cos(yaw.current) * length * Math.cos(pitch.current),
      );
      const dir = v.toCam.copy(desired).sub(focus),
        distance = dir.length();
      dir.normalize();
      const hit = world.castShape(
        focus,
        cameraRotation,
        dir,
        cameraShape,
        0,
        distance,
        true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        rb,
        (c) => {
          const data = c.parent()?.userData as
            { cameraPassThrough?: boolean; rideId?: string } | undefined;
          // The sweep starts near the roof, inside the occupied vehicle's collider.
          return !data?.cameraPassThrough && (!ridingVehicle || data?.rideId !== ridingVehicle.id);
        },
      );
      if (hit) desired.copy(focus).addScaledVector(dir, Math.max(0.3, hit.time_of_impact - 0.28));
      if (jumped) {
        camPos.current.copy(desired);
        lookAt.current.copy(focus);
      }
      camPos.current.lerp(desired, 1 - Math.exp(-9 * delta));
      lookAt.current.lerp(focus, 1 - Math.exp(-10 * delta));
      camera.position.copy(camPos.current);
      camera.lookAt(lookAt.current);
      syncTimer.current += delta;
      if (syncTimer.current > 0.1) {
        syncTimer.current = 0;
        game.setPlayerPos([anchor.x, anchor.y, anchor.z], false, t.yaw);
      }
      return;
    }
    rideMotion.current = null;
    updateRideAudio(null, delta);
    if (lastVehicle.current) {
      const old = lastVehicle.current;
      lastVehicle.current = null;
      rb.setGravityScale(1, true);
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
      if (old.room === useChannels.getState().lease?.channel) {
        const exit = old.exit ?? vehicleExits.get(old.id)?.();
        if (exit) {
          rb.setTranslation({ x: exit[0], y: exit[1], z: exit[2] }, true);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          game.setPlayerPos(exit, false, old.yaw);
        } else game.requestTeleport([old.x, 0.83, old.z]);
      }
      // Thrown off a crashing motor: the existing knock-down reaction plays next frame.
      const thrown = takeCrashThrow();
      if (thrown) queueSocialHit(thrown.vx * 0.5, thrown.vz * 0.5, 3);
      return;
    }
    if (lastTruck.current) {
      const exit =
        truckPhysics.exit(lastTruck.current) ??
        ([lastTruck.current.x, 0.83, lastTruck.current.z - 3] as [number, number, number]);
      lastTruck.current = null;
      rb.setGravityScale(1, true);
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
      game.requestTeleport(exit);
      return;
    }
    if (recovering && game.sitting) game.setSitting(false);
    if (!game.sitting && hitAge >= INVULNERABILITY) {
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
    }
    if (
      !recovering &&
      !impact.current.recovered &&
      isMountainPosition(rb.translation().x, rb.translation().z)
    ) {
      // The hiking recovery below owns this area, including later boundary falls.
      impact.current.recovered = true;
    }
    if (
      !recovering &&
      !impact.current.recovered &&
      !isMountainPosition(rb.translation().x, rb.translation().z) &&
      !(useClub.getState().inside && !useClub.getState().outdoor) &&
      warungSlotAt(rb.translation().x, rb.translation().z) < 0 &&
      !isGangPosition(rb.translation().x, rb.translation().z) &&
      !isHomeRoom(rb.translation().x, rb.translation().z) &&
      !inShowroom
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
    if (warungRoom && rb.translation().y < -5) {
      const [x, y, z] = warungOrigin(warungRoom.id);
      game.requestTeleport([x, y + 0.83, z + 3]);
      return;
    }
    const k = keys.current;

    const mouse = drive.current;
    const look = locked ? { x: 0, y: 0 } : consumeTouchLook();
    if (!locked) {
      if (k.yawLeft) yaw.current += delta * 2;
      if (k.yawRight) yaw.current -= delta * 2;
      if (mouse.active && mouse.turn !== 0) yaw.current += mouse.turn * delta * 2.4;
      yaw.current -= look.x * LOOK_YAW_SENS;
      if (roomLook) {
        // In the room, right-drag tilts the camera instead of walking into furniture.
        roomOrbit.current.pitch = THREE.MathUtils.clamp(
          roomOrbit.current.pitch + look.y * LOOK_PITCH_SENS - mouse.throttle * delta,
          ROOM_PITCH_MIN,
          ROOM_PITCH_MAX,
        );
      } else {
        pitch.current = THREE.MathUtils.clamp(
          pitch.current + look.y * LOOK_PITCH_SENS,
          PITCH_MIN,
          PITCH_MAX,
        );
      }
    }

    // `forward` = arah dari pemain ke kamera; gerak maju = berlawanan vektor ini.
    const v = scratch.current;
    const forward = v.forward.set(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    const right = v.right.set(forward.z, 0, -forward.x);

    const touch = getTouchDrive();
    const move = v.move.set(0, 0, 0);
    if (!locked) {
      if (k.forward) move.sub(forward);
      if (k.back) move.add(forward);
      if (k.left) move.sub(right);
      if (k.right) move.add(right);
      if (!roomLook && mouse.active && Math.abs(mouse.throttle) > 0.02) {
        move.addScaledVector(forward, -mouse.throttle);
      }
      if (touch.active) {
        // Stick: X+ = kanan, Y+ (jari ke bawah) = mundur → Y- = maju.
        move.addScaledVector(right, touch.moveX);
        move.addScaledVector(forward, touch.moveY);
      }
    }

    if (!locked && useFishing.getState().open && useControls.getState().consumeJump())
      void fishingAction();

    if (
      useFishing.getState().open &&
      ((locked && !useFishing.getState().browsing) ||
        move.lengthSq() > 0 ||
        useControls.getState().jumpQueued ||
        game.sitting ||
        game.pendingTeleport ||
        recovering ||
        !atFishingSpot([rb.translation().x, rb.translation().y, rb.translation().z]))
    )
      closeFishing();

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
      isGangPosition(rb.translation().x, rb.translation().z) ||
      isHomeRoom(rb.translation().x, rb.translation().z) ||
      inShowroom ||
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

    const claims = benchSeatClaims(peers);
    const seatId = useGame.getState().sittingBenchId;
    let sittingBench = seatId
      ? inHome
        ? HOME_SOFA_SEATS.find((seat) => seat.id === seatId)
        : (BENCH_SEATS.find((b) => b.id === seatId) ?? MOUNTAIN_SEATS.find((b) => b.id === seatId))
      : undefined;
    if (sittingBench?.benchId && claims.has(sittingBench.id)) {
      const available = availableBenchSeat(sittingBench, claims, playerId);
      if (available !== sittingBench) {
        game.setSitting(Boolean(available), available?.id ?? null);
        if (!available) game.setToast("Bangku ini sudah penuh.");
        sittingBench = available;
      }
    }
    const sitting = useGame.getState().sitting;

    if (!sitting && lastSeat.current && !recovering) {
      const bench = lastSeat.current;
      const [x, y, z] = bench.standPosition ?? [
        bench.position[0] + Math.sin(bench.yaw) * (bench.standDistance ?? 1.05),
        bench.position[1],
        bench.position[2] + Math.cos(bench.yaw) * (bench.standDistance ?? 1.05),
      ];
      rb.setTranslation({ x, y: y + STAND_Y, z }, true);
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
    const running = k.run || (touch.active && touch.running);
    let speed =
      (running ? RUN : WALK) * (touch.active && touch.running ? 1 : Math.max(0.25, analog));
    const wp = rb.translation();
    const weather = currentWeather();
    const flood = floodSurfaceAt(wp.x, wp.z, weather.flood);
    const wading = flood !== null && flood - (wp.y - STAND_Y) >= MIN_SPLASH_DEPTH;
    if (wading) speed *= floodSpeedFactor(weather.flood);
    speed *= tiredSpeedFactor(useEnergy.getState().tired);
    const water =
      !isDungeonRoom() && !(useClub.getState().inside && !useClub.getState().outdoor)
        ? waterAt(wp.x, wp.z)
        : null;
    const swimming =
      !carried && !flying && !sitting && shouldSwim(water, wp.y - STAND_Y, swim.current.active);
    if (swimming !== swim.current.active) {
      swim.current.active = swimming;
      swim.current.stroke = 0;
      rb.setGravityScale(swimming ? 0 : 1, true);
      jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
      if (swimming) {
        cancelChatEmote();
        stopDanceOnMove();
        cancelSocialPoseOnMove();
      }
    }
    // Seated: the seat pose pins the body each frame; gravity in between made it bob (worse at 40 Hz physics).
    rb.setGravityScale(
      swimming || carried || flying || race || (sitting && !!sittingBench) ? 0 : 1,
      true,
    );
    if (carried || flying) useControls.getState().consumeJump();
    swim.current.stroke = Math.max(0, swim.current.stroke - delta);
    if (swimming) {
      if (!locked && useControls.getState().consumeJump() && swim.current.stroke === 0)
        swim.current.stroke = 0.45;
      speed = (SWIM_SPEED + (swim.current.stroke > 0 ? 0.4 : 0)) * Math.max(0.25, analog);
    } else if (water && wp.y - STAND_Y < water.surface - 0.1) speed *= 0.7;
    const vel = rb.linvel();
    // One Rapier support query works on streets, elevated platforms and indoor floors.
    // Exclude people and sensors; contact must be close to the capsule sole, not the jump apex.
    const floor = world.castRayAndGetNormal(
      new rapier.Ray(rb.translation(), { x: 0, y: -1, z: 0 }),
      STAND_Y + 0.075,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      interactionGroups(1, [0]),
      undefined,
      rb,
      (collider) => {
        const support = collider.parent();
        return (
          !!support &&
          (support.isFixed() ||
            !!(support.userData as { obbyPlatform?: string } | undefined)?.obbyPlatform)
        );
      },
    );
    // A capsule gains vertical velocity while walking uphill. Compare with the
    // support plane so ramps remain walkable/jumpable instead of playing free-fall.
    const floorIsMountainTrail = !!(
      floor?.collider.parent()?.userData as { mountainTrail?: boolean } | undefined
    )?.mountainTrail;
    const slopeVelocity =
      floorIsMountainTrail && floor && floor.normal.y > 0.5
        ? -(vel.x * floor.normal.x + vel.z * floor.normal.z) / floor.normal.y
        : 0;
    const supportedRiseLimit = Math.max(0.6, slopeVelocity + 0.6);
    const grounded = !recovering && !!floor && vel.y <= supportedRiseLimit;
    const supportBody = grounded ? floor?.collider.parent() : null;
    const obbyPlatform = (supportBody?.userData as { obbyPlatform?: string } | undefined)
      ?.obbyPlatform;
    const supportVelocity = obbyPlatform ? supportBody?.linvel() : null;
    const mountainGround = supportBody?.userData as
      { mountainTrail?: boolean; mountainCheckpoint?: number } | undefined;
    if (!recovering && !flying && !carried && !sitting && !locked) {
      const p = rb.translation();
      const checkpoint = checkpointAt(p.x, p.y - STAND_Y, p.z);
      if (checkpoint !== null) useMountain.getState().reach(checkpoint, [p.x, p.y, p.z]);
    }
    if (sitting || locked) {
      useControls.getState().consumeJump();
      jump.current.anticipation = 0;
    }
    if (
      !locked &&
      grounded &&
      !swimming &&
      !sitting &&
      useControls.getState().jumpQueued &&
      !jump.current.anticipation
    ) {
      cancelChatEmote();
      stopDanceOnMove();
      cancelSocialPoseOnMove();
      useControls.getState().consumeJump();
      jump.current.anticipation = JUMP_ANTICIPATION_SECONDS;
      jump.current.landing = 0;
    } else if (jump.current.anticipation > 0) {
      // Honor a jump accepted on the platform even if movement crosses its edge
      // during the short visual anticipation (the same 60 ms is the entire grace).
      jump.current.anticipation = Math.max(0, jump.current.anticipation - delta);
      if (jump.current.anticipation === 0) {
        // Take off along this frame's input so a held stick/key keeps its air speed.
        const air = v.air.copy(move);
        if (air.lengthSq() > 0) {
          air.normalize().multiplyScalar(speed);
          rb.setLinvel({ x: air.x, y: JUMP, z: air.z }, true);
        } else {
          rb.setLinvel({ x: vel.x, y: JUMP, z: vel.z }, true);
        }
      }
    }
    const airborne = !swimming && !sitting && (!grounded || rb.linvel().y > supportedRiseLimit);
    if (!sitting && !recovering && grounded && jump.current.wasAirborne && !airborne) {
      jump.current.landing = JUMP_LANDING_SECONDS;
    } else jump.current.landing = Math.max(0, jump.current.landing - delta);
    jump.current.wasAirborne = airborne;
    if (
      !flying &&
      !carried &&
      grounded &&
      !airborne &&
      !sitting &&
      !recovering &&
      obbyPlatform &&
      !locked
    ) {
      useObby.getState().land(obbyPlatform);
    }

    const onFoot = grounded && !airborne && !sitting && !swimming;
    const guidedWalkSpeed =
      warungEntryWalkSpeed(wp, rawDelta, move, onFoot) ||
      clubDoorWalkSpeed(wp, rawDelta, move, onFoot) ||
      showroomWalkSpeed(wp, rawDelta, move, onFoot) ||
      (onFoot
        ? showroomEntryCamera.walkSpeed(wp, rawDelta, move) ||
          storeEntryCamera.walkSpeed(wp, rawDelta, move)
        : 0);
    // Use the normal movement path so colliders and walk animation still follow the body.
    if (guidedWalkSpeed > 0) speed = guidedWalkSpeed;

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
      const seat = benchSitPose(sittingBench, profile?.equippedCharacter ? "base" : "explorer");
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
      rb.setLinvel(
        {
          x: move.x + (supportVelocity?.x ?? 0),
          y: rb.linvel().y,
          z: move.z + (supportVelocity?.z ?? 0),
        },
        true,
      );
      if (visual.current) {
        const target = Math.atan2(move.x, move.z);
        const diff = Math.atan2(
          Math.sin(target - visual.current.rotation.y),
          Math.cos(target - visual.current.rotation.y),
        );
        visual.current.rotation.y += diff * (1 - Math.exp(-14 * delta));
      }
    } else {
      rb.setLinvel(
        { x: supportVelocity?.x ?? 0, y: rb.linvel().y, z: supportVelocity?.z ?? 0 },
        true,
      );
    }

    if (swimming && water) {
      const currentVelocity = rb.linvel();
      rb.setLinvel(
        {
          x: currentVelocity.x,
          y: swimVerticalVelocity(rb.translation().y, water.surface, swim.current.stroke),
          z: currentVelocity.z,
        },
        true,
      );
    }

    // After Finish, a long fall opens a soft canopy instead of a free-fall from 31 m.
    const courseStatus = useObby.getState().status;
    const feetY = rb.translation().y - STAND_Y;
    const fallVel = rb.linvel();
    if (
      !flying &&
      !carried &&
      !parachute.current.open &&
      !swimming &&
      !sitting &&
      !recovering &&
      shouldDeployObbyParachute(courseStatus, feetY, fallVel.y, airborne)
    ) {
      parachute.current.open = true;
      if (!parachute.current.toasted) {
        parachute.current.toasted = true;
        useGame.getState().setToast("Parasut terbuka · Arahkan saat turun!");
      }
    }
    if (parachute.current.open) {
      if (grounded && !airborne) {
        parachute.current.open = false;
      } else if (!swimming && !sitting && !recovering) {
        const soft = parachuteVelocity(fallVel.x, fallVel.y, fallVel.z);
        rb.setLinvel(soft, true);
      }
    }
    if (flying || carried || courseStatus !== "complete") {
      parachute.current.open = false;
      parachute.current.toasted = false;
    }
    if (parachuteVisual.current) parachuteVisual.current.visible = parachute.current.open;

    if (!sitting && !recovering) {
      rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
    }

    if (move.lengthSq() > 0 || swimming || airborne || sitting || recovering) stopDanceOnMove();
    if (
      move.lengthSq() > 0 ||
      airborne ||
      recovering ||
      sitting ||
      !useChannels.getState().playing ||
      useDungeon.getState().transition
    )
      cancelSocialPoseOnMove();
    if (swimming) cancelSocialPoseOnMove();
    const socialAnim = peekLocalSocialAnim();
    if (getActiveChatEmote()) stopDanceOnMove();
    avatarAnimation.current = swimming
      ? move.lengthSq() > 0 || swim.current.stroke > 0
        ? "Swim"
        : "SwimIdle"
      : recovering
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
            : jump.current.anticipation > 0
              ? "JumpAnticipation"
              : parachute.current.open
                ? "Parachute"
                : airborne
                  ? rb.linvel().y < -0.4
                    ? "JumpFall"
                    : "Jump"
                  : jump.current.landing > 0
                    ? "JumpLand"
                    : undefined;
    if (!avatarAnimation.current && !recovering) {
      const mission = useMissions.getState().session.active;
      const kulakanBoxes = useWarung
        .getState()
        .data?.shipments?.some((x) => x.status === "CARRYING");
      if (mission?.carrying || kulakanBoxes) avatarAnimation.current = "CarryBox";
      else if (easyJobAnimation()) avatarAnimation.current = easyJobAnimation();
      else if (mission?.lastActionAt && Date.now() - mission.lastActionAt < 700)
        avatarAnimation.current = "Checkout";
    }
    const fishing = useFishing.getState();
    if (
      fishing.open &&
      ((fishing.data?.cast?.status === "waiting" && fishingNow() <= fishing.data.cast.expiresAt) ||
        catchRevealing(fishing.revealStarted, performance.now())) &&
      !avatarAnimation.current
    ) {
      avatarAnimation.current = "CarryBox";
      stopDanceOnMove();
      if (visual.current) {
        const diff = Math.atan2(
          Math.sin(Math.PI - visual.current.rotation.y),
          Math.cos(Math.PI - visual.current.rotation.y),
        );
        visual.current.rotation.y += diff * (1 - Math.exp(-10 * delta));
      }
    }
    if (
      !avatarAnimation.current &&
      !swimming &&
      useMountain.getState().summitBoardEquipped &&
      isMountainPosition(rb.translation().x, rb.translation().z)
    )
      avatarAnimation.current = "CarryBox";
    const flightVertical = locked ? 0 : mobility.vertical || Number(k.jump) - Number(k.descend);
    if (carried) avatarAnimation.current = "Piggyback";
    else if (flying) avatarAnimation.current = flightAnimation(move.length(), flightVertical);
    if (race) avatarAnimation.current = race.hopping ? "Jump" : "Idle";
    setLocalNetAnim(avatarAnimation.current);

    const moving = move.lengthSq() > 0 && !sitting;
    // Commanded speed (not position delta): physics hitches were restarting Walk
    // and making timeScale stutter. Avatar hysteresis still handles stop→Idle.
    gait.current = THREE.MathUtils.damp(gait.current, moving && !recovering ? speed : 0, 14, delta);

    // Sound follows measured displacement; animation retains its stable commanded gait.
    const footPos = rb.translation();
    const last = stepPosition.current;
    const travel = footTravel(
      last ? Math.hypot(footPos.x - last.x, footPos.z - last.z) : 0,
      delta,
      grounded &&
        !swimming &&
        !airborne &&
        !sitting &&
        !recovering &&
        (!locked || guidedWalkSpeed > 0),
    );
    stepPosition.current = { x: footPos.x, z: footPos.z };
    if (travel > 0) {
      stepPhase.current += travel;
      if (stepPhase.current >= strideLength.current) {
        stepPhase.current = 0;
        strideLength.current = (running ? 1.8 : 1.45) * (0.96 + Math.random() * 0.08);
        // WaterSplash owns wet contacts; dry thumps must not layer over puddle steps.
        if (!wading && (!water || footPos.y - STAND_Y >= water.surface + 0.025))
          playFootstepSfx(Math.min(1, travel / delta / RUN), footSurfaceAt(footPos.x, footPos.z));
      }
    } else if (
      !moving ||
      !grounded ||
      recovering ||
      (locked && guidedWalkSpeed === 0) ||
      delta >= 0.15
    ) {
      stepPhase.current = 0;
    }
    // A render frame without a physics step contributes no distance, but must not
    // erase travel accumulated at the mobile 40 Hz physics rate.

    // Hiking uses real support contacts; a fall must recover before the distant ocean catches it.
    const mountainPosition = rb.translation();
    if (!isDungeonRoom() && !useMountain.getState().flight && !carried && !flying) {
      const inMountain = isMountainPosition(mountainPosition.x, mountainPosition.z);
      const belowTrail =
        !swimming &&
        mountainSupport.current !== null &&
        mountainPosition.y - STAND_Y < mountainSupport.current - 5;
      if (
        (inMountain && (mountainPosition.y < MOUNTAIN_RESCUE_Y || belowTrail)) ||
        (!inMountain &&
          mountainSupport.current !== null &&
          mountainPosition.x > MOUNTAIN_BOUNDS.minX - 30)
      ) {
        const destination = mountainRespawn(useMountain.getState().checkpoint);
        useGame.getState().requestTeleport(destination);
        useGame.getState().setToast("Kembali ke checkpoint terakhir. Ayo coba lagi!");
        return;
      }
      if (
        inMountain &&
        grounded &&
        (mountainGround?.mountainTrail || mountainGround?.mountainCheckpoint)
      )
        mountainSupport.current = mountainPosition.y - STAND_Y;
      if (!inMountain) mountainSupport.current = null;
    }

    // Falling off a course platform resets only this run, directly onto its stable checkpoint.
    // Never use ground-level navigation snapping for elevated checkpoint positions.
    const course = useObby.getState();
    const fallPosition = rb.translation();
    if (course.status === "active" && !carried && !flying) {
      if (
        atObbyExit(fallPosition.x, fallPosition.z, fallPosition.y - STAND_Y) ||
        !useChannels.getState().playing
      ) {
        course.reset();
      } else if (
        belowObbyRoute(course.step, fallPosition.y - STAND_Y) ||
        (grounded &&
          !airborne &&
          !!(supportBody?.userData as { obbyCatchSurface?: boolean } | undefined)
            ?.obbyCatchSurface) ||
        !inObbyBounds(fallPosition.x, fallPosition.z, 5)
      ) {
        const checkpoint = OBBY_PLATFORMS[course.checkpoint]!;
        const target = platformPosition(checkpoint);
        const destination = { x: target.x, y: target.y + STAND_Y + 0.035, z: target.z };
        rb.setTranslation(destination, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rb.collider(0).setCollisionGroups(interactionGroups(1, [0, 2]));
        impact.current = emptyImpact();
        jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
        avatarAnimation.current = undefined;
        setLocalNetAnim(undefined);
        useControls.getState().consumeJump();
        stepPosition.current = null;
        // Keep the orbit's relative offset instead of dragging the camera across the course.
        const offset = scratch.current.move.set(
          destination.x - fallPosition.x,
          destination.y - fallPosition.y,
          destination.z - fallPosition.z,
        );
        camPos.current.add(offset);
        lookAt.current.add(offset);
        course.respawn();
        useGame
          .getState()
          .setPlayerPos(
            [destination.x, destination.y, destination.z],
            false,
            visual.current?.rotation.y ?? 0,
          );
      }
    }

    if (race) {
      rb.collider(0).setCollisionGroups(interactionGroups(1, []));
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setTranslation(race, true);
      visual.current?.parent?.position.set(race.x, race.y, race.z);
      if (visual.current) visual.current.rotation.y = race.ry;
      gait.current = 0;
      jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
      spawnPlacement.current.finished = true;
    }
    // Special movement still updates the canonical physics root and the usual camera/network path.
    if (carried && carrier) {
      const current = rb.translation();
      const target = blendCarryMount(
        carryBlend.current,
        pair!.id,
        { ...current, ry: visual.current?.rotation.y ?? carrier.ry },
        passengerPose(remoteRenderPose(pair!.carrier, carrier, clock.elapsedTime, delta)),
        delta,
      );
      rb.collider(0).setCollisionGroups(interactionGroups(1, []));
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setTranslation(target, true);
      // Rapier already interpolated the mesh this frame. Match the shared carrier
      // sample immediately instead of displaying the passenger one physics tick late.
      visual.current?.parent?.position.set(target.x, target.y, target.z);
      if (visual.current) visual.current.rotation.y = target.ry;
      gait.current = 0;
      // Both players traverse the same physical course. A carrier must actually stand
      // on a platform; airborne poses and flight cannot advance a passenger's run.
      if (!isJumpAnimation(carrier.anim) && !carrier.anim?.startsWith("Swim")) {
        const support = world.castRay(
          new rapier.Ray(carrier, { x: 0, y: -1, z: 0 }),
          STAND_Y + 0.075,
          true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          interactionGroups(1, [0]),
          undefined,
          rb,
          (collider) =>
            !!(collider.parent()?.userData as { obbyPlatform?: string } | undefined)?.obbyPlatform,
        );
        const platform = (
          support?.collider.parent()?.userData as { obbyPlatform?: string } | undefined
        )?.obbyPlatform;
        if (platform) useObby.getState().land(platform);
      }
      jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
      spawnPlacement.current.finished = true;
    } else if (flying) {
      carryBlend.current.id = null;
      const vertical = flightVertical;
      const position = rb.translation();
      const velocity = rb.linvel();
      rb.setLinvel(
        {
          x: velocity.x,
          y:
            (position.y >= 80 && vertical > 0) || (position.y <= -100 && vertical < 0)
              ? 0
              : vertical * 5,
          z: velocity.z,
        },
        true,
      );
      jump.current = { anticipation: 0, landing: 0, wasAirborne: false };
    }

    if (!carried) carryBlend.current.id = null;

    // Orbit third-person: yaw + pitch spherical, follow halus, hindari tembus dinding.
    const p = rb.translation();
    // Publish before the home/warung cameras return. Those views skip the rest of the
    // frame, and sleep, the door ring, and "Keluar" all read this store position.
    syncTimer.current += delta;
    const inside = playerInsideStore(p);
    if (inside !== game.inside || syncTimer.current > 0.15) {
      syncTimer.current = 0;
      useGame.getState().setPlayerPos([p.x, p.y, p.z], inside, visual.current?.rotation.y ?? 0);
    }
    // Rumah has a close orbit entirely inside its solid shell.
    if (isHomeRoom(p.x, p.z)) {
      const seat = sittingBench ?? nearbyHomeSofaSeat(p);
      game.setNearby(seat ? { id: seat.id, label: seat.label, kind: "bench" } : null);
      updateRoomCamera(p, delta, HOME_CAM_BOUNDS);
      return;
    }
    if (warungRoom) {
      if (serviceView) {
        const [ox, oy, oz] = warungOrigin(warungRoom.id);
        // Counter service has a fixed viewpoint; movement input cannot displace the shopkeeper.
        // Set directly on entry so a city-to-room teleport does not fly the camera through walls.
        camPos.current.set(
          ox + WARUNG_COUNTER_CAMERA[0],
          oy + WARUNG_COUNTER_CAMERA[1],
          oz + WARUNG_COUNTER_CAMERA[2],
        );
        lookAt.current.set(
          ox + WARUNG_COUNTER_TARGET[0],
          oy + WARUNG_COUNTER_TARGET[1],
          oz + WARUNG_COUNTER_TARGET[2],
        );
        camera.position.copy(camPos.current);
        camera.lookAt(lookAt.current);
        if (visual.current) visual.current.visible = false;
        return;
      }
      updateRoomCamera(p, delta, warungCameraBounds.current);
      return;
    }

    const gangScene = useGang.getState();
    const halteCeiling = halteCameraCeiling(
      p,
      gangScene.inside !== null ? gangScene.data?.layout.origin : undefined,
      inHalteCamera.current ? 0.35 : 0,
    );
    if (halteCeiling !== null && !inHalteCamera.current) halteReframe.current = true;
    if (halteCeiling === null || look.x || look.y || k.yawLeft || k.yawRight || mouse.turn)
      halteReframe.current = false;
    // Do not remap held movement keys/stick while climbing. Finish the turn when the player stops.
    if (halteReframe.current && move.lengthSq() < 0.001) {
      const target = (visual.current?.rotation.y ?? 0) + Math.PI;
      const diff = Math.atan2(Math.sin(target - yaw.current), Math.cos(target - yaw.current));
      yaw.current += diff * (1 - Math.exp(-5 * delta));
      if (Math.abs(diff) < 0.02) halteReframe.current = false;
    }
    if (halteCeiling !== null && pitch.current > 0.12 && !look.y)
      pitch.current = THREE.MathUtils.damp(pitch.current, 0.12, 5, delta);
    inHalteCamera.current = halteCeiling !== null;
    const indoor =
      halteCeiling !== null ||
      inside ||
      inShowroom ||
      isDungeonRoom() ||
      (useClub.getState().inside && !useClub.getState().outdoor);
    const cameraCeiling =
      halteCeiling !== null
        ? halteCeiling - 0.25
        : isDungeonRoom()
          ? 11
          : inShowroom
            ? SHOWROOM_ROOM.height - 0.25
            : indoor
              ? STORE.wallHeight - 0.25
              : Infinity;
    const targetDist =
      (isDungeonRoom() ? 6.6 : indoor ? CAM_DIST_IN : CAM_DIST) * useCameraZoom.getState().distance;
    camDist.current = faceStorefront
      ? targetDist
      : THREE.MathUtils.lerp(camDist.current, targetDist, 1 - Math.exp(-4 * delta));

    // Lift the view gently on the north approach: the existing Plaza back wall
    // otherwise compresses the trailing camera against the first two platforms.
    // Keep the same orbit, collision sweep, zoom and user's look input.
    courseCameraBlend.current = THREE.MathUtils.damp(
      courseCameraBlend.current,
      !indoor && p.z < -14 && inObbyBounds(p.x, p.z, 3) ? 1 : 0,
      6,
      delta,
    );
    // Keep the whole body visible when construction collision shortens the camera boom.
    const targetLift = isDungeonRoom()
      ? 1.1
      : indoor
        ? 0.55
        : THREE.MathUtils.lerp(
            2.3,
            1.1,
            courseCameraBlend.current * THREE.MathUtils.smoothstep(-p.z, 23, 27),
          );
    focusLift.current = faceStorefront
      ? targetLift
      : THREE.MathUtils.damp(focusLift.current, targetLift, 5, delta);
    const focusY = p.y + focusLift.current;
    const focus = v.focus.set(p.x, focusY, p.z);
    const orbitPitch = THREE.MathUtils.lerp(
      pitch.current,
      Math.max(pitch.current, 0.42),
      courseCameraBlend.current,
    );
    const cosPitch = Math.cos(orbitPitch);
    const sinPitch = Math.sin(orbitPitch);
    const ideal = v.ideal.set(
      p.x + Math.sin(yaw.current) * camDist.current * cosPitch,
      Math.min(cameraCeiling, focusY + camDist.current * sinPitch * 0.85 + 0.35),
      p.z + Math.cos(yaw.current) * camDist.current * cosPitch,
    );

    const toCam = v.toCam.copy(ideal).sub(focus);
    let idealLen = toCam.length();
    let finalDist = idealLen;
    if (idealLen > 0.001) {
      toCam.multiplyScalar(1 / idealLen);
      // Sweep the near-plane volume through Rapier's broadphase, not product triangles.
      const hit = world.castShape(
        focus,
        cameraRotation,
        toCam,
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

    // When a wall compresses the indoor orbit, seek a clear higher angle before
    // allowing the lens into the avatar's face. Every candidate is still swept.
    if (indoor && !isDungeonRoom() && finalDist < 1.8) {
      for (const turn of [0, 0.7, -0.7, 1.4, -1.4, Math.PI]) {
        const candidate = v.safeDir.set(
          Math.sin(yaw.current + turn) * 2.1,
          Math.max(0.5, cameraCeiling - 0.2 - focusY),
          Math.cos(yaw.current + turn) * 2.1,
        );
        const length = candidate.length();
        candidate.normalize();
        const hit = world.castShape(
          focus,
          cameraRotation,
          candidate,
          cameraShape,
          0,
          length,
          true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          undefined,
          rb,
          (collider) =>
            !(collider.parent()?.userData as { cameraPassThrough?: boolean })?.cameraPassThrough,
        );
        const clear = hit ? Math.max(CAM_MIN_DIST, hit.time_of_impact - CAM_COLLIDE_BIAS) : length;
        if (clear > finalDist + 0.4) {
          toCam.copy(candidate);
          idealLen = length;
          finalDist = clear;
        }
      }
    }

    const desired =
      idealLen > 0.001
        ? v.desired.copy(focus).addScaledVector(toCam, finalDist)
        : v.desired.copy(ideal);

    const follow = 1 - Math.exp(-7 * delta);
    const lookFollow = 1 - Math.exp(-9 * delta);
    // The exit cover has masked the turn. Start on the street side of the wall.
    if (faceStorefront) camPos.current.copy(desired);
    else camPos.current.lerp(desired, follow);
    // Recheck the interpolated position: smoothing must never travel through a wall.
    // Skip when already at the cast-safe ideal (no lerp travel through geometry).
    const safeDir = v.safeDir.copy(camPos.current).sub(focus);
    const safeLen = safeDir.length();
    if (safeLen > 0.001 && Math.abs(safeLen - finalDist) > 0.02) {
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
    if (inShowroom)
      camPos.current.z = Math.min(
        camPos.current.z,
        SHOWROOM_ROOM.origin[2] + SHOWROOM_ROOM.halfDepth - 0.38,
      );
    if (faceStorefront) lookAt.current.copy(focus);
    else lookAt.current.lerp(focus, lookFollow);
    camera.position.copy(camPos.current);
    camera.lookAt(lookAt.current);
    if (visual.current)
      visual.current.visible = camera.position.distanceTo(v.focus.set(p.x, p.y + 0.6, p.z)) > 0.85;
    if (hitAge < 0.23) {
      // Angular shake leaves the already collision-safe camera position untouched.
      const amount = (LOW_QUALITY ? 0.006 : 0.012) * (1 - hitAge / 0.23);
      camera.rotateZ(Math.sin(hitAge * 95) * amount);
      camera.rotateX(Math.cos(hitAge * 80) * amount * 0.5);
    }

    const photoActive = useHud.getState().sheet === "camera";
    const photo = usePhoto.getState();
    if (visual.current) visual.current.visible = !(photoActive && photo.mode === "rear");
    if (photoActive) {
      photoCameraPose(
        p,
        visual.current?.rotation.y ?? 0,
        photo.mode,
        photo.yaw,
        photo.pitch,
        v.ideal,
        v.focus,
      );
      // Selfie uses the same collision hull as the gameplay orbit camera.
      if (photo.mode === "selfie") {
        v.toCam.copy(v.ideal).sub(v.focus);
        const distance = v.toCam.length();
        v.toCam.normalize();
        const obstruction = world.castShape(
          v.focus,
          cameraRotation,
          v.toCam,
          cameraShape,
          0,
          distance,
          true,
          undefined,
          undefined,
          undefined,
          rb,
          (collider) =>
            !(collider.parent()?.userData as { cameraPassThrough?: boolean } | undefined)
              ?.cameraPassThrough,
        );
        if (obstruction)
          v.ideal
            .copy(v.focus)
            .addScaledVector(
              v.toCam,
              Math.max(CAM_MIN_DIST, obstruction.time_of_impact - CAM_COLLIDE_BIAS),
            );
      }
      camera.position.copy(v.ideal);
      camera.lookAt(v.focus);
      if (!photo.ready) usePhoto.setState({ ready: true });
    }

    applyPrologCamera(camera);

    let best: NearbyTarget | null = null;
    let bestDist = Infinity;
    for (const it of isDungeonRoom() ? [] : [...INTERACTABLES, ...dynamicInteractables()]) {
      if (!inside && isStoreInterior(...it.position)) continue;
      if (it.kind === "bench" && claims.has(it.id)) continue;
      if (Math.abs(it.position[1] - (p.y - 0.83)) > 1.8) continue;
      const dx = it.position[0] - p.x;
      const dz = it.position[2] - p.z;
      const d = Math.hypot(dx, dz);
      if (d < it.radius && d < bestDist) {
        bestDist = d;
        best = { id: it.id, label: it.label, kind: it.kind };
      }
    }
    // A seated neighbor should not hide the empty place beside them with a social prompt.
    const nearbyBench =
      best?.kind === "bench" && BENCH_SEATS.find((seat) => seat.id === best?.id)?.benchId;
    for (const [id, s] of remoteStates) {
      if (!canInteractWithPlayer(id)) continue;
      if (!inside && isStoreInterior(s.x, s.y, s.z)) continue;
      if (id === playerId || Math.abs(s.y - p.y) > 2) continue;
      if (
        nearbyBench &&
        BENCH_SEATS.some((seat) => seat.benchId === nearbyBench && claims.get(seat.id)?.id === id)
      )
        continue;
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
    // Keep the exit action reachable even when another actor approaches the seat.
    if (sitting && sittingBench)
      best = { id: sittingBench.id, label: sittingBench.label, kind: "bench" };
    useGame.getState().setNearby(isDungeonRoom() ? null : best);
  });

  // Apply close-up views after the gameplay orbit without changing player movement.
  useFrame(({ size }, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    storeEntryCamera.apply(camera, delta);
    showroomEntryCamera.apply(camera, delta);
    const sheet = useHud.getState().sheet;
    const active = sheet === "grosir";
    const view = useKioskView.getState();
    const focused = kioskCamera.update(camera, active, delta, reducedCameraMotion.current, KIOSK, {
      width: size.width,
      height: size.height,
      sceneWidth: view.sceneWidth,
      sceneHeight: view.sceneHeight,
    });
    const [x, , z] = useGame.getState().playerPos;
    const showroomFocused = showroomCatalogCamera.apply(
      camera,
      !focused && sheet === "showroom" && isShowroomRoom(x, z),
      delta,
      reducedCameraMotion.current,
    );
    if ((focused || showroomFocused) && visual.current) visual.current.visible = false;
  });

  return (
    <RigidBody
      name="Player"
      ref={body}
      userData={bodyData}
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
        <CarriedBoxes />
        <DungeonParcel />
        <group name="CharacterVisual" ref={avatarVisual} scale={1}>
          <BaseAvatarV2
            playerAvatar
            selfieCamera
            avatar={avatar}
            mountainOutfit={activeOutfit}
            character={profile?.equippedCharacter}
            speed={gait}
            animation={avatarAnimation}
            dancePlayerId={connectionId}
            groundToWorld
          />
        </group>
        <ObbyParachute ref={parachuteVisual} />
        <SelfieStick />
        <Flashlight />
        <MountainSummitBoard />
      </group>
    </RigidBody>
  );
}
