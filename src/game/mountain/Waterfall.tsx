/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { reducedMotion } from "@/game/vehicles/visual";
import { MOUNTAIN_STREAM, MOUNTAIN_WATERFALL as FALL } from "./model";

const ROCKS: OutdoorPart[] = [8, 14, 20, 25].flatMap((y, i) => [
  {
    // The top centre rock is lowered (top 26.9) into the stream bed under the 27.25 lip.
    p: [355, i === 3 ? 22.9 : y, 8.4],
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

const WATER_VERTEX = `varying vec2 uvWater; void main(){uvWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
/** One advected-foam shader for curtain and stream; v runs 1→0 downstream, 1 unit = 19.6 m. */
const waterFragment = (speed: number, calm: number) => `varying vec2 uvWater; uniform float time;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),
               mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),f.x),f.y);
  }
  void main(){
  // Advect irregular foam downward at two speeds, rather than waving vertical stripes.
  float flow=uvWater.y+time*${speed.toFixed(3)};
  float stream=noise(vec2(uvWater.x*26.0,flow*5.0));
  float spray=noise(vec2(uvWater.x*48.0,(uvWater.y+time*${(speed * 1.46).toFixed(3)})*15.0));
  float foam=smoothstep(0.45,0.85,stream)*0.7+smoothstep(0.65,0.9,spray)*0.3;
  // Calm water foams less, except where it speeds up toward the lip (v near 0).
  foam*=mix(1.0,0.35+0.65*smoothstep(0.12,0.0,uvWater.y),${calm.toFixed(2)});
  float rim=0.025+noise(vec2(0,flow*12.0))*0.035;
  float edge=smoothstep(rim,rim+0.04,uvWater.x)*smoothstep(rim,rim+0.04,1.0-uvWater.x);
  // Both ends cross-fade over the lip: curtain top fades in, the stream curl's end fades out.
  float top=${calm < 0.5 ? "smoothstep(1.0,0.975,uvWater.y)" : "smoothstep(0.0,0.015,uvWater.y)"};
  gl_FragColor=vec4(mix(vec3(0.25,0.65,0.72),vec3(0.91,0.99,0.98),0.15+foam*0.8),edge*top*0.94);
}`;

/** Water ribbon down the hill along MOUNTAIN_STREAM, curling over the lip into the curtain. */
function streamGeometry() {
  const pts: { x: number; y: number; z: number; w: number }[] = [];
  for (let i = 0; i < MOUNTAIN_STREAM.length - 1; i++) {
    const a = MOUNTAIN_STREAM[i]!,
      b = MOUNTAIN_STREAM[i + 1]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.75));
    for (let n = 0; n < steps; n++) {
      const t = n / steps;
      pts.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y: a[2] + (b[2] - a[2]) * t, w: a[3] + (b[3] - a[3]) * t });
    }
  }
  const lip = MOUNTAIN_STREAM[MOUNTAIN_STREAM.length - 1]!;
  // Quarter-circle curl (r 0.8) ending vertical just behind the curtain top.
  for (let n = 0; n <= 6; n++) {
    const angle = (n / 6) * (Math.PI / 2);
    pts.push({ x: lip[0], z: lip[1] + Math.sin(angle) * 0.8, y: lip[2] - (1 - Math.cos(angle)) * 0.8, w: lip[3] });
  }
  let total = 0;
  const along = pts.map((p, i) => (i ? (total += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y, p.z - pts[i - 1]!.z)) : 0));
  const positions: number[] = [],
    uvs: number[] = [],
    index: number[] = [];
  pts.forEach((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)]!,
      o = pts[Math.max(i - 1, 0)]!;
    const dx = q.x - o.x,
      dz = q.z - o.z,
      l = Math.hypot(dx, dz) || 1;
    // Horizontal normal; on the vertical curl the previous direction (+z) keeps width along x.
    const nx = l > 0.05 ? -dz / l : -1,
      nz = l > 0.05 ? dx / l : 0;
    const v = (total - along[i]!) / 19.6;
    positions.push(p.x + nx * p.w, p.y, p.z + nz * p.w, p.x - nx * p.w, p.y, p.z - nz * p.w);
    uvs.push(0, v, 1, v);
    if (i) {
      const a = (i - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  return geometry;
}

/** A small procedural curtain and foam pool; no fluid simulation or screen-space effects. */
export function MountainWaterfall() {
  const uniforms = useRef({ time: { value: 0 } });
  const curtain = useRef<THREE.ShaderMaterial>(null);
  const stream = useMemo(streamGeometry, []);
  useEffect(() => () => stream.dispose(), [stream]);
  const mist = useRef<THREE.InstancedMesh>(null);
  const ripples = useRef<THREE.Group>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const drop = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const time = reducedMotion() ? 0 : clock.elapsedTime;
    if (curtain.current) curtain.current.uniforms["time"]!.value = time;
    if (drops.current) {
      for (let i = 0; i < 24; i++) {
        const phase = (time * (0.65 + (i % 5) * 0.04) + i * 0.618) % 1;
        drop.position.set(352.2 + (i % 8) * 0.8, FALL.top - phase * (FALL.top - FALL.bottom), 14.05 + (i % 3) * 0.1);
        drop.scale.set(0.035, 0.25 + phase * 0.4, 0.035);
        drop.updateMatrix();
        drops.current.setMatrixAt(i, drop.matrix);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
    if (mist.current) {
      // Spray puffs rise from the plunge point and swell as they drift toward the bridge.
      for (let i = 0; i < 10; i++) {
        const phase = (time * 0.22 + i * 0.37) % 1;
        drop.position.set(352 + (i % 5) * 1.5, FALL.bottom + 0.4 + phase * 3.2, 14.6 + phase * 1.6);
        drop.scale.setScalar((0.6 + (i % 3) * 0.25) * (0.6 + phase) * (1 - phase * 0.5));
        drop.updateMatrix();
        mist.current.setMatrixAt(i, drop.matrix);
      }
      mist.current.instanceMatrix.needsUpdate = true;
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
      <mesh name="WaterfallCurtain" position={[FALL.x, (FALL.top + FALL.bottom) / 2, FALL.z]}>
        <planeGeometry args={[FALL.width, FALL.top - FALL.bottom]} />
        <shaderMaterial
          ref={curtain}
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={WATER_VERTEX}
          fragmentShader={waterFragment(0.65, 0)}
        />
      </mesh>
      <mesh name="WaterfallStream" geometry={stream}>
        <shaderMaterial
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={WATER_VERTEX}
          fragmentShader={waterFragment(0.15, 1)}
        />
      </mesh>
      <instancedMesh ref={mist} name="WaterfallMist" args={[undefined, undefined, 10]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#eefcff" transparent opacity={0.16} depthWrite={false} />
      </instancedMesh>
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
