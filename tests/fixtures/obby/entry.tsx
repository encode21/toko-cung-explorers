/* eslint-disable react-refresh/only-export-components -- Standalone browser fixture entry point. */
import { RemotePlayers } from "@/game/net/RemotePlayers";
import { startMobilityFixture } from "../mobility/runtime";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { SwimmingBeach } from "@/game/swimming/SwimmingBeach";
import React, { Suspense } from "react";
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
import { FishingSpot } from "@/game/fishing/FishingSpot";
import { useFishing, openFishing } from "@/game/fishing/store";
import { avatarFromSeed } from "@/identity/avatar";
import { useGameSettings } from "@/state/game-settings";
import { ActionProjection } from "@/game/interactions/ActionProjection";
import { QuestGuidance } from "@/game/core/QuestGuidance";
import { PlazaObby } from "@/game/obby/PlazaObby";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { ConcertSet } from "@/game/club/VenueSet";
import { OBBY_PLATFORMS, platformPosition, getObbyTime } from "@/game/obby/model";
import { useObby } from "@/game/obby/store";
import { Hud } from "@/ui/hud/Hud";
import { MobileControls } from "@/ui/hud/MobileControls";
import { GameplayHudLayer } from "@/ui/hud/GameplayHudLayer";
import { QuestCompleteOverlay } from "@/ui/quests/QuestCompleteOverlay";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { useChannels, connectionId } from "@/net/channel-store";
import { useProfile } from "@/identity/profile-store";
import { useTouchDrive } from "@/game/player/touch-drive";
import { useControls } from "@/game/player/control-state";
import { getLocalNetAnim } from "@/net/local-pose";
import { useQuestCompletion } from "@/game/core/completion-store";
import "@/styles.css";

interface ObbyFrame {
  at: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  support: string | null;
  camera: number[];
  anim: string | undefined;
  rightArm: number[] | undefined;
  step: number;
  checkpoint: number;
  respawns: number;
}
interface ObbyProbe {
  frames: number;
  samples: ObbyFrame[];
  platforms: typeof OBBY_PLATFORMS;
  physicsHz?: number;
  place?: (x: number, y: number, z: number) => void;
  platform?: (
    index: number,
  ) => (typeof OBBY_PLATFORMS)[number] & ReturnType<typeof platformPosition>;
  sample?: ObbyFrame;
  ready?: boolean;
  overview?: boolean;
  beachOverview?: boolean;
}
const qa = window as Window & Record<string, unknown> & { obbyQA: ObbyProbe };
const showWorld = new URLSearchParams(location.search).has("world");
useNet.setState({ name: "Obby Explorer", connected: true });
useChannels.setState({ lease: { channel: "CHANNEL-01", connectionId }, playing: true });
useGame.setState({ overlay: "none", pendingTeleport: [30.3, 0.83, -17.5] });
qa.fishing = useFishing;
qa.openFishing = openFishing;
qa.settings = useGameSettings;
if (new URLSearchParams(location.search).has("fishing"))
  useProfile.setState({
    profile: {
      id: "test",
      displayName: "Cung Angler",
      username: "angler",
      bio: "",
      role: "pengunjung",
      avatar: avatarFromSeed("test"),
      equippedCharacter: null,
      joinedAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  });
qa.profile = useProfile;
qa.game = useGame;
qa.hud = useHud;
qa.obby = useObby;
qa.touchDrive = useTouchDrive;
qa.completion = useQuestCompletion;
qa.obbyRequests = [];
const mobilityFixture = new URLSearchParams(location.search).has("mobility");
if (mobilityFixture) void startMobilityFixture();
qa.obbyQA = { frames: 0, samples: [], platforms: OBBY_PLATFORMS };

function Probe() {
  const { world, rapier } = useRapier();
  const three = useThree();
  qa.three = three;
  const playerBody = (): RapierRigidBody | null => {
    let player: RapierRigidBody | null = null;
    world.forEachRigidBody((body) => {
      if (body.isDynamic()) player = body;
    });
    return player;
  };
  qa.obbyQA.place = (x: number, y: number, z: number) => {
    const body = playerBody();
    if (!body) throw new Error("Player body has not mounted");
    body.setTranslation({ x, y, z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    useControls.getState().consumeJump();
    useGame.setState({ playerPos: [x, y, z], pendingTeleport: null });
  };
  qa.obbyQA.platform = (index: number) => ({
    ...OBBY_PLATFORMS[index]!,
    ...platformPosition(OBBY_PLATFORMS[index]!, getObbyTime()),
  });
  useFrame(() => {
    // Read Rapier's effective timestep after stepping, not the requested JSX setting.
    qa.obbyQA.physicsHz = 1 / world.timestep;
    const body = playerBody();
    if (!body) return;
    const p = body.translation();
    const velocity = body.linvel();
    const hit = world.castRay(
      new rapier.Ray(p, { x: 0, y: -1, z: 0 }),
      1.05,
      true,
      undefined,
      interactionGroups(1, [0]),
      undefined,
      body,
    );
    const sample = {
      at: performance.now(),
      x: p.x,
      y: p.y,
      z: p.z,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
      support:
        (hit?.collider.parent()?.userData as { obbyPlatform?: string } | undefined)?.obbyPlatform ??
        null,
      camera: three.camera.position.toArray(),
      anim: getLocalNetAnim(),
      rightArm: (
        three.scene.getObjectByName("RightArm") ?? three.scene.getObjectByName("RightUpperArm")
      )?.quaternion.toArray(),
      step: useObby.getState().step,
      checkpoint: useObby.getState().checkpoint,
      respawns: useObby.getState().respawns,
    };
    qa.obbyQA.sample = sample;
    qa.obbyQA.frames++;
    qa.obbyQA.samples.push(sample);
    if (qa.obbyQA.samples.length > 1800) qa.obbyQA.samples.shift();
    qa.obbyQA.ready = qa.obbyQA.frames > 45;
    if (qa.obbyQA.beachOverview) {
      three.camera.position.set(-23, 22, -14);
      three.camera.lookAt(-45, 0, -42);
    }
    if (qa.obbyQA.overview) {
      three.camera.position.set(9, 29, 14);
      three.camera.lookAt(40, 16, -23);
    }
  });
  return null;
}

function Fixture() {
  const viewport = useWorldViewport();
  return (
    <main
      ref={viewport}
      className="world-viewport game-ui"
      data-game-ui-root
      style={{ height: "100dvh" }}
    >
      <Canvas camera={{ position: [30, 8, -7], fov: 55 }} dpr={1}>
        <color attach="background" args={["#a4dfee"]} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[25, 35, 6]} intensity={2.2} />
        <Suspense fallback={null}>
          <Physics gravity={[0, WORLD_GRAVITY, 0]} timeStep={LOW_QUALITY ? 1 / 40 : 1 / 60}>
            {showWorld ? (
              <>
                <OutdoorNeighborhood />
                <ConcertSet />
              </>
            ) : (
              <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[100, 0.2, 100]} position={[0, -0.24, 0]} />
                <mesh position={[0, -0.23, 0]}>
                  <boxGeometry args={[200, 0.4, 200]} />
                  <meshStandardMaterial color="#a8c99c" />
                </mesh>
              </RigidBody>
            )}
            <PlazaObby />
            <FishingSpot />
            <SwimmingBeach />
            <QuestGuidance />
            <Player />
            {mobilityFixture && <RemotePlayers />}
            <Probe />
          </Physics>
        </Suspense>
        <ActionProjection />
      </Canvas>
      <GameplayHudLayer panels={<QuestCompleteOverlay />}>
        <Hud />
        <MobileControls />
      </GameplayHudLayer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
