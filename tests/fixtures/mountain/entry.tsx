import { useSummitLeaderboard } from "@/game/mountain/leaderboard";
import { useProfile } from "@/identity/profile-store";
import { avatarFromSeed } from "@/identity/avatar";
import { PhotoCapture } from "@/game/photo/PhotoCapture";
import { usePhoto } from "@/game/photo/photo-store";
/* eslint-disable react-refresh/only-export-components -- Standalone QA fixture. */
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  useRapier,
  interactionGroups,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Player } from "@/game/player/Player";
import { RemotePlayers } from "@/game/net/RemotePlayers";
import { remoteStates } from "@/net/useWorldChannel";
import { MOUNTAIN_SEATS } from "@/game/mountain/seats";
import { MOUNTAIN_OUTFIT_STAND } from "@/game/mountain/outfits";
import { WORLD_GRAVITY } from "@/game/player/movement";
import { LOW_QUALITY, renderDpr, outdoorViewDistance } from "@/game/engine/quality";
import { AdaptiveQuality, selectBudgetTier, useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { OutdoorLocations } from "@/game/engine/OutdoorLocations";
import { useMountainLocation } from "@/game/engine/location";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { SkyEnvironment } from "@/game/world/SkyEnvironment";
import { Environment, Lightformer } from "@react-three/drei";
import { MountainScene, CityHelipad } from "@/game/mountain/MountainScene";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import {
  CITY_HELIPAD,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  MOUNTAIN_CHALLENGES,
  isMountainPosition,
  mountainGroundHeight,
  MOUNTAIN_BRIDGE_SEGMENT,
  MOUNTAIN_BOUNDS,
  MOUNTAIN_COAST,
  mountainWorldPoint,
} from "@/game/mountain/model";
import { challengePlatforms } from "@/game/mountain/obstacles";
import { boardHelicopter, useMountain } from "@/game/mountain/store";
import { resumeAudioContext } from "@/game/audio/audio-context";
import { useAudioSettings } from "@/game/audio/audio-manager";
import { ActionProjection } from "@/game/interactions/ActionProjection";
import { currentContextAction } from "@/game/interactions/context-action";
import { Hud } from "@/ui/hud/Hud";
import { MobileControls } from "@/ui/hud/MobileControls";
import { GameplayHudLayer } from "@/ui/hud/GameplayHudLayer";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";
import { useNet } from "@/net/net-store";
import { useChannels, connectionId } from "@/net/channel-store";
import { useControls } from "@/game/player/control-state";
import { useTouchDrive } from "@/game/player/touch-drive";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import type { SpotLight } from "three";
import "@/styles.css";

type ProbeFrame = {
  x: number;
  y: number;
  z: number;
  vy: number;
  support: { mountainTrail?: boolean; mountainCheckpoint?: number } | null;
  flashlightVisible: boolean;
  flashlightIntensity: number;
  at: number;
};
type Probe = {
  frames: number;
  ready: boolean;
  sample: ProbeFrame | null;
  samples: ProbeFrame[];
  place?: (position: readonly number[]) => void;
  physicsHz: number;
  overview: boolean;
};
const probe: Probe = {
  frames: 0,
  ready: false,
  sample: null,
  samples: [],
  physicsHz: 0,
  overview: false,
};
const qa = window as Window & Record<string, unknown>;
qa.mountainQA = probe;
qa.mountain = useMountain;
qa.summitBoard = useSummitLeaderboard;
qa.game = useGame;
qa.profile = useProfile;
qa.remotes = remoteStates;
qa.net = useNet;
qa.budget = useRenderBudget;
qa.hud = useHud;
qa.photo = usePhoto;
qa.gameUi = useGameUi;
qa.channels = useChannels;
qa.touchDrive = useTouchDrive;
qa.boardHelicopter = boardHelicopter;
qa.currentAction = currentContextAction;
qa.plan = {
  city: CITY_HELIPAD,
  mountain: MOUNTAIN_HELIPAD,
  checkpoints: MOUNTAIN_CHECKPOINTS,
  summit: MOUNTAIN_SUMMIT,
  trail: MOUNTAIN_TRAIL,
  bounds: MOUNTAIN_BOUNDS,
  coast: MOUNTAIN_COAST,
  seats: MOUNTAIN_SEATS,
  outfitStand: MOUNTAIN_OUTFIT_STAND,
  bridge: mountainWorldPoint([355, 20, 18]),
  walkSegments: [
    [
      [330, 20, 18],
      [344, 20, 18],
    ],
    [
      [414, 31, -24],
      [382, 35, -24],
    ],
  ].map((segment) => segment.map((point) => mountainWorldPoint(point as [number, number, number]))),
  challenges: MOUNTAIN_CHALLENGES.map((c) => ({ ...c, platforms: challengePlatforms(c) })),
};
useProfile.setState({
  profile: {
    id: "mountain-qa",
    displayName: "Pendaki QA",
    username: "pendaki-qa",
    bio: "",
    role: "pengunjung",
    avatar: avatarFromSeed("mountain-qa"),
    equippedCharacter: null,
    joinedAt: "2026-11-10",
    updatedAt: "2026-11-10",
  },
  owned: [],
});
useNet.setState({ name: "Pendaki QA", connected: true });
useChannels.setState({ lease: { channel: "CHANNEL-01", connectionId }, playing: true });
useGame.setState({ overlay: "none", pendingTeleport: [...CITY_HELIPAD.spawn] });
useAudioSettings.getState().setVolume("master", 0.15);
window.addEventListener("pointerdown", () => void resumeAudioContext(), { once: true });

function ProbeScene() {
  const { world, rapier } = useRapier();
  const three = useThree();
  qa.three = three;
  qa.scanMountainSurface = () => {
    const failures: unknown[] = [];
    let samples = 0,
      maxError = 0;
    for (let segment = 0; segment < MOUNTAIN_TRAIL.length - 1; segment++) {
      const a = MOUNTAIN_TRAIL[segment]!,
        b = MOUNTAIN_TRAIL[segment + 1]!;
      const dx = b[0] - a[0],
        dz = b[2] - a[2],
        length = Math.hypot(dx, dz);
      const steps = Math.ceil(length / 0.4);
      for (let step = 0; step <= steps; step++)
        for (const offset of [-1.65, 0, 1.65]) {
          const x = a[0] + (dx * step) / steps - (dz / length) * offset;
          const z = a[2] + (dz * step) / steps + (dx / length) * offset;
          const expected = segment === MOUNTAIN_BRIDGE_SEGMENT ? a[1] : mountainGroundHeight(x, z);
          const hit = world.castRay(
            new rapier.Ray({ x, y: expected + 2, z }, { x: 0, y: -1, z: 0 }),
            4,
            true,
            rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,
            interactionGroups(1, [0]),
            undefined,
            undefined,
            (collider) =>
              !!(collider.parent()?.userData as { mountainTrail?: boolean })?.mountainTrail,
          );
          const error = hit ? Math.abs(2 - hit.timeOfImpact) : Infinity;
          maxError = Math.max(maxError, error);
          if (error > 0.35) failures.push({ segment, step, offset, x, z, expected, error });
          samples++;
        }
    }
    return { samples, maxError, failures };
  };
  const body = (): RapierRigidBody | null => {
    let player: RapierRigidBody | null = null;
    world.forEachRigidBody((candidate) => {
      if (candidate.isDynamic()) player = candidate;
    });
    return player;
  };
  probe.place = (position) => {
    const player = body();
    if (!player) throw new Error("Player body not mounted");
    const [x, y, z] = position as [number, number, number];
    player.setTranslation({ x, y, z }, true);
    player.setLinvel({ x: 0, y: 0, z: 0 }, true);
    useControls.getState().consumeJump();
    useTouchDrive.getState().reset();
    useGame.setState({ playerPos: [x, y, z], pendingTeleport: null });
  };
  useFrame(() => {
    const player = body();
    if (!player) return;
    const p = player.translation();
    const hit = world.castRay(
      new rapier.Ray(p, { x: 0, y: -1, z: 0 }),
      1.05,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      interactionGroups(1, [0]),
      undefined,
      player,
    );
    const flashlight = three.scene.getObjectByName("MountainFlashlight");
    const light = three.scene.getObjectByName("MountainFlashlightBeam") as SpotLight | undefined;
    const sample: ProbeFrame = {
      ...p,
      vy: player.linvel().y,
      at: performance.now(),
      support: (hit?.collider.parent()?.userData as ProbeFrame["support"]) ?? null,
      flashlightVisible: flashlight?.visible ?? false,
      flashlightIntensity: light?.intensity ?? 0,
    };
    probe.sample = sample;
    probe.samples.push(sample);
    if (probe.samples.length > 2000) probe.samples.shift();
    probe.frames++;
    probe.ready = probe.frames > 45 && useControls.getState().playerReady;
    probe.physicsHz = 1 / world.timestep;
    if (qa.waterfallView) {
      three.camera.position.set(...mountainWorldPoint([355, 17, 28]));
      three.camera.lookAt(...mountainWorldPoint([355, 16, 13.9]));
    }
    const view = qa.cameraView as
      { position: [number, number, number]; target: [number, number, number] } | undefined;
    if (view) {
      three.camera.position.set(...view.position);
      three.camera.lookAt(...view.target);
    }
    if (probe.overview) {
      three.camera.position.set(...mountainWorldPoint([421, 79, 110]));
      three.camera.lookAt(...mountainWorldPoint([357, 25, 5]));
    }
  });
  return null;
}

// Match GameCanvas: crossing the region boundary rerenders the player subtree.
function RegionalPlayer() {
  useGame((s) => isMountainPosition(s.playerPos[0], s.playerPos[2]));
  return <Player />;
}

function Fixture() {
  const viewport = useWorldViewport();
  const cityWorld = new URLSearchParams(location.search).has("world");
  const lighting = new URLSearchParams(location.search).has("lighting");
  const tier = useRenderBudget(selectBudgetTier);
  const low = lighting ? tier === "LOW" : LOW_QUALITY;
  const view = outdoorViewDistance(useMountainLocation(), low);
  return (
    <main
      ref={viewport}
      className="world-viewport game-ui"
      data-game-ui-root
      style={{ height: "100dvh" }}
    >
      <Canvas
        camera={{ position: [65, 9, 64], fov: 55, far: view.far }}
        dpr={lighting ? renderDpr(tier) : 1}
        shadows={lighting && !low}
      >
        <color attach="background" args={["#b9d8ef"]} />
        <fog attach="fog" args={["#b9d8ef", view.fogNear, view.fogFar]} />
        {lighting ? (
          <>
            <SceneEnvironment />
            {!low && (
              <Environment>
                <Lightformer
                  intensity={1.6}
                  position={[0, 12, 0]}
                  scale={[24, 24, 1]}
                  color="#ffffff"
                />
                <Lightformer
                  intensity={0.9}
                  color="#bcdcf5"
                  position={[-14, 4, -6]}
                  rotation-y={Math.PI / 2}
                  scale={[30, 6, 1]}
                />
              </Environment>
            )}
            <SkyEnvironment />
          </>
        ) : (
          <>
            <ambientLight intensity={1.1} />
            <directionalLight position={[35, 65, 38]} intensity={2.2} />
          </>
        )}
        <Suspense fallback={null}>
          <Physics gravity={[0, WORLD_GRAVITY, 0]} timeStep={low ? 1 / 40 : 1 / 60}>
            <OutdoorLocations
              mountain={<MountainScene />}
              city={
                <>
                  {cityWorld ? (
                    <OutdoorNeighborhood />
                  ) : (
                    <RigidBody type="fixed" colliders={false}>
                      <CuboidCollider args={[90, 0.2, 90]} position={[0, -0.2, 0]} />
                      <mesh position={[0, -0.2, 0]}>
                        <boxGeometry args={[180, 0.4, 180]} />
                        <meshStandardMaterial color="#a8c99c" />
                      </mesh>
                    </RigidBody>
                  )}
                  <CityHelipad />
                </>
              }
            />
            <RegionalPlayer />
            <RemotePlayers />
            <ProbeScene />
          </Physics>
        </Suspense>
        {lighting && <AdaptiveQuality />}
        <PhotoCapture />
        <ActionProjection />
      </Canvas>
      <GameplayHudLayer>
        <Hud />
        <MobileControls />
      </GameplayHudLayer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
