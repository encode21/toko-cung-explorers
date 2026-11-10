/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { reducedMotion } from "@/game/vehicles/visual";
import { createBeveledBox } from "@/game/assets/bevel-geometry";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import {
  MOUNTAIN_CHECKPOINT_COUNT,
  MOUNTAIN_NAME,
  mountainGroundHeight,
  mountainWorldPoint,
} from "./model";
import { mountainBoulderGeometry, mountainSurfaceMaterial } from "./MountainMaterials";
import { MountainCampTent } from "./MountainCamps";
import { MOUNTAIN_SEATS } from "./seats";
import { MOUNTAIN_SUMMIT } from "./model";

const block = createBeveledBox(0.055);
const stone = new THREE.MeshStandardMaterial({ color: "#73796c", roughness: 1 });
stone.onBeforeCompile = (shader) => {
  shader.vertexShader = "varying vec3 mountainStonePosition;\n" + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\n mountainStonePosition=(modelMatrix*vec4(position,1.0)).xyz;",
  );
  shader.fragmentShader =
    `varying vec3 mountainStonePosition;
    float stoneHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
    float stoneNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    \n` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    `#include <color_fragment>
    float mottling=stoneNoise(mountainStonePosition*2.6);
    float grains=stoneNoise(mountainStonePosition*30.);
    float grainFade=1.-smoothstep(.05,.3,length(fwidth(mountainStonePosition)));
    diffuseColor.rgb*=.67+mottling*.64+(grains-.5)*.22*grainFade;
    float moss=smoothstep(.57,.8,stoneNoise(mountainStonePosition*.85));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.58,.79,.37),moss*.7);`,
  );
};
stone.customProgramCacheKey = () => "mountain-gate-weathered-stone-v1";
const pale = new THREE.MeshStandardMaterial({ color: "#d5d7bd", roughness: 0.9 });

function StoneBlock({
  position,
  scale,
  trim = false,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  trim?: boolean;
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      geometry={block}
      material={trim ? pale : stone}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}

/** Leaves are clustered around thin hanging stems; the center of the opening stays clear. */
function GateVines({ height = 5.1, span = 3.6 }: { height?: number; span?: number }) {
  const clusters = useMemo(() => {
    const leaves: OutdoorPart[] = [],
      stems: OutdoorPart[] = [];
    for (let i = 0; i < 19; i++) {
      const x = -span + (i / 18) * span * 2;
      const length = Math.abs(x) > span * 0.65 ? 1.7 + (i % 3) * 0.37 : 0.25 + (i % 3) * 0.1;
      const front = i % 2 ? -0.51 : 0.51;
      stems.push({
        p: [x, height - length / 2, front],
        s: [0.025, length, 0.025],
        color: "#485535",
        rz: Math.sin(i * 2.3) * 0.07,
      });
      for (let j = 0; j < Math.ceil(length / 0.13); j++) {
        const side = j % 2 ? 1 : -1;
        leaves.push({
          p: [x + side * 0.09 + Math.sin(j * 2 + i) * 0.035, height - j * 0.13, front + 0.03],
          s: [0.2, 0.11, 0.06],
          ry: side * 0.35,
          rz: side * 0.5,
          color: ["#526b35", "#678348", "#3f5c2e"][j % 3]!,
        });
      }
    }
    return { leaves, stems };
  }, [height, span]);
  return (
    <group name="MountainGateVines">
      <OutdoorBatch items={clusters.stems} shape="round" shadows={false} />
      <OutdoorBatch items={clusters.leaves} shape="foliage" shadows={false} />
    </group>
  );
}

export function MountainHikingGate() {
  const [x, y, z] = mountainWorldPoint([354, 28 / 3, 54]);
  return (
    <group name="MountainTrailGate" position={[x, y, z]} rotation-y={Math.PI / 2}>
      <RigidBody type="fixed" colliders={false}>
        {[-3.65, 3.65].map((side) => {
          // Bury the footing into the lowest corner of this uphill bank, not only its center.
          const foot =
            Math.min(
              ...[-0.6, 0.6].flatMap((cross) =>
                [-0.56, 0.56].map((depth) => mountainGroundHeight(x + depth, z - side - cross)),
              ),
            ) -
            y -
            0.025;
          return (
            <group key={side}>
              <StoneBlock
                position={[side, (foot + 5.15) / 2, 0]}
                scale={[0.86, 5.15 - foot, 0.84]}
              />
              <StoneBlock position={[side, foot + 0.19, 0]} scale={[1.2, 0.38, 1.12]} />
              <CuboidCollider position={[side, foot + 0.19, 0]} args={[0.6, 0.19, 0.56]} />
              <CuboidCollider
                position={[side, (foot + 5.15) / 2, 0]}
                args={[0.43, (5.15 - foot) / 2, 0.42]}
              />
              {[1.05, 1.45, 1.85].map((h) => (
                <StoneBlock key={h} position={[side, h, 0.435]} scale={[0.91, 0.15, 0.06]} trim />
              ))}
            </group>
          );
        })}
        <StoneBlock position={[0, 4.32, 0]} scale={[8.2, 1.28, 0.92]} />
        <StoneBlock position={[0, 5.0, 0]} scale={[8.55, 0.18, 1.1]} />
        <CuboidCollider position={[0, 4.32, 0]} args={[4.1, 0.64, 0.46]} />
      </RigidBody>
      {[-1, 1].map((face) => (
        <group key={face} rotation-y={face === 1 ? 0 : Math.PI}>
          <Text position={[0, 4.57, 0.475]} fontSize={0.27} color="#e9e5cd">
            Selamat datang di
          </Text>
          <Text position={[0, 4.13, 0.475]} fontSize={0.55} color="#f7f0d9" letterSpacing={0.045}>
            {MOUNTAIN_NAME.toUpperCase()}
          </Text>
          <Text position={[0, 3.79, 0.475]} fontSize={0.17} color="#e7d7ac">
            {MOUNTAIN_CHECKPOINT_COUNT} CHECKPOINT · JALUR PENDAKIAN
          </Text>
        </group>
      ))}
      <GateVines />
    </group>
  );
}

function shapeFlag(geometry: THREE.BufferGeometry, time: number) {
  const position = geometry.attributes["position"]!;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      u = x / 2.7;
    position.setZ(
      i,
      (Math.sin(x * 3.6 - time * 2.1 + y * 0.65) * 0.18 +
        Math.sin(x * 7.8 - time * 3.3 + y * 2.1) * 0.045) *
        u,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function SummitFlag() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.7, 1.8, 18, 10);
    g.translate(1.35, 0, 0);
    g.clearGroups();
    // Shared vertices keep the seam closed. Material groups keep the national colors crisp.
    g.addGroup(0, 18 * 5 * 6, 0);
    g.addGroup(18 * 5 * 6, 18 * 5 * 6, 1);
    shapeFlag(g, 0);
    return g;
  }, []);
  const cloth = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#d92127", roughness: 0.92, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: "#fffdf3", roughness: 0.92, side: THREE.DoubleSide }),
    ],
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      cloth.forEach((material) => material.dispose());
    },
    [geometry, cloth],
  );
  useFrame(({ clock }) => {
    // Keep the initial cloth fold, or the last pose if the preference changes live.
    if (reducedMotion()) return;
    shapeFlag(geometry, clock.elapsedTime);
  });
  return (
    <group name="MountainIndonesianFlag" position={[-7.8, 0, -5.2]}>
      <mesh position={[0, 3.7, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.085, 7.4, 12]} />
        <meshStandardMaterial color="#c3c8c2" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 7.45, 0]}>
        <sphereGeometry args={[0.11, 12, 8]} />
        <meshStandardMaterial color="#d5bc72" metalness={0.4} roughness={0.5} />
      </mesh>
      <StoneBlock position={[0, 0.16, 0]} scale={[0.65, 0.32, 0.65]} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider position={[0, 0.16, 0]} args={[0.325, 0.16, 0.325]} />
        <CylinderCollider position={[0, 3.7, 0]} args={[3.7, 0.085]} />
      </RigidBody>
      <mesh
        name="MountainRedWhiteFlagCloth"
        position={[0.07, 6.35, 0]}
        geometry={geometry}
        material={cloth}
      />
    </group>
  );
}

/** A summit rock, a single inscription and the national flag keep this a natural lookout. */
export function MountainSummitLandmark() {
  const rock = useMemo(() => {
    const geometry = mountainBoulderGeometry();
    const position = geometry.getAttribute("position");
    // A broad weathered face gives the lettering a real rock surface to sit against.
    for (let i = 0; i < position.count; i++)
      if (position.getZ(i) > 0.23) position.setZ(i, 0.32 + Math.sin(position.getX(i) * 11) * 0.012);
    // Normalize the actual craggy bounds, rather than treating its radius as a unit box.
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(7 / size.x, 3.6 / size.y, 3 / size.z);
    geometry.translate(0, 1.6, 0);
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    const material = mountainSurfaceMaterial("rock");
    material.color.set("#363e35");
    const compile = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        "diffuseColor.rgb*=.42;\n#include <roughnessmap_fragment>",
      );
    };
    material.customProgramCacheKey = () => "mountain-summit-dark-rock-v3";
    return { geometry, material };
  }, []);
  useEffect(
    () => () => {
      rock.geometry.dispose();
      rock.material.dispose();
    },
    [rock],
  );
  return (
    <group name="MountainSummitLandmark">
      <group position={[-8, 0, 0]}>
        <mesh
          name="MountainSummitNameRock"
          geometry={rock.geometry}
          material={rock.material}
          castShadow
          receiveShadow
        />
        <Text
          name="MountainSummitInscription"
          position={[0, 1.65, 1.56]}
          fontSize={0.56}
          letterSpacing={0.035}
          color="#f4eee0"
          outlineWidth={0.012}
          outlineColor="#454b3d"
        >
          GUNUNG CUNG
        </Text>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[3.5, 1.8, 1.5]} position={[0, 1.6, 0]} />
        </RigidBody>
      </group>
      <SummitFlag />
      <MountainCampTent position={[-13, 0, -10]} theme={0} />
      <MountainCampTent position={[-13, 0, 7]} theme={2} yaw={Math.PI / 2} />
      {MOUNTAIN_SEATS.map((seat) => (
        <SummitFoldingChair
          key={seat.id}
          position={[
            seat.position[0] - MOUNTAIN_SUMMIT.position[0],
            seat.position[1] - MOUNTAIN_SUMMIT.position[1],
            seat.position[2] - MOUNTAIN_SUMMIT.position[2],
          ]}
          name={seat.id}
        />
      ))}
    </group>
  );
}

function SummitFoldingChair({
  position,
  name,
}: {
  position: [number, number, number];
  name: string;
}) {
  const frame = useMemo<OutdoorPart[]>(
    () =>
      [-1, 1].flatMap((side) => [
        { p: [side * 0.42, 0.35, 0], s: [0.035, 0.9, 0.035], rx: 0.88, color: "#505750" },
        { p: [side * 0.42, 0.35, 0], s: [0.035, 0.9, 0.035], rx: -0.88, color: "#505750" },
        { p: [side * 0.42, 0.81, -0.32], s: [0.035, 0.78, 0.035], rx: -0.15, color: "#505750" },
        { p: [0, 0.48, side * 0.32], s: [0.035, 0.88, 0.035], rz: Math.PI / 2, color: "#505750" },
      ]),
    [],
  );
  return (
    <group name={name} position={position}>
      <OutdoorBatch items={frame} shape="round" />
      <mesh position={[0, 0.48, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.82, 0.65]} />
        <meshStandardMaterial color="#667457" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.87, -0.34]} rotation-x={-0.15}>
        <planeGeometry args={[0.82, 0.58]} />
        <meshStandardMaterial color="#667457" roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
