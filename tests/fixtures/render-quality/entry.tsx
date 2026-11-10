import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveQuality, selectBudgetTier, useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { LOW_QUALITY, renderDpr } from "@/game/engine/quality";
import { useGameSettings, type GraphicsQuality } from "@/state/game-settings";

type RenderQualityQA = {
  ready: boolean;
  rerender: () => void;
  setEditor: (value: boolean) => void;
  setGraphics: (value: GraphicsQuality) => void;
  cameraPosition: (value: [number, number, number]) => void;
  snapshot: () => {
    dpr: number;
    pixels: [number, number];
    size: [number, number];
    resizeCalls: number;
    cameraId: string;
    camera: number[];
    far: number;
    tier: string;
    lowDevice: boolean;
  };
};
declare global {
  interface Window {
    renderQualityQA: RenderQualityQA;
  }
}
let resizeCalls = 0;
function Probe() {
  const get = useThree((state) => state.get);
  useEffect(() => {
    window.renderQualityQA.snapshot = () => {
      const state = get();
      return {
        dpr: state.viewport.dpr,
        pixels: [state.gl.domElement.width, state.gl.domElement.height],
        size: [state.size.width, state.size.height],
        resizeCalls,
        cameraId: state.camera.uuid,
        camera: state.camera.position.toArray(),
        far: state.camera.far,
        tier: useRenderBudget.getState().tier,
        lowDevice: LOW_QUALITY,
      };
    };
    window.renderQualityQA.cameraPosition = (value) => {
      const camera = get().camera;
      camera.position.set(...value);
      camera.lookAt(0, 0, 0);
    };
    window.renderQualityQA.ready = true;
  }, [get]);
  return null;
}

function Fixture() {
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState(false);
  const tier = useRenderBudget(selectBudgetTier);
  useEffect(() => {
    Object.assign(window.renderQualityQA, {
      rerender: () => setRevision((value) => value + 1),
      setEditor,
      setGraphics: (graphics: GraphicsQuality) => useGameSettings.getState().update({ graphics }),
    });
  }, []);
  // These are the same inputs as GameCanvas: runtime follows the budget; editor keeps its cap.
  const low = editor ? LOW_QUALITY : tier === "LOW";
  return (
    <div style={{ width: "100vw", height: "100vh" }} data-revision={revision}>
      <Canvas
        dpr={editor ? (LOW_QUALITY ? 1 : [1, 1.5]) : renderDpr(tier)}
        camera={{ position: [0, 0, 5], fov: 58, near: 0.1, far: low ? 260 : 420 }}
        onCreated={({ gl }) => {
          const resize = gl.setSize.bind(gl);
          gl.setSize = (...args) => {
            resizeCalls++;
            return resize(...args);
          };
        }}
      >
        <color attach="background" args={["#182638"]} />
        <mesh>
          <boxGeometry />
          <meshBasicMaterial color="#67a866" />
        </mesh>
        <Probe />
        {!editor && <AdaptiveQuality />}
      </Canvas>
    </div>
  );
}

window.renderQualityQA = { ready: false } as RenderQualityQA;
createRoot(document.getElementById("root")!).render(<Fixture />);
