/** @jsxImportSource @/game/jsx */
import { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { Matrix4, Quaternion, Vector3 } from "three";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { blueprintGeometries } from "@/game/assets/blueprint-geometry";
import { CAR_BLUEPRINTS, type BlueprintModel } from "@/game/vehicles/blueprints";
import { mobilityNow } from "@/game/mobility/store";
import type { RideVehicle } from "@/game/vehicles/model";

const qa = ((window as any).carsQA = {});
const colors = {
  car: "#b4c4cf",
  sport: "#d9e4e8",
  sedan: "#40657d",
  pickup: "#c6cec9",
  "double-cabin": "#b75336",
  mpv: "#e1e6e5",
  angkot: "#318879",
  "city-car": "#e3e9e3",
};
function Car() {
  const [model, setModel] = useState<BlueprintModel>("car");
  const [seat, setSeat] = useState<number | null>(null);
  qa.model = (kind: BlueprintModel) => {
    setSeat(null);
    setModel(kind);
  };
  qa.door = setSeat;
  qa.current = model;
  const vehicle: RideVehicle = {
    id: "preview",
    model,
    color: colors[model],
    revision: 1,
    pose: { x: 0, y: 0, z: 0, yaw: 0, speed: 0 },
    occupants:
      seat === null
        ? []
        : [
            {
              seat: 0,
              connectionId: "driver",
              status: "active",
              transition: {
                phase: "seated",
                startedAt: 0,
                durationMs: 2000,
                from: [0, 0, 0],
                to: [0, 0, 0],
              },
            },
            {
              seat,
              connectionId: "passenger",
              status: "active",
              transition: {
                phase: "entering",
                startedAt: mobilityNow() - 300000,
                durationMs: 600000,
                from: [2, 0.93, 0],
                to: [2, 0.93, 0],
              },
            },
          ],
  };
  return <VehicleModel kind={model} color={colors[model]} emptyBed vehicle={vehicle} />;
}
createRoot(document.getElementById("root")!).render(
  <Canvas
    shadows
    dpr={2}
    camera={{ position: [6.7, 3.9, 7.8], fov: 34 }}
    onCreated={({ camera, gl, scene }) => {
      camera.lookAt(0, 0.95, 0);
      qa.renderer = gl;
      qa.ready = () =>
        scene.getObjectByName(`vehicle-${qa.current}`)?.visible && gl.info.render.calls > 10;
      qa.view = (rear: boolean) => {
        camera.position.set(6.7, 3.9, rear ? -7.8 : 7.8);
        camera.lookAt(0, 0.95, 0);
      };
      qa.doorAngle = () => {
        let angle = 0;
        scene.traverse((mesh: any) => {
          if (
            !mesh.isInstancedMesh ||
            mesh.geometry !== blueprintGeometries[`${qa.current as BlueprintModel}-door0`]
          )
            return;
          const m = new Matrix4(),
            q = new Quaternion();
          mesh.getMatrixAt(0, m);
          m.decompose(new Vector3(), q, new Vector3());
          angle = q.angleTo(new Quaternion());
        });
        return angle;
      };
    }}
  >
    <color attach="background" args={["#e8edf0"]} />
    <hemisphereLight args={["#eff7ff", "#9c9d97", 2]} />
    <directionalLight
      position={[4, 8, 6]}
      intensity={3}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-normalBias={0.02}
    />
    <directionalLight position={[-5, 3, -4]} intensity={1.2} color="#b6d6ea" />
    <mesh rotation-x={-Math.PI / 2} position-y={-0.015} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#e8edf0" roughness={0.9} />
    </mesh>
    <Suspense fallback={null}>
      <Car />
    </Suspense>
  </Canvas>,
);
qa.names = Object.fromEntries(Object.entries(CAR_BLUEPRINTS).map(([id, b]) => [id, b.name]));
