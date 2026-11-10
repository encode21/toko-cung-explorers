/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { reducedMotion } from "@/game/vehicles/visual";
import { sceneLighting } from "@/game/time/lighting";
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
// Smooth blobs: churned foam at the plunge line; moss ledges on the rocks and lily pads.
const FOAM: OutdoorPart[] = Array.from({ length: 13 }, (_, i): OutdoorPart => ({
  p: [351 + i * 0.68, 7.85 + (i % 3) * 0.12, 15.5 + (i % 2) * 0.8 + (i % 5) * 0.12],
  s: [1.5 + (i % 3) * 0.35, 0.8 + (i % 2) * 0.3, 1.3 + (i % 4) * 0.2],
  color: i % 4 ? "#f4fffc" : "#d3f4ee",
}));
const MOSS: OutdoorPart[] = [
  ...[8, 14, 20, 25].flatMap((y, i): OutdoorPart[] => [
    { p: [350.1, y + 3.15, 10.3], s: [5, 1.3, 3.6], color: i % 2 ? "#6fa55a" : "#5c9450" },
    { p: [359.9, y + 3.4, 10.4], s: [5.2, 1.4, 3.8], color: i % 2 ? "#5c9450" : "#7bb062" },
  ]),
  ...[
    [349.5, 21.5],
    [351.2, 25],
    [359, 26.5],
    [361.5, 22.5],
    [356.5, 28],
  ].map(([x, z], i): OutdoorPart => ({
    p: [x!, 7.69, z!],
    s: [1.1 + (i % 2) * 0.3, 0.05, 1.1 + (i % 2) * 0.3],
    color: i % 2 ? "#6fb36a" : "#58a05c",
  })),
];
const blobGeometry = new THREE.SphereGeometry(0.5, 14, 10);
function Blobs({ items, glow = 0 }: { items: OutdoorPart[]; glow?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const o = new THREE.Object3D(),
      c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
      mesh.current!.setColorAt(i, c.set(it.color));
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.instanceColor!.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={mesh} args={[blobGeometry, undefined, items.length]} dispose={null}>
      <meshStandardMaterial roughness={0.9} emissive="#dff6f4" emissiveIntensity={glow} />
    </instancedMesh>
  );
}

const WATER_VERTEX = `varying vec2 uvWater; void main(){uvWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const WATER_HEAD = `varying vec2 uvWater; uniform float time; uniform float light;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),
               mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),f.x),f.y);
  }`;
/** Stream ribbon: advected foam; v runs 1→0 downstream, 1 unit = 19.6 m. */
const STREAM_FRAGMENT = `${WATER_HEAD}
  void main(){
  float flow=uvWater.y+time*0.15;
  float stream=noise(vec2(uvWater.x*26.0,flow*5.0));
  float spray=noise(vec2(uvWater.x*48.0,(uvWater.y+time*0.219)*15.0));
  float foam=smoothstep(0.45,0.85,stream)*0.7+smoothstep(0.65,0.9,spray)*0.3;
  // Calm water foams less, except where it speeds up toward the lip (v near 0).
  foam*=0.35+0.65*smoothstep(0.12,0.0,uvWater.y);
  float rim=0.025+noise(vec2(0,flow*12.0))*0.035;
  float edge=smoothstep(rim,rim+0.04,uvWater.x)*smoothstep(rim,rim+0.04,1.0-uvWater.x);
  // The curl's end cross-fades into the curtain top.
  float top=smoothstep(0.0,0.015,uvWater.y);
  gl_FragColor=vec4(mix(vec3(0.25,0.65,0.72),vec3(0.91,0.99,0.98),0.15+foam*0.8)*light,edge*top*0.94);
}`;
/** Curtain: long vertical strands, falling white clumps, foamy edges and a churned white base. */
const CURTAIN_FRAGMENT = `${WATER_HEAD}
  void main(){
  float flow=uvWater.y+time*0.65;
  float strands=noise(vec2(uvWater.x*34.0,flow*2.2))*0.6+noise(vec2(uvWater.x*72.0+3.0,flow*4.6))*0.4;
  float clumps=smoothstep(0.55,0.9,noise(vec2(uvWater.x*9.0,(uvWater.y+time*0.95)*6.5)));
  float side=min(uvWater.x,1.0-uvWater.x);
  float rim=0.02+noise(vec2(uvWater.x*3.0,flow*10.0))*0.05;
  float white=smoothstep(0.42,0.78,strands)*0.5+clumps*0.4
    +smoothstep(0.26,0.0,uvWater.y)*0.95+smoothstep(0.16,rim,side)*0.55;
  vec3 deep=mix(vec3(0.20,0.68,0.78),vec3(0.09,0.47,0.62),uvWater.y);
  float top=smoothstep(1.0,0.975,uvWater.y);
  gl_FragColor=vec4(mix(deep,vec3(0.95,1.0,0.99),clamp(white,0.0,1.0))*light,smoothstep(rim*0.4,rim,side)*top*0.97);
}`;
/** Plunge pool: deep centre, pale shallows, shoreline foam and rings spreading from the fall. */
const POOL_FRAGMENT = `${WATER_HEAD}
  void main(){
  vec2 c=(uvWater-0.5)*2.0;
  float r=length(c);
  float d=length((uvWater-vec2(0.5,0.625))*vec2(1.0,1.7));
  float rings=smoothstep(0.7,1.0,sin(d*55.0-time*3.2))*smoothstep(0.5,0.08,d);
  float wobble=noise(vec2(atan(c.y,c.x)*5.0,time*0.5))*0.07;
  float shore=smoothstep(0.86+wobble,0.93+wobble,r);
  float glint=smoothstep(0.82,0.95,noise(uvWater*38.0+vec2(time*0.25,-time*0.18)))*0.35;
  vec3 color=mix(vec3(0.10,0.48,0.62),vec3(0.40,0.82,0.84),smoothstep(0.15,0.95,r));
  color=mix(color,vec3(0.95,1.0,0.99),clamp(rings*0.55+shore*0.8+smoothstep(0.14,0.02,d)+glint,0.0,1.0));
  gl_FragColor=vec4(color*light,1.0);
}`;

/** Curtain sheet that bows outward, arcs away from the lip and widens as it falls. */
function curtainGeometry() {
  const g = new THREE.PlaneGeometry(FALL.width, FALL.top - FALL.bottom, 12, 16),
    p = g.attributes["position"]!,
    uv = g.attributes["uv"]!;
  for (let i = 0; i < p.count; i++) {
    const drop = 1 - uv.getY(i),
      across = 1 - (2 * uv.getX(i) - 1) ** 2;
    p.setX(i, p.getX(i) * (1 + 0.2 * drop * drop));
    p.setZ(i, across * 0.5 + drop * drop * 1.2);
  }
  return g;
}

/** Water ribbon down the hill along MOUNTAIN_STREAM, curling over the lip into the curtain. */
function streamGeometry() {
  const pts: { x: number; y: number; z: number; w: number }[] = [];
  for (let i = 0; i < MOUNTAIN_STREAM.length - 1; i++) {
    const a = MOUNTAIN_STREAM[i]!,
      b = MOUNTAIN_STREAM[i + 1]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.75));
    for (let n = 0; n < steps; n++) {
      const t = n / steps;
      pts.push({
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        y: a[2] + (b[2] - a[2]) * t,
        w: a[3] + (b[3] - a[3]) * t,
      });
    }
  }
  const lip = MOUNTAIN_STREAM[MOUNTAIN_STREAM.length - 1]!;
  // Quarter-circle curl (r 0.8) ending vertical just behind the curtain top.
  for (let n = 0; n <= 6; n++) {
    const angle = (n / 6) * (Math.PI / 2);
    pts.push({
      x: lip[0],
      z: lip[1] + Math.sin(angle) * 0.8,
      y: lip[2] - (1 - Math.cos(angle)) * 0.8,
      w: lip[3],
    });
  }
  let total = 0;
  const along = pts.map((p, i) =>
    i ? (total += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y, p.z - pts[i - 1]!.z)) : 0,
  );
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
  const uniforms = useRef({ time: { value: 0 }, light: { value: 1 } });
  const sheet = useMemo(curtainGeometry, []);
  const curtain = useRef<THREE.ShaderMaterial>(null);
  const stream = useMemo(streamGeometry, []);
  useEffect(
    () => () => {
      stream.dispose();
      sheet.dispose();
    },
    [stream, sheet],
  );
  const mist = useRef<THREE.InstancedMesh>(null);
  const ripples = useRef<THREE.Group>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const drop = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const time = reducedMotion() ? 0 : clock.elapsedTime;
    if (curtain.current) curtain.current.uniforms["time"]!.value = time;
    // Unlit water still dims with the street-light level at night.
    uniforms.current.light.value = 1 - 0.6 * sceneLighting.street;
    if (drops.current) {
      for (let i = 0; i < 24; i++) {
        const phase = (time * (0.65 + (i % 5) * 0.04) + i * 0.618) % 1;
        drop.position.set(
          352.2 + (i % 8) * 0.8,
          FALL.top - phase * (FALL.top - FALL.bottom),
          14.6 + phase * phase * 1.2 + (i % 3) * 0.1,
        );
        drop.scale.set(0.035, 0.25 + phase * 0.4, 0.035);
        drop.updateMatrix();
        drops.current.setMatrixAt(i, drop.matrix);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
    if (mist.current) {
      // Spray puffs rise from the plunge point and swell as they drift toward the bridge.
      for (let i = 0; i < 16; i++) {
        const phase = (time * 0.22 + i * 0.37) % 1;
        drop.position.set(
          351.2 + (i % 6) * 1.5,
          FALL.bottom + 0.4 + phase * 3.6,
          15.4 + phase * 1.8,
        );
        drop.scale.setScalar((0.9 + (i % 3) * 0.35) * (0.6 + phase) * (1 - phase * 0.5));
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
      <Blobs items={FOAM} glow={0.5} />
      <Blobs items={MOSS} />
      <mesh
        name="WaterfallCurtain"
        geometry={sheet}
        position={[FALL.x, (FALL.top + FALL.bottom) / 2, FALL.z]}
      >
        <shaderMaterial
          ref={curtain}
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={WATER_VERTEX}
          fragmentShader={CURTAIN_FRAGMENT}
        />
      </mesh>
      <mesh name="WaterfallStream" geometry={stream}>
        <shaderMaterial
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={WATER_VERTEX}
          fragmentShader={STREAM_FRAGMENT}
        />
      </mesh>
      <instancedMesh
        ref={mist}
        name="WaterfallMist"
        args={[undefined, undefined, 16]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#eefcff" transparent opacity={0.22} depthWrite={false} />
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
        <circleGeometry args={[7.5, 40]} />
        <shaderMaterial
          uniforms={uniforms.current}
          vertexShader={WATER_VERTEX}
          fragmentShader={POOL_FRAGMENT}
        />
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
