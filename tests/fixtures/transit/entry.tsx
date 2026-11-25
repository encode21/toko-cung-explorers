import { createRoot } from "react-dom/client";
import { Suspense, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { TokoCung } from "@/game/world/TokoCung";
import { HalteJpo } from "@/game/world/HalteJpo";
import { GangScene, GangGate } from "@/game/gang/GangScene";
import { DeliveryTruck } from "@/game/warung/KulakanDeliveryScene";
import { deliveryRoute, deliveryJourney } from "@/game/warung/delivery-route";
import { cityBusLegs, BUS_STOPS } from "@/game/world/bus-routes";
import { smoothRoadPath } from "@/game/world/road-path";
import { pathLength, sampleRide } from "@/game/world/bus-motion";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { useGame } from "@/state/game-store";
import { useGang } from "@/game/gang/store";
import { useWarung } from "@/game/warung/store";
import { WarungScene } from "@/game/warung/WarungScene";
import { warungOrigin } from "@/game/warung/model";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { startGangFixture } from "../obby/gang";
import { createSnapshot } from "../warung/data";
import { BusRide } from "@/game/world/BusRide";
import { BusCollider } from "@/game/world/BusCollider";
import { busPose, useBusRide, startBusRide } from "@/game/world/bus-ride";
import { TrafficSystem } from "@/game/traffic/TrafficSystem";
import { useNet } from "@/net/net-store";
import { playerId } from "@/net/useWorldChannel";
const busTest = new URLSearchParams(location.search).has("bus");
const area = (new URLSearchParams(location.search).get("area") ?? "city") as
  "city" | "gang" | "interior";
const qa = ((window as any).transitQA = { ready: false, frames: 0 });
if (busTest)
  useNet.setState({
    connected: true,
    roster: [{ id: playerId, name: "QA", available: true, busScene: "city" }],
  });
startGangFixture();
const layout = useGang.getState().data!.layout;
useGang.setState({ inside: area === "gang" ? 1 : null });
useGame.setState({
  overlay: "none",
  playerPos: area === "city" ? [8, 0.83, -26] : [6000, 0.83, 3010],
});
const wallNow = Date.now.bind(Date);
let time = wallNow();
Date.now = () => time;
const base = time;
const trip = {
  id: 900,
  warungId: 37,
  gang: 1,
  house: 1,
  departAt: base,
  etaAt: base + 150000,
  returnAt: base + 285000,
};
const route = deliveryRoute(1);
function Probe() {
  const three = useThree(),
    { world, rapier } = useRapier();
  useFrame(() => {
    qa.frames++;
    qa.ready = true;
  });
  qa.checkRoutes = (bus = false) => {
    const shape = bus
      ? new rapier.Cuboid(1.4, 1.4, 5.65)
      : new rapier.Cuboid(...VEHICLE_DEFINITIONS.truck.collision.half);
    const paths = bus
      ? [
          [
            { x: -28.4, z: -200 },
            { x: -28.4, z: -47 },
          ],
          smoothRoadPath([{ x: -28.4, z: -47 }, { x: -28.4, z: 17.2 }, BUS_STOPS.pasar.pose], 6),
          ...cityBusLegs("pasar", "kota").map((l) => l.path),
          ...cityBusLegs("kota", "keliling").map((l) => l.path),
        ]
      : area === "gang"
        ? [route.gangOut, route.gangBack]
        : [route.cityOut, route.cityBack];
    const blocked = [];
    for (let k = 0; k < paths.length; k++)
      for (let d = 0; d <= pathLength(paths[k]); d += 0.5) {
        const p = sampleRide(paths[k], d);
        const x = p.x + (area === "gang" ? 6000 : 0),
          z = p.z + (area === "gang" ? 3000 : 0);
        const c = world.intersectionWithShape(
          { x, y: bus ? 1.85 : VEHICLE_DEFINITIONS.truck.collision.centerY, z },
          { x: 0, y: Math.sin(p.yaw / 2), z: 0, w: Math.cos(p.yaw / 2) },
          shape,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          undefined,
          undefined,
          (c) => !!c.parent()?.isFixed(),
        );
        if (c) blocked.push({ leg: k, d, x, z, collider: c.translation() });
      }
    return blocked;
  };
  qa.snapshot = () => {
    const root = three.scene.getObjectByName(`DeliveryTrip:${trip.id}`);
    const truck = root?.getObjectByName("DeliveryVehicle");
    return {
      bus: { ...busPose, ...useBusRide.getState() },
      visible: root?.visible,
      position: truck?.getWorldPosition(truck.position.clone()).toArray(),
      porter: root?.getObjectByName("DeliveryPorter")?.visible,
      traffic: [...trafficVehicles].filter(([id]) => id.startsWith("kulakan-trip")),
    };
  };
  qa.startBus = () => {
    void startBusRide({
      title: "Keliling kota",
      from: BUS_STOPS.kota,
      legs: cityBusLegs("kota", "keliling"),
      arrive: async () => true,
    });
  };
  qa.advance = async (frames: number) => {
    three.setFrameloop("never");
    const render = three.gl.render;
    three.gl.render = () => {};
    for (let i = 0; i < frames; i++) {
      time += 1000 / 60;
      three.advance(three.clock.elapsedTime + 1 / 60);
      if (i % 30 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    three.gl.render = render;
    three.advance(three.clock.elapsedTime + 1 / 60);
  };
  qa.view = (eye: number[], target: number[]) => {
    three.camera.position.set(...(eye as [number, number, number]));
    three.camera.lookAt(...(target as [number, number, number]));
  };
  return null;
}
function Scene() {
  const [revision, setRevision] = useState(0);
  qa.at = (seconds: number) => {
    time = base + seconds * 1000;
    setRevision((v) => v + 1);
  };
  if (area === "interior") {
    const data = createSnapshot("waiting");
    data.warung!.id = 37;
    data.warung!.deliveryTrips = [trip];
    useWarung.setState({ inside: { ...data.warung!, ownerName: "QA" }, data, serviceView: true });
  }
  return (
    <Canvas
      camera={{
        position:
          area === "gang"
            ? [6016, 12, 3025]
            : area === "interior"
              ? [warungOrigin(37)[0], 3.1, warungOrigin(37)[2] - 4.15]
              : [24, 12, -8],
        far: 700,
      }}
      onCreated={({ camera }) =>
        camera.lookAt(
          ...((area === "gang"
            ? [6000, 1, 3010]
            : area === "interior"
              ? [warungOrigin(37)[0], 0.7, warungOrigin(37)[2] + 1]
              : [8, 1, -26]) as [number, number, number]),
        )
      }
    >
      <color attach="background" args={["#c8d5dc"]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[40, 60, 20]} intensity={2} />
      <Suspense fallback={null}>
        <Physics>
          <Probe />
          {area === "city" ? (
            <>
              <OutdoorNeighborhood />
              <TokoCung />
              <HalteJpo />
              <GangGate />
              {busTest && (
                <>
                  <TrafficSystem />
                  <BusCollider />
                </>
              )}
            </>
          ) : area === "gang" ? (
            <GangScene />
          ) : (
            <WarungScene key={revision} />
          )}
          {area !== "interior" && !busTest && (
            <DeliveryTruck
              key={revision}
              card={{ id: 37, truckEta: trip.etaAt }}
              depth={15.4}
              journey={{ trip, area, layout }}
            />
          )}
        </Physics>
      </Suspense>
      {busTest && <BusRide service="city" />}
    </Canvas>
  );
}
createRoot(document.getElementById("root")!).render(
  <div style={{ height: "100vh" }}>
    <Scene />
  </div>,
);
