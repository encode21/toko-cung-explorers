import React, { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { DEFAULT_EXPLORER } from "@/identity/explorer";
function Probe() {
  useFrame(({ gl, scene, camera }, dt) => {
    window.qaCamera = camera;
    window.qaFrames ??= [];
    window.qaFrames.push(dt * 1000);
    if (window.qaFrames.length > 300) window.qaFrames.shift();
    window.qaStats = {
      ...gl.info.render,
      geometries: gl.info.memory.geometries,
      programs: gl.info.programs.length,
    };
    window.qaScene = scene;
  });
  return null;
}
function App() {
  const [appearance, setAppearance] = useState(DEFAULT_EXPLORER),
    [angle, setAngle] = useState(0),
    [speed, setSpeed] = useState(0),
    [count, setCount] = useState(1),
    [pose, setPose] = useState(undefined),
    [variants, setVariants] = useState([]);
  Object.assign(window, {
    qa: { setAppearance, setAngle, setSpeed, setCount, setPose, setVariants },
  });
  return (
    <div style={{ height: "100dvh", background: "#dbe3e5" }}>
      <Canvas camera={{ position: [0, 1.1, 4.4], fov: 34 }} dpr={1}>
        <color attach="background" args={["#dbe3e5"]} />
        <hemisphereLight args={["#eef6ff", "#baa58d", 2]} />
        <directionalLight position={[3, 4, 4]} intensity={2} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} />
        <Suspense fallback={null}>
          {Array.from({ length: count }, (_, i) => (
            <group key={i} position={[(i - (count - 1) / 2) * 1.2, -0.85, 0]} rotation-y={angle}>
              <BaseAvatarV2
                playerAvatar
                avatar={{
                  ...DEFAULT_AVATAR,
                  explorer: variants[i] ?? (i === 0 ? appearance : DEFAULT_EXPLORER),
                }}
                speed={speed}
                animation={pose}
              />
            </group>
          ))}
        </Suspense>
        <Probe />
      </Canvas>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
