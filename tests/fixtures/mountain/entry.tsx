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
import { WORLD_GRAVITY } from "@/game/player/movement";
import { LOW_QUALITY } from "@/game/engine/quality";
import { MountainScene, CityHelipad } from "@/game/mountain/MountainScene";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import {
  CITY_HELIPAD,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  isMountainPosition,
} from "@/game/mountain/model";
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
qa.game = useGame;
qa.hud = useHud;
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
};
useNet.setState({ name: "Pendaki QA", connected: true });
useChannels.setState({ lease: { channel: "CHANNEL-01", connectionId }, playing: true });
useGame.setState({ overlay: "none", pendingTeleport: [...CITY_HELIPAD.spawn] });
useAudioSettings.getState().setVolume("master", 0.15);
window.addEventListener("pointerdown", () => void resumeAudioContext(), { once: true });

function ProbeScene() {
  const { world, rapier } = useRapier();
  const three = useThree();
  qa.three = three;
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
    if (probe.overview) {
      three.camera.position.set(421, 79, 110);
      three.camera.lookAt(357, 25, 5);
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
  return (
    <main
      ref={viewport}
      className="world-viewport game-ui"
      data-game-ui-root
      style={{ height: "100dvh" }}
    >
      <Canvas camera={{ position: [65, 9, 64], fov: 55, far: 500 }} dpr={1}>
        <color attach="background" args={["#b9d8ef"]} />
        <fog attach="fog" args={["#b9d8ef", 90, 260]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[35, 65, 38]} intensity={2.2} />
        <Suspense fallback={null}>
          <Physics gravity={[0, WORLD_GRAVITY, 0]} timeStep={LOW_QUALITY ? 1 / 40 : 1 / 60}>
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
            <MountainScene />
            <RegionalPlayer />
            <ProbeScene />
          </Physics>
        </Suspense>
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
