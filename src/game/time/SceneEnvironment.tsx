/** @jsxImportSource @/game/jsx */
import { useGame } from "@/state/game-store";
import { isMountainPosition } from "@/game/mountain/model";
import { useMountainLocation } from "@/game/engine/location";
import { VehicleLightPool } from "@/game/traffic/VehicleLights";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AmbientLight, DirectionalLight, HemisphereLight, Fog, Color } from "three";
import { LOW_QUALITY, shadowMapSize } from "@/game/engine/quality";
import { selectBudgetLow, selectBudgetTier, useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { advanceSceneTime, useSceneTime } from "./scene-time";
import { sceneLighting as light, updateSceneLighting } from "./lighting";

const newSkyFill = new Color("#b3c5e5");

export function SceneEnvironment() {
  const inMountain = useMountainLocation();
  const nightFill = useRef<DirectionalLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const hemisphere = useRef<HemisphereLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const low = useRenderBudget(selectBudgetLow);
  const tier = useRenderBudget(selectBudgetTier);
  const mapSize = low ? 512 : shadowMapSize(tier);
  // Keep sun castShadow in sync with the same adaptive gate as Canvas `shadows`.
  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.castShadow = !low;
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.radius = 2;
    light.shadow.needsUpdate = true;
  }, [low, mapSize]);
  // Negative priority updates the single clock and shared lighting before fixture/sky callbacks.
  useFrame(({ scene, gl }) => {
    advanceSceneTime(performance.now());
    updateSceneLighting(useSceneTime.getState().minutes);
    if (!sun.current || !hemisphere.current || !ambient.current) return;
    const player = useGame.getState().playerPos;
    const mountain = isMountainPosition(player[0], player[2]);
    sun.current.target.position.set(
      mountain ? player[0] : 0,
      mountain ? player[1] - 0.83 : 0,
      mountain ? player[2] : 0,
    );
    sun.current.target.updateMatrixWorld();
    sun.current.position.copy(light.direction).multiplyScalar(65).add(sun.current.target.position);
    sun.current.color.copy(light.sun);
    sun.current.intensity = light.intensity * 0.94;
    hemisphere.current.color.copy(light.horizon).lerp(newSkyFill, light.street);
    hemisphere.current.intensity = light.hemisphere * (LOW_QUALITY || low ? 1.15 : 1);
    ambient.current.color.copy(hemisphere.current.color);
    // Gentle daytime fill; keep faces, paths and dark materials readable at night.
    hemisphere.current.intensity += light.street * 0.6;
    ambient.current.intensity = light.ambient + (1 - light.street) * 0.045 + light.street * 0.55;
    if (nightFill.current) nightFill.current.intensity = light.street * 0.75;
    if (scene.fog instanceof Fog) scene.fog.color.copy(light.horizon);
    if (scene.background instanceof Color) scene.background.copy(light.horizon);
    // A necessary buffer resize clears to transparent before the next frame. Keep the
    // canvas backing in sync with the sky so it cannot expose the white page underneath.
    gl.domElement.style.backgroundColor = light.horizon.getStyle();
    scene.environmentIntensity = 0.65 - light.street * 0.15;
    gl.toneMappingExposure = 1;
  }, -2);
  return (
    <group name="SceneTimeLighting">
      {!inMountain && <VehicleLightPool />}
      <directionalLight
        ref={nightFill}
        name="NightVisibilityFill"
        position={[18, 35, 22]}
        color="#c8dcff"
        intensity={0}
        castShadow={false}
      />
      <hemisphereLight ref={hemisphere} groundColor="#8b816c" />
      <ambientLight ref={ambient} />
      <directionalLight
        ref={sun}
        name="WorldSun"
        castShadow={!low}
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={1}
        shadow-camera-far={130}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={2}
      />
    </group>
  );
}
