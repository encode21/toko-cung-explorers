/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AmbientLight, DirectionalLight, HemisphereLight, Fog, Color } from "three";
import { RENDER_LIMITS, useRenderBudget } from "@/game/engine/render-budget";
import { useEffect } from "react";
import { advanceSceneTime, useSceneTime } from "./scene-time";
import { sceneLighting as light, updateSceneLighting } from "./lighting";

const newSkyFill = new Color("#b3c5e5");

export function SceneEnvironment() {
  const tier = useRenderBudget((s) => s.tier);
  const shadowSize = RENDER_LIMITS[tier].shadow;
  const sun = useRef<DirectionalLight>(null);
  const hemisphere = useRef<HemisphereLight>(null);
  const ambient = useRef<AmbientLight>(null);
  useEffect(() => {
    if (!sun.current) return;
    sun.current.shadow.map?.dispose();
    sun.current.shadow.map = null;
    sun.current.shadow.mapSize.set(shadowSize || 1024, shadowSize || 1024);
    sun.current.shadow.needsUpdate = true;
  }, [shadowSize]);
  // Negative priority updates the single clock and shared lighting before fixture/sky callbacks.
  useFrame(({ scene, gl }) => {
    if (document.hidden) return;
    advanceSceneTime(performance.now());
    updateSceneLighting(useSceneTime.getState().minutes);
    if (!sun.current || !hemisphere.current || !ambient.current) return;
    sun.current.position.copy(light.direction).multiplyScalar(65);
    sun.current.color.copy(light.sun);
    sun.current.intensity = light.intensity;
    hemisphere.current.color.copy(light.horizon).lerp(newSkyFill, light.street);
    hemisphere.current.intensity = Math.max(0.8, light.hemisphere) * (tier === "LOW" ? 1.08 : 1);
    ambient.current.color.copy(hemisphere.current.color).lerp(newSkyFill, light.street * 0.6);
    // Readable night silhouettes without extra lights or a postprocessing pass.
    ambient.current.intensity = light.ambient + light.street * 0.18;
    if (scene.fog instanceof Fog) scene.fog.color.copy(light.horizon);
    if (scene.background instanceof Color) scene.background.copy(light.horizon);
    scene.environmentIntensity = 0.65 - light.street * 0.5;
    gl.toneMappingExposure = 1;
  }, -2);
  return (
    <group name="SceneTimeLighting">
      <hemisphereLight ref={hemisphere} groundColor="#74736d" />
      <ambientLight ref={ambient} />
      <directionalLight
        ref={sun}
        name="WorldSun"
        castShadow={shadowSize > 0}
        shadow-mapSize-width={shadowSize || 1024}
        shadow-mapSize-height={shadowSize || 1024}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={1}
        shadow-camera-far={130}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={3}
      />
    </group>
  );
}
