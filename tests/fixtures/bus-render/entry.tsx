import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { BusRide } from "@/game/world/BusRide";
import { startBusRide, useBusRide } from "@/game/world/bus-ride";

const qa = ((window as any).busRenderQA = { arrived: false });
function Probe() {
  const get = useThree((s) => s.get);
  qa.snapshot = () => {
    const { gl, camera } = get();
    return {
      frames: gl.info.render.frame,
      camera: camera.position.toArray(),
      riding: useBusRide.getState().riding,
      arrived: qa.arrived,
    };
  };
  qa.start = () => {
    qa.arrived = false;
    void startBusRide({
      title: "Render regression",
      path: [
        { x: 0, z: 0 },
        { x: 0, z: 20 },
      ],
      arrive: async () => {
        qa.arrived = true;
        return true;
      },
    });
  };
  return null;
}

createRoot(document.getElementById("root")!).render(
  <div style={{ width: "100vw", height: "100vh" }}>
    <Canvas camera={{ position: [0, 4, 12] }}>
      <color attach="background" args={["#33455e"]} />
      <ambientLight intensity={2} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#67a866" />
      </mesh>
      <Probe />
      <BusRide />
    </Canvas>
  </div>,
);
