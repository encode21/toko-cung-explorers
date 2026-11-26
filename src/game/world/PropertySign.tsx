/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, MathUtils, Vector3, type Group, type ShaderMaterial } from "three";
import { useGame } from "@/state/game-store";
import { Plang } from "./Plang";

type Position = [number, number, number];

export function PropertySign({
  ownerName,
  kind,
  position,
  rotationY = 0,
}: {
  ownerName: string;
  kind: "rumah" | "warung";
  position: Position;
  rotationY?: number;
}) {
  return (
    <group name="PropertySign" position={position} rotation-y={rotationY}>
      <mesh position={[-1.02, 0.07, 0]} castShadow>
        <boxGeometry args={[0.34, 0.14, 0.34]} />
        <meshStandardMaterial color="#544034" roughness={0.84} />
      </mesh>
      <mesh position={[-1.02, 1, 0]} castShadow>
        <boxGeometry args={[0.18, 1.78, 0.18]} />
        <meshStandardMaterial color="#e5cba1" roughness={0.78} />
      </mesh>
      <mesh position={[-1.02, 1.93, 0]}>
        <cylinderGeometry args={[0.096, 0.15, 0.12, 4]} />
        <meshStandardMaterial color="#865939" roughness={0.63} />
      </mesh>
      <mesh position={[-0.06, 1.79, 0]} castShadow>
        <boxGeometry args={[2.02, 0.09, 0.105]} />
        <meshStandardMaterial color="#624332" roughness={0.73} />
      </mesh>
      <Plang
        text={ownerName.replace(/\s+/g, " ").trim()}
        sub={kind === "warung" ? "Warung" : "Rumah"}
        position={[0, 1.13, 0]}
        mode="hanging"
        width={1.76}
        size={0.24}
        board="#503427"
        frameColor="#dbb782"
        textColor="#fff5df"
        subColor="#efca8a"
        twoSided
      />
    </group>
  );
}

const beaconVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vToCamera;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
    vNormal = normalMatrix * normal;
    vToCamera = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const beamFragment = /* glsl */ `
  uniform float strength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vToCamera;

  void main() {
    float facing = max(dot(normalize(vNormal), normalize(vToCamera)), 0.0);
    float edge = pow(facing, 1.8);
    float heightFade = 1.0 - smoothstep(0.74, 1.0, vUv.y);
    vec3 gold = mix(vec3(1.0, 0.67, 0.27), vec3(1.0, 0.96, 0.77), edge);
    gl_FragColor = vec4(gold, strength * edge * heightFade * 0.46);
    #include <colorspace_fragment>
  }
`;

const groundFragment = /* glsl */ `
  uniform float strength;
  varying vec2 vUv;

  void main() {
    float radius = length(vUv - 0.5) * 2.0;
    float glow = 1.0 - smoothstep(0.0, 1.0, radius);
    gl_FragColor = vec4(1.0, 0.73, 0.28, strength * glow * 0.48);
    #include <colorspace_fragment>
  }
`;

const BEAM_HEIGHT = 32;

/** A depth-tested light shaft so the owned lot is readable without adding scene lights. */
export function PropertyBeacon({ position }: { position: Position }) {
  const group = useRef<Group>(null);
  const beam = useRef<ShaderMaterial>(null);
  const glow = useRef<ShaderMaterial>(null);
  const origin = useMemo(() => new Vector3(), []);
  const uniforms = useMemo(() => ({ strength: { value: 0 } }), []);

  useFrame(() => {
    const beacon = group.current;
    if (!beacon) return;
    beacon.getWorldPosition(origin);
    const [x, , z] = useGame.getState().playerPos;
    const distance = Math.hypot(x - origin.x, z - origin.z);
    const strength = MathUtils.smoothstep(distance, 14, 22);
    beacon.visible = strength > 0;
    if (beam.current) beam.current.uniforms["strength"]!.value = strength;
    if (glow.current) glow.current.uniforms["strength"]!.value = strength;
  });

  return (
    <group ref={group} name="PropertyBeacon" position={position} visible={false}>
      <mesh position={[0, BEAM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[2.2, 1.4, BEAM_HEIGHT, 24, 1, true]} />
        <shaderMaterial
          ref={beam}
          vertexShader={beaconVertex}
          fragmentShader={beamFragment}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.8, 3.8]} />
        <shaderMaterial
          ref={glow}
          vertexShader={beaconVertex}
          fragmentShader={groundFragment}
          uniforms={uniforms}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
