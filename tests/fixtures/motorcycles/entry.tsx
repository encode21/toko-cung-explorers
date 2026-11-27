/** @jsxImportSource @/game/jsx */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { MOTORCYCLES, motorThumbnail, type MotorcycleModel } from "@/game/vehicles/motorcycles";

const catalog = Object.fromEntries(
  Object.entries(MOTORCYCLES).filter(([, motor]) => motorThumbnail(motor.id)),
);
const qa = ((window as any).motorsQA = { catalog });
function Motor() {
  const [model, setModel] = useState<MotorcycleModel>("motorcycle");
  qa.model = setModel;
  qa.current = model;
  return <VehicleModel kind={model} color={MOTORCYCLES[model].color} emptyBed />;
}
createRoot(document.getElementById("root")!).render(
  <Canvas
    shadows
    dpr={2}
    camera={{ position: [3.2, 2.1, 3.9], fov: 32 }}
    onCreated={({ camera, gl, scene }) => {
      camera.lookAt(0, 0.75, 0);
      qa.ready = () =>
        scene.getObjectByName(`vehicle-${qa.current}`)?.visible && gl.info.render.calls > 5;
      qa.view = (rear: boolean) => {
        camera.position.set(3.2, 2.1, rear ? -3.9 : 3.9);
        camera.lookAt(0, 0.75, 0);
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
    <Motor />
  </Canvas>,
);
