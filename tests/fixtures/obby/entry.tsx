import { createSnapshot } from "../warung/data";
import { useGang } from "@/game/gang/store";
import { useNpcScript } from "@/game/npc/scripts";
import { WorldEntryMarkers } from "@/game/world/WorldEntryMarkers";
import { WarungScene } from "@/game/warung/WarungScene";
import { useWarung } from "@/game/warung/store";
import { warungOrigin } from "@/game/warung/model";
import { HalteJpo } from "@/game/world/HalteJpo";
import { clearanceAt } from "@/game/traffic/route-safety";
import { trafficActors, trafficVehicles } from "@/game/traffic/traffic-runtime";
import { currentContextAction } from "@/game/interactions/context-action";
import { useGameUi } from "@/state/game-ui-store";
import { startMissions, missionSessionId, missionInteraction, requestMission, handleMissionDrive, handleMissionCommand } from "@/game/missions/runtime";
import { remoteStates } from "@/net/useWorldChannel";
import { ActivityProps } from "@/game/world/props/ActivityProps";
import { NakamaOps } from "@/game/simulation/NakamaOps";
import { WarehouseReceiveDock } from "@/game/world/props/WarehouseReceiveDock";
import { SupplierTempPost } from "@/game/world/props/SupplierTempPost";
import { ClubScene } from "@/game/club/ClubScene";
import { ClubFacade } from "@/game/club/ClubFacade";
import { PrincipalBuilding } from "@/game/dungeon/DungeonScene";
import { Npcs } from "@/game/npc/Npc";
import { TRUCK_PARCELS, TRUCK_START, truckObjective } from "@/game/missions/truck-model";
import { truckPhysics, useTruckRoom } from "@/game/missions/truck-state";
import { useMissions } from "@/game/missions/store";
import { TokoCung } from "@/game/world/TokoCung";
import { AuthoredNpcs } from "@/game/editor/AuthoredNpcs";
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
import { GangScene } from "@/game/gang/GangScene";
import { startGangFixture } from "./gang";
import { resumeAudioContext } from "@/game/audio/audio-context";
import { preloadWaterSounds } from "@/game/audio/sound-palette";

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
  cashierOverview?: boolean;
  deliveryOverview?: boolean;
  beachOverview?: boolean;
  gangOverview?: boolean;
  bridgeOverview?: { eye: [number, number, number]; target: [number, number, number] };
}
const qa = window as Window & Record<string, unknown> & { obbyQA: ObbyProbe };
const vehicleFixture = new URLSearchParams(location.search).has("vehicles");
const truckFixture = new URLSearchParams(location.search).has("truck");
const showWorld = new URLSearchParams(location.search).has("world");
const showWarung = new URLSearchParams(location.search).has("warung-delivery");
const gangLife = new URLSearchParams(location.search).has("gang-life");
const showGang = new URLSearchParams(location.search).has("gang");
if (showGang) startGangFixture();
qa.startGangFixture = startGangFixture;
qa.gang = useGang;
qa.npcScript = useNpcScript;
qa.warung = useWarung;
qa.deliveryTraffic = () => [...trafficVehicles].filter(([id]) => id.startsWith("kulakan:"));
qa.setDeliveryEta = (eta: number) => {
  const d = useGang.getState().data;
  if(d) useGang.setState({data:{...d,houses:d.houses.map(h=>h.warung?.id===37?{...h,warung:{...h.warung,truckEta:eta}}:h)}});
  const w=useWarung.getState().inside;
  if(w) useWarung.setState({inside:{...w,truckEta:eta}});
};
qa.startGangLifeFixture = () => {
  startGangFixture();
  const d = useGang.getState().data!;
  d.houses[0] = {...d.houses[0]!, ownerId:"qa",ownerName:"Sari",mine:true,warung:{id:37,name:"Warung Sari",level:2,levelName:"Warung Sembako",lot:null,open:true,truckEta:Date.now()+15000}};
  d.houses[1] = {...d.houses[1]!,ownerId:"neighbor",warung:{id:38,name:"Toko Pindah",level:3,levelName:"Toko",lot:2,open:true}};
  d.ambient.residents = [{id:"sayur",avatar:"npc-courier",scale:1,from:[-6,6],to:[-6,40],speed:1,pause:2,offset:0,yaw:0,activity:"Idle",walk:"Walk",basket:true}];
  useGang.setState({data:{...d}});
  useGame.setState({pendingTeleport:[5994,.83,3012]});
};
qa.startWarungDeliveryFixture = () => {
  const data = createSnapshot("waiting");
  data.warung!.id = 37;
  data.warung!.truckEta = Date.now()+15000;
  useWarung.setState({data,inside:{...data.warung!,ownerName:"Sari"},serviceView:true});
};
qa.waterAudio = { unlock: resumeAudioContext, preload: preloadWaterSounds };
useNet.setState({ name: "Obby Explorer", connected: true });
useChannels.setState({ lease: { channel: "CHANNEL-01", connectionId }, playing: true });
useGame.setState({ overlay: "none", pendingTeleport: gangLife ? [5994,.83,3012] : showWarung ? [warungOrigin(37)[0],.83,warungOrigin(37)[2]-2.6] : [30.3, 0.83, -17.5] });
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

if (truckFixture) {
  useNet.setState({roster: [{id: connectionId, name: "Delivery Tester", avatar: avatarFromSeed("driver"), missionSession: missionSessionId(), joinedAt: 1, available: true}]});
  qa.remoteTruck = {
    join: () => useNet.setState({roster: [...useNet.getState().roster, {id: "remote-driver", name: "Remote Driver", missionSession: "11111111-1111-4111-8111-111111111111", joinedAt: 2, available: true}]}),
    leave: () => useNet.setState({roster: useNet.getState().roster.filter(p => p.id !== "remote-driver")}),
    pose: (p: number[]) => remoteStates.set("remote-driver", {id: "remote-driver", name: "Remote Driver", x:p[0],y:.83,z:p[2],ry:0}),
    command: handleMissionCommand,
    objective: () => { const m = useTruckRoom.getState().mission; return m ? truckObjective(m) : null; },
  };
  qa.truck = {parcels: TRUCK_PARCELS, startPose: TRUCK_START, context: currentContextAction, ui: () => useGameUi.getState(), controls: () => useControls.getState(), start: () => startMissions("delivery-qa"), state: () => useMissions.getState(), room: () => useTruckRoom.getState(), action: missionInteraction, request: requestMission, blocked: (t) => truckPhysics.blocked(t), drive: handleMissionDrive};
  useGame.setState({pendingTeleport: [TRUCK_PARCELS[0], .83, TRUCK_PARCELS[2]]});
}
function Probe() {
  const { world, rapier } = useRapier();
  const three = useThree();
  qa.rapierWorld = world;
  qa.rapier = rapier;
  qa.spotBlocked = (x, z, staticOnly = false, y = .88) => !!world.intersectionWithShape({x, y, z}, {x:0,y:0,z:0,w:1}, new rapier.Capsule(.42,.38), rapier.QueryFilterFlags.EXCLUDE_SENSORS | (staticOnly ? rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC : 0), interactionGroups(1,[0]));
  qa.three = three;
  qa.trafficPlayer = () => trafficActors.get("player");
  qa.trafficClearance = () => clearanceAt({x:2.5,z:20,dx:1,dz:0,speed:5}, [], [trafficActors.get("player")!.position()!]);
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
    if (qa.obbyQA.gangOverview) {
      three.camera.position.set(6020, 16, 3035);
      three.camera.lookAt(6039, -0.6, 3060);
    }
    if (qa.obbyQA.bridgeOverview) {
      three.camera.position.set(...qa.obbyQA.bridgeOverview.eye);
      three.camera.lookAt(...qa.obbyQA.bridgeOverview.target);
    }
    if (qa.obbyQA.deliveryOverview) {three.camera.position.set(25,14,25);three.camera.lookAt(12,0,10);}
    if (qa.obbyQA.cashierOverview) {three.camera.position.set(-1,4.2,2);three.camera.lookAt(6,1,-3.5);}
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
            {showWarung ? <WarungScene /> : showGang ? <><GangScene />{gangLife && <WorldEntryMarkers area="gang" />}</> : showWorld ? (
              <>
                <OutdoorNeighborhood />
                <HalteJpo />
                {(truckFixture || vehicleFixture) && <><TokoCung /><AuthoredNpcs /><Npcs /><ActivityProps /><NakamaOps /><WarehouseReceiveDock /><SupplierTempPost /><PrincipalBuilding /><ClubFacade /><ClubScene /></>}
                {!truckFixture && <ConcertSet />}
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
            {!showGang && !showWarung && <><PlazaObby /><FishingSpot /><SwimmingBeach /></>}
            <QuestGuidance />
            <Player />
            {(mobilityFixture || truckFixture) && <RemotePlayers />}
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
