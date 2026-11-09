/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { reducedMotion } from "@/game/vehicles/visual";

const ROCKS: OutdoorPart[] = [8, 14, 20, 25].flatMap((y, i) => [
  {
    p: [355, y, 8.4],
    s: [11 - i * 0.7, 8, 6],
    color: i === 3 ? "#77907a" : "#7b8981",
    ry: i * 0.4,
  },
  { p: [350.5, y, 9], s: [5.8, 7, 5], color: "#89958a", ry: i * 0.6 },
  { p: [359.5, y, 9], s: [6.1, 7.5, 5.8], color: "#6f8278", ry: -i * 0.5 },
]);
const FOAM: OutdoorPart[] = Array.from({ length: 7 }, (_, i) => ({
  p: [352.3 + i * 0.9, 7.9, 14.4 + (i % 2) * 0.7],
  s: [1.6, 0.7, 1.4],
  color: "#dcf8ed",
}));

/** A small procedural curtain and foam pool; no fluid simulation or screen-space effects. */
export function MountainWaterfall() {
  const uniforms = useRef({ time: { value: 0 } });
  useFrame(({ clock }) => {
    uniforms.current.time.value = reducedMotion() ? 0 : clock.elapsedTime;
  });
  return (
    <group name="MountainWaterfall">
      <OutdoorBatch items={ROCKS} shape="foliage" />
      <OutdoorBatch items={FOAM} shape="foliage" shadows={false} />
      <mesh position={[355, 17.4, 13.9]}>
        <planeGeometry args={[6.5, 19.6]} />
        <shaderMaterial
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={`varying vec2 uvWater; void main(){uvWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`varying vec2 uvWater; uniform float time; void main(){
          float streak=pow(0.5+0.5*sin(uvWater.x*48.0+sin(uvWater.y*8.0+time)),4.0);
          float rush=pow(0.5+0.5*sin(uvWater.y*42.0+time*9.0+uvWater.x*8.0),12.0);
          float rim=0.04+0.025*sin(uvWater.y*16.0+time*2.0);
          float edge=smoothstep(rim,rim+0.04,uvWater.x)*smoothstep(rim,rim+0.04,1.0-uvWater.x);
          gl_FragColor=vec4(mix(vec3(0.38,0.78,0.82),vec3(0.9,0.99,0.98),0.2+streak*0.35+rush*0.28),edge*0.93);
        }`}
        />
      </mesh>
      <mesh position={[355, 7.65, 18]} rotation-x={-Math.PI / 2} scale={[1, 1.7, 1]}>
        <circleGeometry args={[7.5, 32]} />
        <meshStandardMaterial color="#45aeb6" roughness={0.45} />
      </mesh>
      <mesh position={[355, 7.72, 14.8]} rotation-x={-Math.PI / 2} scale={[1, 0.45, 1]}>
        <ringGeometry args={[2.4, 3.6, 32]} />
        <meshBasicMaterial color="#dcf8ed" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}
