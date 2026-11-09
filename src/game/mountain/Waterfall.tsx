/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
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
  const curtain = useRef<THREE.ShaderMaterial>(null);
  const ripples = useRef<THREE.Group>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const drop = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const time = reducedMotion() ? 0 : clock.elapsedTime;
    if (curtain.current) curtain.current.uniforms["time"]!.value = time;
    if (drops.current) {
      for (let i = 0; i < 24; i++) {
        const phase = (time * (0.65 + (i % 5) * 0.04) + i * 0.618) % 1;
        drop.position.set(352.2 + (i % 8) * 0.8, 27.2 - phase * 19.6, 14.05 + (i % 3) * 0.1);
        drop.scale.set(0.035, 0.25 + phase * 0.4, 0.035);
        drop.updateMatrix();
        drops.current.setMatrixAt(i, drop.matrix);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
    ripples.current?.children.forEach((object, i) => {
      const phase = (time * 0.65 + i / 3) % 1;
      object.scale.setScalar(0.4 + phase * 1.1);
      ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.65;
    });
  });
  return (
    <group name="MountainWaterfall">
      <OutdoorBatch items={ROCKS} shape="foliage" />
      <OutdoorBatch items={FOAM} shape="foliage" shadows={false} />
      <mesh name="WaterfallCurtain" position={[355, 17.4, 13.9]}>
        <planeGeometry args={[6.5, 19.6]} />
        <shaderMaterial
          ref={curtain}
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={`varying vec2 uvWater; void main(){uvWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`varying vec2 uvWater; uniform float time;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){
            vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),
                       mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),f.x),f.y);
          }
          void main(){
          // Advect irregular foam downward at two speeds, rather than waving vertical stripes.
          float flow=uvWater.y+time*0.65;
          float stream=noise(vec2(uvWater.x*26.0,flow*5.0));
          float spray=noise(vec2(uvWater.x*48.0,(uvWater.y+time*0.95)*15.0));
          float foam=smoothstep(0.45,0.85,stream)*0.7+smoothstep(0.65,0.9,spray)*0.3;
          float rim=0.025+noise(vec2(0,flow*12.0))*0.035;
          float edge=smoothstep(rim,rim+0.04,uvWater.x)*smoothstep(rim,rim+0.04,1.0-uvWater.x);
          gl_FragColor=vec4(mix(vec3(0.25,0.65,0.72),vec3(0.91,0.99,0.98),0.15+foam*0.8),edge*0.94);
        }`}
        />
      </mesh>
      <instancedMesh
        ref={drops}
        name="WaterfallDrops"
        args={[undefined, undefined, 24]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 4, 6]} />
        <meshBasicMaterial color="#e6ffff" transparent opacity={0.7} depthWrite={false} />
      </instancedMesh>
      <mesh position={[355, 7.65, 18]} rotation-x={-Math.PI / 2} scale={[1, 1.7, 1]}>
        <circleGeometry args={[7.5, 32]} />
        <meshStandardMaterial color="#45aeb6" roughness={0.45} />
      </mesh>
      <group
        name="WaterfallRipples"
        position={[355, 7.72, 14.8]}
        rotation-x={-Math.PI / 2}
        scale={[1, 0.45, 1]}
      >
        <group ref={ripples}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <ringGeometry args={[2.8, 3.1, 32]} />
              <meshBasicMaterial color="#dcf8ed" transparent depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
