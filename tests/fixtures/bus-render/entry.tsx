import { addTouchLook } from "@/game/player/touch-drive";
import { createRoot } from "react-dom/client";
import { Suspense, useEffect, useRef } from "react";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { BusCollider } from "@/game/world/BusCollider";
import { busCollision, BUS_TRAFFIC_ID } from "@/game/world/bus-collision";
import { trafficActors, trafficVehicles } from "@/game/traffic/traffic-runtime";
import { WarungThief } from "@/game/warung/WarungThief";
import { useWarung } from "@/game/warung/store";
import { PasarScene } from "@/game/pasar/PasarScene";
import { Halte } from "@/game/gang/Halte";
import { MARKET_HALTE } from "@/game/world/halte-jpo";
import { Canvas, useThree } from "@react-three/fiber";
import { useGame } from "@/state/game-store";
import { busBoarding, syncBusService } from "@/game/world/bus-service";
import { HalteJpo } from "@/game/world/HalteJpo";
import { RoadNetwork } from "@/game/world/RoadNetwork";
import { WorldEntryMarkers, type EntryArea } from "@/game/world/WorldEntryMarkers";
import { useWorldEditor } from "@/game/editor/store";
import { DEFAULT_CLUB_TARGETS } from "@/game/club/defaults";
import { useDungeon } from "@/game/dungeon/store";
import { BusModel } from "@/game/world/BusModel";
import { BusRide } from "@/game/world/BusRide";
import { BusRideCaption } from "@/ui/hud/BusRideCaption";
import { useGang } from "@/game/gang/store";
import { openBusMenu, closeBusMenu } from "@/game/world/halte-actions";
import "@/ui/game-ui/game-ui.css";
import "@/ui/hud/travel-loader.css";
import { startBusRide, skipBusRide, useBusRide, busPose } from "@/game/world/bus-ride";

const markerArea = new URLSearchParams(location.search).get("markers") as EntryArea | null;
const service = new URLSearchParams(location.search).has("service");
const compact = new URLSearchParams(location.search).has("compact");
const preview = new URLSearchParams(location.search).has("preview");
const market = new URLSearchParams(location.search).has("market");
const qa = ((window as any).busRenderQA = { arrived: false });
if (markerArea) {
  useGang.setState({
    data: {
      enabled: true,
      gang: 1,
      neighbors: { previous: null, next: 2 },
      layout: {
        origin: [6000, 0, 3000],
        gate: { x: -30, z: -60 },
        house_spacing: 24,
        house_offset: 20,
      },
      houses: [
        { number: 1, inactive: false, warung: { id: 1, lot: null, name: "Warung Gang QA" } },
        { number: 2, inactive: true, warung: { id: 2, lot: null, name: "Tutup QA" } },
        { number: 3, inactive: false, warung: { id: 3, lot: 2, name: "Pindah Kota QA" } },
      ],
    } as any,
  });
  useWarung.setState({ lots: [{ id: 1, lot: 0, name: "Warung Kota QA" }] as any });
  useWorldEditor.setState({
    targets: [
      ...DEFAULT_CLUB_TARGETS,
      { ...DEFAULT_CLUB_TARGETS[0]!, id: "closed", active: false },
    ],
  });
  useDungeon.setState({ data: { config: { entrance: [35, 0.83, 27] } } as any });
}
function Probe() {
  const get = useThree((s) => s.get);
  qa.snapshot = () => {
    const { gl, camera } = get();
    const markers: { name: string; visible: boolean; position: number[] }[] = [];
    get().scene.traverse((object) => {
      if (object.name.startsWith("EntryRing:"))
        markers.push({
          name: object.name,
          visible: object.visible,
          position: object.position.toArray(),
        });
    });
    return {
      markers,
      frames: gl.info.render.frame,
      camera: camera.position.toArray(),
      riding: useBusRide.getState().riding,
      boarding: busBoarding("kota"),
      ready: useBusRide.getState().ready,
      busVisible: get().scene.getObjectByName("BusRide")?.visible ?? false,
      arrived: qa.arrived,
      phase: useBusRide.getState().phase,
      speed: busPose.speed,
      door: busPose.door,
      stopElapsed: busPose.stopElapsed,
      departureIn: useBusRide.getState().departureIn,
      boarded: useBusRide.getState().boarded,
      position: [busPose.x, busPose.z],
      collisionReady: !!busCollision.blocked,
      busRegistered: trafficVehicles.has(BUS_TRAFFIC_ID),
      thief: useWarung.getState().thief,
      thiefRegistered: trafficActors.has("warung-thief-collision-test"),
      passengers:
        get()
          .scene.getObjectByName("BusStopPassengers")
          ?.children.filter((child) => child.visible)
          .map((child) => child.position.toArray()) ?? [],
    };
  };
  qa.look = addTouchLook;
  qa.player = (position: [number, number, number]) => useGame.setState({ playerPos: position });
  qa.serviceTime = async (now: number) => {
    (window as any).busServerTime = now;
    await syncBusService();
  };
  qa.walk = () => {
    useGame.setState({ playerPos: [-4.5, 0.83, 27.6] });
    const { camera } = get();
    camera.position.set(8, 8, 43);
    camera.lookAt(-4.5, 1.7, 24.6);
  };
  qa.view = (side: number) => {
    const { camera } = get();
    camera.position.set(side * 10.5, 4.8, 11);
    camera.lookAt(0, 1.6, 0);
  };
  qa.openMenu = (from: "kampung" | "kota") => {
    useGang.setState({
      data: { enabled: true, gang: 1, houses: [], layout: { origin: [6000, 0, 3000] } } as any,
    });
    openBusMenu(from);
  };
  qa.closeMenu = closeBusMenu;
  qa.skip = skipBusRide;
  qa.spawnThief = () => {
    useGang.setState({ inside: null });
    useWarung.setState({
      inside: null,
      thief: {
        id: "collision-test",
        name: "Test",
        x: -8,
        z: 16,
        targetX: 8,
        targetZ: 16,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 35000,
        gang: false,
      },
    });
  };
  qa.clearThief = () => useWarung.setState({ thief: null });
  qa.start = (boarding = false) => {
    qa.arrived = false;
    const random = Math.random;
    if (boarding) Math.random = () => 0.6;
    void startBusRide({
      title: "Render regression",
      ...(boarding
        ? {
            from: {
              id: "kota" as const,
              name: "Halte Toko Cung",
              pose: { x: 0, z: 0 },
              board: [3.3, 0.83, 3.4] as [number, number, number],
              yaw: 0,
            },
          }
        : {}),
      legs: [
        {
          compact,
          path: [
            { x: 0, z: 0 },
            { x: 0, z: 20 },
          ],
        },
      ],
      arrive: async () => {
        qa.arrived = true;
        return true;
      },
    });
    Math.random = random;
  };
  return null;
}

function CollisionProbe() {
  const body = useRef<RapierRigidBody>(null);
  const { world, rapier } = useRapier();
  useEffect(() => {
    body.current?.setEnabled(false);
    qa.obstacle = (enabled: boolean, z = 16) => {
      body.current?.setTranslation({ x: 0, y: 0, z }, true);
      body.current?.setNextKinematicTranslation({ x: 0, y: 0, z });
      body.current?.setEnabled(enabled);
    };
  }, []);
  qa.castCarAtBus = () =>
    world.castShape(
      { x: busPose.x, y: 1, z: busPose.z + 15 },
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: 0, z: -1 },
      new rapier.Cuboid(0.9, 0.8, 2.1),
      0.05,
      20,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      body.current ?? undefined,
    )?.time_of_impact ?? null;
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 0, 16]}>
      <CuboidCollider args={[0.9, 0.8, 2.1]} position={[0, 1, 0]} />
    </RigidBody>
  );
}

createRoot(document.getElementById("root")!).render(
  <div className="game-ui" data-game-ui-root style={{ width: "100vw", height: "100vh" }}>
    <Canvas
      shadows={preview}
      camera={{
        position: market ? [122, 16, 43] : preview ? [-10.5, 4.8, 11] : [0, 4, 12],
        fov: 42,
      }}
      onCreated={({ camera }) => camera.lookAt(market ? 113 : 0, 1.6, market ? 8 : 0)}
    >
      <color attach="background" args={[preview ? "#d7e2eb" : "#33455e"]} />
      <ambientLight intensity={1.3} />
      <directionalLight
        position={[-6, 10, 8]}
        intensity={2.2}
        castShadow={preview}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-normalBias={0.03}
      />
      <mesh position={[market ? 112 : 0, 0, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={preview ? "#82909b" : "#67a866"} />
      </mesh>
      <Probe />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          {market && (
            <>
              <PasarScene />
              <Halte
                position={[MARKET_HALTE.x, 0, MARKET_HALTE.z]}
                label="HALTE PASAR · Bus Rp3.500"
              />
            </>
          )}
          {service && (
            <>
              <RoadNetwork />
              <HalteJpo />
            </>
          )}
          {(markerArea || service) && <WorldEntryMarkers area={markerArea ?? "city"} />}
          <BusCollider />
          <CollisionProbe />
          <WarungThief />
        </Physics>
      </Suspense>
      {preview ? <BusModel compact={compact} /> : <BusRide service={service ? "city" : null} />}
    </Canvas>
    <BusRideCaption />
  </div>,
);
