/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, type Mesh } from "three";
import { sceneLighting } from "@/game/time/lighting";
import { reducedMotion } from "@/game/vehicles/visual";
import { ROAD_STYLE } from "@/game/world/road-surfaces";
import { FLOOD_VISIBLE_AT, floodWaterY, mountFloodZone } from "./flood-surface";
import { FloodRainImpacts } from "./FloodRainImpacts";
import { currentWeather } from "./store";

const vertexShader = `
  varying vec2 floodPoint;
  varying vec3 floodView;
  #include <fog_pars_vertex>
  void main() {
    floodPoint = vec2(position.x, -position.y);
    vec4 world = modelMatrix * vec4(position, 1.0);
    floodView = cameraPosition - world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = `
  varying vec2 floodPoint;
  varying vec3 floodView;
  uniform vec2 halfSize;
  uniform float flood;
  uniform float time;
  uniform float light;
  uniform float mudLayer;
  uniform vec3 waterColor;
  uniform vec3 skyColor;
  uniform vec3 waveColor;
  uniform vec3 clayColor;
  #include <fog_pars_fragment>

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    vec2 p = floodPoint;
    float edgeDistance = min(halfSize.x - abs(p.x), halfSize.y - abs(p.y));
    float coverage = smoothstep(0.0, 1.7, edgeDistance + noise(p * .65) * .65 - .35);
    float clay = .72 * noise(vec2(p.x * .95, p.y * .33)) +
                 .28 * noise(vec2(p.x * 2.2, p.y * 1.1));
    float inRoad = 1.0 - smoothstep(2.9, 3.2, abs(p.x));
    float shoulder = smoothstep(.6, 2.7, abs(p.x));
    float patches = smoothstep(.44, .68, clay + .13 * shoulder) * inRoad;

    if (mudLayer > .5) {
      float grain = noise(p * 9.0);
      float detail = 1.0 - smoothstep(.08, .3, length(fwidth(p)));
      vec3 mud = clayColor * light * (.88 + .24 * clay + (grain - .5) * detail * .18);
      gl_FragColor = vec4(mud, coverage * patches * smoothstep(.02, .28, flood) * .94);
    } else {
      float grazing = 1.0 - abs(normalize(floodView).y);
      vec3 color = mix(waterColor, skyColor, .22 + .62 * grazing);
      color = mix(color, clayColor * 1.55, patches * .34);
      float drift = noise(p * vec2(.48, .25));
      float a = sin(p.y * 3.9 + p.x * 1.45 - time * 2.0 + drift * 4.0);
      float b = sin(p.y * 2.9 - p.x * 2.3 + time * 1.55 - drift * 2.6);
      float crest = smoothstep(.68, .96, a * .72 + b * .28) * smoothstep(.18, .65, drift);
      float detail = 1.0 - smoothstep(.15, .65, length(fwidth(p)));
      color = mix(color, waveColor, crest * detail * (.21 + .27 * grazing));
      float alpha = coverage * smoothstep(.02, .26, flood) * (.59 + .23 * flood) * (1.0 - .23 * patches);
      gl_FragColor = vec4(color * light, alpha);
    }
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Two transparent layers: wet clay on the road and moving water above the terrain. */
export function Flood({
  origin,
  width,
  from,
  to,
}: {
  origin: [number, number, number];
  width: number;
  from: number;
  to: number;
}) {
  const water = useRef<Mesh>(null);
  const mud = useRef<Mesh>(null);
  const length = to - from;
  const middle = (from + to) / 2;
  const layers = useMemo(() => {
    const common = {
      halfSize: { value: new Vector2(width / 2, length / 2) },
      flood: { value: 0 },
      time: { value: 0 },
      light: { value: 1 },
      waterColor: { value: new Color("#978468") },
      skyColor: { value: new Color("#748f9f") },
      waveColor: { value: new Color("#c1d8dc") },
      clayColor: { value: new Color("#604332") },
    };
    const makeLayer = (mudLayer: number) =>
      new ShaderMaterial({
        uniforms: {
          ...UniformsUtils.clone(UniformsLib.fog),
          ...common,
          mudLayer: { value: mudLayer },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        fog: true,
      });
    return { common, water: makeLayer(0), mud: makeLayer(1) };
  }, [width, length]);

  useEffect(
    () => () => {
      layers.water.dispose();
      layers.mud.dispose();
    },
    [layers],
  );
  useEffect(() => mountFloodZone({ origin, width, from, to }), [origin, width, from, to]);
  useFrame(({ clock }) => {
    const { flood } = currentWeather();
    const visible = flood > FLOOD_VISIBLE_AT;
    if (water.current) {
      water.current.visible = visible;
      if (visible) water.current.position.y = floodWaterY(flood);
    }
    if (mud.current) mud.current.visible = visible;
    if (!visible) return;
    layers.common.flood.value = flood;
    layers.common.time.value = reducedMotion() ? 0 : clock.elapsedTime;
    layers.common.light.value = 0.45 + 0.55 * sceneLighting.hemisphere;
  });

  return (
    <>
      <mesh
        ref={mud}
        name="KampungFloodMud"
        position={[0, ROAD_STYLE.asphaltY + 0.017, middle]}
        rotation-x={-Math.PI / 2}
        visible={false}
        raycast={() => {}}
      >
        <planeGeometry args={[ROAD_STYLE.width, length]} />
        <primitive object={layers.mud} attach="material" />
      </mesh>
      <mesh
        ref={water}
        name="KampungFloodSurface"
        position={[0, 0, middle]}
        rotation-x={-Math.PI / 2}
        visible={false}
        renderOrder={1}
        raycast={() => {}}
      >
        <planeGeometry args={[width, length]} />
        <primitive object={layers.water} attach="material" />
      </mesh>
      <FloodRainImpacts width={width} from={from} to={to} />
    </>
  );
}
