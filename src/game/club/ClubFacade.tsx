/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { sceneLighting } from "@/game/time/lighting";
import { reducedMotion } from "@/game/vehicles/visual";

const GOLD = "#c9a45c",
  BLACK = "#0d0e13",
  CHARCOAL = "#1b1d25",
  PINK = "#ff2d95",
  VIOLET = "#8a4dff",
  CYAN = "#22e1ff";
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  finish: Finish = "paint",
  shape: Shape = "bevel",
): AssetPart => ({ p, s, color, finish, shape });

// Local +Z is the street front; the club_entrance door sits at z 4.35 (world z 30.6).
const PARTS: AssetPart[] = [
  part([0, 4.75, 0], [8, 9.5, 7], BLACK),
  part([0, 9.6, 0], [8.3, 0.22, 7.3], CHARCOAL, "metal"),
  ...[-3.25, 3.25].map((x) => part([x, 2.3, 3.75], [1.5, 4.6, 0.5], CHARCOAL)),
  part([0, 0.12, 3.9], [8.6, 0.24, 1.2], "#08090c"),
  // Door vestibule and the frame of the LED wall above it.
  part([0, 1.9, 3.9], [4.6, 3.8, 0.8], CHARCOAL),
  part([0, 3.85, 4.2], [5, 0.2, 1.5], "#08090c", "metal"),
  part([0, 6.75, 3.6], [6.9, 3.9, 0.25], "#05060a", "metal"),
  // Light-tunnel portals stepping out toward the street.
  ...[0, 1, 2].flatMap((i) => {
    const z = 5.05 + i * 0.85,
      w = 2.05 + i * 0.22,
      h = 3.45 + i * 0.18;
    return [
      ...[-w, w].map((x) => part([x, h / 2, z], [0.22, h, 0.22], BLACK, "metal")),
      part([0, h, z], [w * 2 + 0.22, 0.22, 0.22], BLACK, "metal"),
    ];
  }),
  // Carpet, rope line and LED totems.
  part([0, 0.02, 6.9], [2.8, 0.04, 5], "#5a0f2c", "fabric", "box"),
  ...[-1.75, 1.75].flatMap((x) => [
    ...[6.6, 7.8, 9].map((z) => part([x, 0.45, z], [0.1, 0.9, 0.1], GOLD, "metal", "cylinder")),
    ...[6.6, 7.8, 9].map((z) => part([x, 0.93, z], [0.16, 0.08, 0.16], GOLD, "metal", "sphere")),
    part([x, 0.78, 7.8], [0.05, 0.05, 2.4], "#7a1426", "fabric", "box"),
  ]),
  ...[-3.4, 3.4].map((x) => part([x, 1.8, 4.9], [0.75, 3.6, 0.75], BLACK, "metal")),
];
// [position, size, colour]: thin emissive strips.
const NEON: [[number, number, number], [number, number, number], string][] = [
  ...[-3.92, 3.92].map((x) => [[x, 4.75, 3.56], [0.12, 9.3, 0.1], PINK] as (typeof NEON)[number]),
  [[0, 9.42, 3.56], [7.96, 0.1, 0.1], PINK],
  ...[-2.56, 2.56].map((x) => [[x, 2.3, 4.02], [0.07, 4.4, 0.06], CYAN] as (typeof NEON)[number]),
  ...[0, 1, 2].flatMap((i) => {
    const z = 5.05 + i * 0.85,
      w = 2.05 + i * 0.22,
      h = 3.45 + i * 0.18,
      color = [PINK, VIOLET, CYAN][i]!;
    return [
      ...[-w, w].map(
        (x) => [[x * 0.945, h / 2, z], [0.07, h - 0.1, 0.24], color] as (typeof NEON)[number],
      ),
      [[0, h - 0.13, z], [w * 2 - 0.2, 0.07, 0.24], color] as (typeof NEON)[number],
    ];
  }),
  ...[-3.4, 3.4].map((x) => [[x, 1.8, 5.29], [0.5, 3.2, 0.04], CYAN] as (typeof NEON)[number]),
];

const SCREEN_VERTEX = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
/** LED wall: drifting pink-violet-cyan wash, equaliser bars and a visible pixel grid. */
const SCREEN_FRAGMENT = `varying vec2 vUv; uniform float time;
  float hash(float n){return fract(sin(n)*43758.5453);}
  void main(){
    vec3 pink=vec3(1.0,0.18,0.58), violet=vec3(0.54,0.3,1.0), cyan=vec3(0.13,0.88,1.0);
    float wave=sin(vUv.x*5.0+time*0.9)+sin(vUv.y*4.0-time*0.6+vUv.x*2.0);
    vec3 wash=mix(mix(pink,violet,smoothstep(-1.5,0.3,wave)),cyan,smoothstep(0.2,1.9,wave));
    float column=floor(vUv.x*28.0);
    float level=0.06+0.2*(0.5+0.5*sin(time*(2.0+hash(column)*3.0)+column*1.7))*(0.6+0.4*hash(column+9.0));
    float bar=step(vUv.y,level)*step(0.15,fract(vUv.x*28.0));
    vec3 color=wash*(0.16+0.3*smoothstep(1.0,0.0,vUv.y))+mix(cyan,pink,vUv.y/0.4)*bar*0.9;
    vec2 cell=fract(vUv*vec2(110.0,58.0));
    color*=0.55+0.45*step(0.18,cell.x)*step(0.18,cell.y);
    gl_FragColor=vec4(color,1.0);
  }`;

/** Nightclub front on partner-3: black monolith, LED wall, neon light-tunnel and sky beams. */
export function ClubFacade() {
  const uniforms = useRef({ time: { value: 0 } });
  const beams = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const time = reducedMotion() ? 0 : clock.elapsedTime;
    uniforms.current.time.value = time;
    beams.current?.children.forEach((beam, i) => {
      const side = i ? 1 : -1;
      beam.rotation.set(
        Math.sin(time * 0.31 + i) * 0.22 + 0.1,
        0,
        side * (0.3 + Math.sin(time * 0.4 + i * 2) * 0.28),
      );
      // Searchlights only read against a dark sky.
      ((beam.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
        0.13 * sceneLighting.street;
    });
  });
  return (
    <group position={[22, 0, 35]} rotation-y={Math.PI} name="club-facade">
      <StyledBatch items={PARTS} />
      {NEON.map(([p, s, color], i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={s} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
        </mesh>
      ))}
      <mesh position={[0, 6.75, 3.74]} name="ClubLedWall">
        <planeGeometry args={[6.6, 3.6]} />
        <shaderMaterial
          uniforms={uniforms.current}
          vertexShader={SCREEN_VERTEX}
          fragmentShader={SCREEN_FRAGMENT}
        />
      </mesh>
      <mesh position={[0, 3.72, 4.2]}>
        <boxGeometry args={[4.2, 0.04, 1.2]} />
        <meshStandardMaterial color="#ffe2ad" emissive="#ffcf8a" emissiveIntensity={0.9} />
      </mesh>
      <Text
        position={[0, 7.5, 3.78]}
        fontSize={1.25}
        color="#ffffff"
        letterSpacing={0.12}
        outlineWidth={0.03}
        outlineColor={PINK}
      >
        CUNG
      </Text>
      <Text position={[0, 6.55, 3.78]} fontSize={0.5} color="#ffffff" letterSpacing={0.32}>
        UNDERGROUND
      </Text>
      <Text position={[0, 6.05, 3.78]} fontSize={0.2} color="#f3e6c8" letterSpacing={0.4}>
        CLUB · LOUNGE
      </Text>
      <group ref={beams}>
        {[-2.8, 2.8].map((x, i) => (
          <group key={x} position={[x, 9.7, 1.5]}>
            <mesh position={[0, 15, 0]}>
              <cylinderGeometry args={[2.4, 0.18, 30, 16, 1, true]} />
              <meshBasicMaterial
                color={i ? CYAN : VIOLET}
                transparent
                opacity={0}
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        ))}
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4, 4.75, 3.5]} position={[0, 4.75, 0]} />
        {[-3.4, 3.4].map((x) => (
          <CuboidCollider key={x} args={[0.38, 1.8, 0.38]} position={[x, 1.8, 4.9]} />
        ))}
      </RigidBody>
    </group>
  );
}
