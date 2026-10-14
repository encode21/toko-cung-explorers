/** @jsxImportSource @/game/jsx */
import { VehicleLightPool } from "@/game/traffic/VehicleLights";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AmbientLight, DirectionalLight, HemisphereLight, Fog, Color } from "three";
import { LOW_QUALITY } from "@/game/engine/quality";
import { advanceSceneTime, useSceneTime } from "./scene-time";
import { sceneLighting as light, updateSceneLighting } from "./lighting";

const newSkyFill = new Color("#b3c5e5");

export function SceneEnvironment() {
  const nightFill = useRef<DirectionalLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const hemisphere = useRef<HemisphereLight>(null);
  const ambient = useRef<AmbientLight>(null);
  // Negative priority updates the single clock and shared lighting before fixture/sky callbacks.
  useFrame(({ scene, gl }) => {
    advanceSceneTime(performance.now());
    updateSceneLighting(useSceneTime.getState().minutes);
    if (!sun.current || !hemisphere.current || !ambient.current) return;
    sun.current.position.copy(light.direction).multiplyScalar(65);
    sun.current.color.copy(light.sun);
    sun.current.intensity = light.intensity;
    hemisphere.current.color.copy(light.horizon).lerp(newSkyFill, light.street);
    hemisphere.current.intensity = light.hemisphere * (LOW_QUALITY ? 1.15 : 1);
    ambient.current.color.copy(hemisphere.current.color);
    // Preserve daytime values; keep faces, paths and dark materials readable at night.
    hemisphere.current.intensity += light.street * 0.6;
    ambient.current.intensity = light.ambient + light.street * 0.55;
    if (nightFill.current) nightFill.current.intensity = light.street * 0.75;
    if (scene.fog instanceof Fog) scene.fog.color.copy(light.horizon);
    if (scene.background instanceof Color) scene.background.copy(light.horizon);
    scene.environmentIntensity = 0.65 - light.street * 0.15;
    gl.toneMappingExposure = 1;
  }, -2);
  return (
    <group name="SceneTimeLighting">
      <VehicleLightPool />
      <directionalLight
        ref={nightFill}
        name="NightVisibilityFill"
        position={[18, 35, 22]}
        color="#c8dcff"
        intensity={0}
        castShadow={false}
      />
      <hemisphereLight ref={hemisphere} groundColor="#74736d" />
      <ambientLight ref={ambient} />
      <directionalLight
        ref={sun}
        name="WorldSun"
        castShadow={!LOW_QUALITY}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
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
