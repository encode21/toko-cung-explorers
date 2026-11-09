/** @jsxImportSource @/game/jsx */
import { Nature } from "./Nature";
import { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { VEHICLE_DEFINITIONS, type VehicleKind } from "@/game/vehicles/definitions";
import { rideSeatPose, rideAnimation, type RideVehicle } from "@/game/vehicles/model";
import { useMobility } from "@/game/mobility/store";
const nature = new URLSearchParams(location.search).has("nature");
const qa = ((window as any).qa = {});
function Gallery() {
  const [kind, setKind] = useState<VehicleKind>("car");
  qa.kind = setKind;
  const vehicles = [false, true].map((explorer): RideVehicle => ({
    id: String(explorer),
    model: kind as RideVehicle["model"],
    color: explorer ? "#d8ad65" : "#64a6a0",
    pose: { x: explorer ? 2.5 : -2.5, y: 0, z: 0, yaw: 0, speed: 0 },
    revision: 1,
    occupants: VEHICLE_DEFINITIONS[kind].seats.map((_, seat) => ({
      seat,
      status: "active",
      connectionId: explorer + "-" + seat,
    })),
  }));
  useMobility.setState({ vehicles });
  return (
    <>
      {vehicles.map((v) => (
        <group key={v.id}>
          <group position={[v.pose.x, 0, 0]}>
            <VehicleModel kind={kind} color={v.color} emptyBed vehicle={v} />
          </group>
          {v.occupants.map((s) => {
            const p = rideSeatPose(v, v.pose, s.connectionId);
            return (
              <group key={s.seat} position={[p.x, p.y - 0.83, p.z]}>
                <BaseAvatarV2
                  playerAvatar
                  {...(v.id === "false"
                    ? { modelUrl: "/assets/characters/base-avatar-v2.glb" }
                    : {})}
                  animation={rideAnimation(v, s.connectionId, Infinity)}
                  dancePlayerId={s.connectionId}
                />
              </group>
            );
          })}
        </group>
      ))}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <Canvas
    shadows
    dpr={1}
    camera={{ position: [8, 5, 10], fov: 44 }}
    onCreated={({ camera, gl, scene }) => {
      qa.scene = scene;
      qa.view = (side: string) => {
        const p =
          side === "side"
            ? [12, 2.7, 0]
            : side === "rear"
              ? [5, 3.8, -11]
              : side === "front"
                ? [0, 2.4, 13]
                : [8, 5, 10];
        camera.position.set(...(p as [number, number, number]));
        camera.lookAt(0, 1, 0);
      };
      qa.renderer = gl;
      qa.view("three-quarter");
      if (nature) {
        camera.position.set(61, 7, -31);
        camera.lookAt(44, 1, -43);
      }
    }}
  >
    <color attach="background" args={["#d8e5dc"]} />
    <ambientLight intensity={1.7} />
    <directionalLight
      position={[4, 9, 7]}
      intensity={2.5}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#d8d2bf" roughness={0.92} />
    </mesh>
    <Suspense fallback={null}>{nature ? <Nature /> : <Gallery />}</Suspense>
  </Canvas>,
);
