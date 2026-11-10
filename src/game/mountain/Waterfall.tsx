/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import { LOW_QUALITY } from "@/game/engine/quality";
import { reducedMotion } from "@/game/vehicles/visual";
import { MountainNatureBatch } from "./MountainNatureBatch";
import { mountainBoulderGeometry, mountainSurfaceMaterial } from "./MountainMaterials";
import {
  MOUNTAIN_LOCAL_STREAM as MOUNTAIN_STREAM,
  MOUNTAIN_LOCAL_WATERFALL as FALL,
  mountainLocalGroundHeight as mountainGroundHeight,
  mountainWorldPoint,
  mountainGroundHeight as worldGroundHeight,
  nearestMountainTrail as worldNearestTrail,
} from "./model";

function nearestMountainTrail(x: number, z: number) {
  const p = mountainWorldPoint([x, 0, z]);
  const value = worldNearestTrail(p[0], p[2]);
  return { ...value, distance: value.distance / 3 };
}
function worldGeometry(geometry: THREE.BufferGeometry) {
  const origin = mountainWorldPoint([0, 0, 0]);
  geometry.scale(3, 2, 3);
  geometry.translate(...origin);
  return geometry;
}
function worldProp(item: OutdoorPart): OutdoorPart {
  const p = mountainWorldPoint(item.p);
  p[1] = worldGroundHeight(p[0], p[2]) + (item.p[1] - mountainGroundHeight(item.p[0], item.p[2]));
  return { ...item, p };
}

/** Lit, matte foam and rippled water. Local surface detail never affects the full-screen exposure. */
function flowingWater(time: { value: number }, kind: "stream" | "curtain" | "pool") {
  const material = new THREE.MeshStandardMaterial({
    color: "#fff",
    roughness: kind === "curtain" ? 0.48 : 0.23,
    metalness: 0.08,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms["mountainWaterTime"] = time;
    shader.vertexShader = "varying vec2 mountainWaterUv;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n mountainWaterUv=uv;",
    );
    shader.fragmentShader =
      `varying vec2 mountainWaterUv; uniform float mountainWaterTime;
      float waterHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float waterNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(waterHash(i),waterHash(i+vec2(1,0)),f.x),mix(waterHash(i+vec2(0,1)),waterHash(i+vec2(1,1)),f.x),f.y);}
      ` + shader.fragmentShader;
    const isPool = kind === "pool",
      isCurtain = kind === "curtain";
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 p=mountainWaterUv;
      float flow=p.y+mountainWaterTime*${isCurtain ? ".64" : isPool ? ".025" : ".14"};
      float broad=waterNoise(vec2(p.x*${isPool ? "12." : "24."},flow*${isPool ? "17." : "7."}));
      float fine=waterNoise(vec2(p.x*45.,(p.y+mountainWaterTime*.38)*36.));
      float foam=smoothstep(.45,.83,broad)*.75+smoothstep(.69,.91,fine)*.25;
      ${isPool ? "foam*=.16;" : ""}
      ${kind === "stream" ? "foam*=.27+.6*(1.-smoothstep(0.,.2,p.y));" : ""}
      vec3 deep=vec3(.055,.23,.205),shallow=vec3(.26,.49,.39),white=vec3(.80,.89,.82);
      diffuseColor.rgb=mix(mix(deep,shallow,.5+broad*.35),white,${isCurtain ? ".3+foam*.68" : "foam"});
      ${isPool ? "float ripple=sin(length((p-vec2(.5,.25))*vec2(12.,15.))*8.-mountainWaterTime*3.);diffuseColor.rgb+=max(0.,ripple)*.025;" : ""}
      float rim=.018+waterNoise(vec2(0.,flow*14.))*.026;
      ${isPool ? "diffuseColor.a=.94;" : `diffuseColor.a*=smoothstep(rim,rim+.035,p.x)*smoothstep(rim,rim+.035,1.-p.x);`}
      ${isCurtain ? "diffuseColor.a*=1.-smoothstep(.975,1.,p.y);" : ""}
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      `#include <normal_fragment_begin>
      normal=normalize(normal+vec3(sin(mountainWaterUv.x*90.+mountainWaterTime)*.09,cos(mountainWaterUv.y*100.-mountainWaterTime*2.)*.09,0.));`,
    );
  };
  material.customProgramCacheKey = () => `mountain-flow-${kind}-v2`;
  return material;
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
  geometry.computeVertexNormals();
  return geometry;
}

/** Closed channel joins the hillside to the crest; only the final water curl overhangs it. */
function streamBedGeometry() {
  const rows: { x: number; y: number; z: number; width: number }[] = [];
  const crest = MOUNTAIN_STREAM.filter((point) => point[1] >= 1);
  for (let segment = 0; segment < crest.length - 1; segment++) {
    const a = crest[segment]!,
      b = crest[segment + 1]!;
    const steps = Math.ceil((b[1] - a[1]) / 0.4);
    for (let step = 0; step <= steps; step++) {
      if (segment && step === 0) continue;
      const t = step / steps;
      rows.push({
        x: a[0] + (b[0] - a[0]) * t,
        y: a[2] + (b[2] - a[2]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        width: a[3] + (b[3] - a[3]) * t,
      });
    }
  }
  // Tiny overlap at the curl seam also avoids a float32 crack at z=12.9.
  rows[rows.length - 1]!.z += 0.003;
  const vertices: number[] = [],
    bottom: number[] = [],
    indices: number[] = [];
  const columns = 9;
  for (const row of rows) {
    const outer = 0.88 + Math.sin(row.z * 1.8) * 0.1;
    const offsets = [
      -row.width - outer,
      -row.width - 0.35,
      -row.width,
      -row.width * 0.5,
      0,
      row.width * 0.5,
      row.width,
      row.width + 0.35,
      row.width + outer,
    ];
    offsets.forEach((offset, column) => {
      const wet = column >= 2 && column <= 6;
      const y = wet
        ? row.y - 0.07 + 0.0175 * Math.pow(offset / row.width, 2)
        : row.y +
          (column === 1 || column === 7 ? 0.24 + Math.sin(row.z * 2.1 + column) * 0.07 : 0.04);
      vertices.push(row.x + offset, y, row.z);
      // Bury every underside vertex into the existing ground, including the low ravine at the lip.
      const bx = row.x + offset * 0.88,
        bz = row.z - (row.z === rows[rows.length - 1]!.z ? 0.32 : 0);
      bottom.push(bx, Math.min(row.y - 6, mountainGroundHeight(bx, bz) - 0.65), bz);
    });
  }
  const base = vertices.length / 3;
  vertices.push(...bottom);
  for (let row = 0; row < rows.length - 1; row++)
    for (let column = 0; column < columns - 1; column++) {
      const a = row * columns + column,
        b = a + columns;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
      indices.push(a + base, a + 1 + base, b + base, a + 1 + base, b + 1 + base, b + base);
    }
  for (let row = 0; row < rows.length - 1; row++) {
    const left = row * columns,
      right = left + columns - 1;
    indices.push(
      left,
      left + base,
      left + columns,
      left + base,
      left + columns + base,
      left + columns,
    );
    indices.push(
      right,
      right + columns,
      right + base,
      right + base,
      right + columns,
      right + columns + base,
    );
  }
  for (let column = 0; column < columns - 1; column++) {
    const front = (rows.length - 1) * columns + column;
    indices.push(column, column + 1, column + base, column + base, column + 1, column + 1 + base);
    indices.push(front, front + base, front + 1, front + base, front + 1 + base, front + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

function curtainGeometry() {
  const geometry = new THREE.PlaneGeometry(FALL.width, FALL.top - FALL.bottom, 24, 28);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i);
    const low = 1 - (y / (FALL.top - FALL.bottom) + 0.5);
    positions.setXYZ(
      i,
      x * (1 + low * 0.1),
      y,
      Math.sin(x * 3.4 + low * 2.1) * 0.11 + low * low * 0.35,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function waterfallLandscape() {
  const cliff: OutdoorPart[] = [],
    banks: OutdoorPart[] = [],
    logs: OutdoorPart[] = [];
  for (let row = 0; row < 5; row++)
    for (let column = 0; column < 5; column++) {
      const x = FALL.x + (column - 2) * 2.65 + (row % 2) * 0.38;
      const y = row === 4 && column > 0 && column < 4 ? 22.6 : 7.6 + row * 4.1,
        z = 9.4 + Math.sin(column * 1.7 + row) * 0.55;
      cliff.push({
        p: [x, y, z],
        s: [
          4.4 + (column % 2) * 1.2,
          row === 4 && column > 0 && column < 4 ? 6.4 : 7.5,
          5.4 + (row % 2) * 0.5,
        ],
        ry: (row + column) * 0.42,
        color: column === 2 ? "#67715f" : ["#92917b", "#7a806c", "#8b8d76"][(row + column) % 3]!,
      });
    }
  // Lower wet stones at the plunge point and irregular banks on either side of the brook.
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2,
      x = FALL.x + Math.cos(angle) * 6.6,
      z = 18 + Math.sin(angle) * 7.2;
    const y = mountainGroundHeight(x, z);
    if (y > 11 || nearestMountainTrail(x, z).distance < 3.4) continue;
    banks.push({
      p: [x, y + 0.12, z],
      s: [1.6 + (i % 4) * 0.45, 0.9 + (i % 3) * 0.5, 1.4],
      ry: angle,
      color: i % 2 ? "#72765e" : "#8a8d71",
    });
  }
  for (let i = 0; i < MOUNTAIN_STREAM.length - 1; i++) {
    const point = MOUNTAIN_STREAM[i]!;
    for (const side of [-1, 1])
      for (let cluster = 0; cluster < 3; cluster++) {
        const size = 0.9 + ((i + cluster) % 3) * 0.45,
          x = point[0] + side * (point[3] + size * 0.45),
          z = point[1] + cluster * 1.35;
        if (nearestMountainTrail(x, z).distance < 3 + size * 0.65) continue;
        const y = mountainGroundHeight(x, z);
        banks.push({
          p: [x, y + 0.1, z],
          s: [size * 1.6, size, size * 1.4],
          ry: i * 0.8 + cluster,
          color: ["#6e785a", "#909078", "#85866b"][(i + cluster) % 3]!,
        });
      }
  }
  const start = new THREE.Vector3(350.6, mountainGroundHeight(350.6, 1.5) + 0.22, 1.5),
    end = new THREE.Vector3(352.2, mountainGroundHeight(352.2, 5.3) + 0.22, 5.3);
  const direction = end.clone().sub(start),
    rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    );
  logs.push({
    p: start.clone().add(end).multiplyScalar(0.5).toArray() as [number, number, number],
    s: [0.7, direction.length(), 0.7],
    rx: rotation.x,
    ry: rotation.y,
    rz: rotation.z,
    color: "#6c5940",
  });
  return {
    cliff: cliff.map((item) => ({
      ...item,
      p: mountainWorldPoint(item.p),
      s: [item.s[0] * 3, item.s[1] * 2, item.s[2] * 3] as [number, number, number],
    })),
    banks: banks.map(worldProp),
    logs: logs.map(worldProp),
  };
}

/** Creek, weathered cliff, waterfall and plunge pool share the existing safe ravine footprint. */
export function MountainWaterfall() {
  const time = useRef({ value: 0 });
  const landscape = useMemo(waterfallLandscape, []);
  const resources = useMemo(
    () => ({
      stream: worldGeometry(streamGeometry()),
      streamBed: worldGeometry(streamBedGeometry()),
      streamBedMaterial: mountainSurfaceMaterial("rock"),
      curtain: curtainGeometry().scale(3, 2, 3),
      rock: mountainBoulderGeometry(),
      log: new THREE.CylinderGeometry(0.45, 0.5, 1, 11),
      curtainMaterial: flowingWater(time.current, "curtain"),
      streamMaterial: flowingWater(time.current, "stream"),
      poolMaterial: flowingWater(time.current, "pool"),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(resources).forEach((resource) => resource.dispose()),
    [resources],
  );
  const mist = useRef<THREE.InstancedMesh>(null),
    drops = useRef<THREE.InstancedMesh>(null),
    ripples = useRef<THREE.Group>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const count = LOW_QUALITY ? 12 : 24;
  useFrame(({ clock }) => {
    const t = reducedMotion() ? 0 : clock.elapsedTime;
    time.current.value = t;
    if (drops.current) {
      for (let i = 0; i < count; i++) {
        const phase = (t * (0.65 + (i % 5) * 0.04) + i * 0.618) % 1;
        scratch.position.set(
          FALL.x - 2.8 + (i % 8) * 0.8,
          FALL.top - phase * (FALL.top - FALL.bottom),
          FALL.z + 0.18 + (i % 3) * 0.12,
        );
        scratch.position.set(
          ...mountainWorldPoint(scratch.position.toArray() as [number, number, number]),
        );
        scratch.scale.set(0.045, 0.2 + phase * 0.32, 0.035);
        scratch.updateMatrix();
        drops.current.setMatrixAt(i, scratch.matrix);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
    if (mist.current) {
      for (let i = 0; i < 8; i++) {
        const phase = (t * 0.2 + i * 0.37) % 1;
        scratch.position.set(
          FALL.x - 2.4 + (i % 4) * 1.6,
          FALL.bottom + 0.55 + phase * 2.9,
          FALL.z + 0.8 + phase * 1.5,
        );
        scratch.position.set(
          ...mountainWorldPoint(scratch.position.toArray() as [number, number, number]),
        );
        scratch.scale.set(1.5 + phase * 0.9, 0.55 + phase * 0.5, 0.65 + phase * 0.7);
        scratch.updateMatrix();
        mist.current.setMatrixAt(i, scratch.matrix);
      }
      mist.current.instanceMatrix.needsUpdate = true;
    }
    ripples.current?.children.forEach((object, i) => {
      const phase = (t * 0.35 + i / 3) % 1;
      object.scale.setScalar(0.35 + phase * 1.3);
      ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.32;
    });
  });
  return (
    <group name="MountainWaterfall">
      <mesh
        name="WaterfallStreamBed"
        geometry={resources.streamBed}
        material={resources.streamBedMaterial}
        receiveShadow
        castShadow={!LOW_QUALITY}
      />
      <MountainNatureBatch
        name="WaterfallMossyCliff"
        items={landscape.cliff}
        geometry={resources.rock}
        surface="rock"
        shadows={!LOW_QUALITY}
      />
      <MountainNatureBatch
        name="MountainCreekBoulders"
        items={landscape.banks}
        geometry={resources.rock}
        surface="rock"
        shadows={!LOW_QUALITY}
      />
      <MountainNatureBatch
        name="MountainCreekFallenLog"
        items={landscape.logs}
        geometry={resources.log}
        surface="bark"
        shadows={!LOW_QUALITY}
      />
      <mesh
        name="WaterfallCurtain"
        position={mountainWorldPoint([FALL.x, (FALL.top + FALL.bottom) / 2, FALL.z])}
        geometry={resources.curtain}
        material={resources.curtainMaterial}
      />
      <mesh
        name="WaterfallStream"
        geometry={resources.stream}
        material={resources.streamMaterial}
      />
      <mesh
        name="WaterfallPlungePool"
        position={mountainWorldPoint([FALL.x, 8.04, 18])}
        rotation-x={-Math.PI / 2}
        scale={[1, 1.22, 1]}
        material={resources.poolMaterial}
      >
        <circleGeometry args={[21, 48]} />
      </mesh>
      <instancedMesh
        ref={mist}
        name="WaterfallMist"
        args={[undefined, undefined, 8]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 6]} />
        <meshBasicMaterial color="#dbe5da" transparent opacity={0.09} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={drops}
        name="WaterfallDrops"
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 4, 6]} />
        <meshBasicMaterial color="#d7e8de" transparent opacity={0.42} depthWrite={false} />
      </instancedMesh>
      <group
        name="WaterfallRipples"
        position={mountainWorldPoint([FALL.x, 8.08, 15.1])}
        rotation-x={-Math.PI / 2}
        scale={[3, 1.65, 1]}
      >
        <group ref={ripples}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <ringGeometry args={[2.3, 2.43, 36]} />
              <meshBasicMaterial color="#cfddd0" transparent depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
