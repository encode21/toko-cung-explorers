/** @jsxImportSource @/game/jsx */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import { mountainGroundHeight, MOUNTAIN_TRAIL, MOUNTAIN_BRIDGE_SEGMENT } from "./model";
import { MountainLantern } from "./MountainLantern";

function timberMaterial() {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 timberPoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntimberPoint = position;",
    );
    shader.fragmentShader = "varying vec3 timberPoint;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float grain = sin(timberPoint.x*163.0+sin(timberPoint.z*7.0)*2.5);
      float age = sin(timberPoint.x*29.0+timberPoint.z*1.7)*.5+.5;
      float detail = 1.0-smoothstep(.02,.12,length(fwidth(timberPoint)));
      diffuseColor.rgb *= .86 + age*.19 + grain*.065*detail;`,
    );
  };
  material.customProgramCacheKey = () => "mountain-bridge-timber-v1";
  return material;
}

function TimberBatch({
  items,
  geometry,
  material,
  name,
}: {
  items: OutdoorPart[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item, i) => {
      object.position.set(...item.p);
      object.scale.set(...item.s);
      object.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
      object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
      ref.current!.setColorAt(i, color.set(item.color));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.instanceColor!.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      name={name}
      args={[geometry, material, items.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}

/** A long suspension crossing, built in world metres with a seamless six-metre deck. */
export function MountainBridge() {
  const a = MOUNTAIN_TRAIL[MOUNTAIN_BRIDGE_SEGMENT]!,
    b = MOUNTAIN_TRAIL[MOUNTAIN_BRIDGE_SEGMENT + 1]!;
  const length = b[0] - a[0],
    middle = (a[0] + b[0]) / 2,
    z = a[2],
    y = a[1];
  const bridge = useMemo(() => {
    const boards: OutdoorPart[] = [],
      posts: OutdoorPart[] = [],
      ropes: THREE.BufferGeometry[] = [];
    const cableHeight = (t: number) => y + 4.2 - Math.sin(t * Math.PI) * 2.45;
    const rope = (points: THREE.Vector3[], radius: number, segments: number) =>
      ropes.push(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 5, false),
      );
    const planks = Math.ceil(length / 0.5);
    for (let i = 0; i < planks; i++)
      boards.push({
        p: [a[0] + ((i + 0.5) * length) / planks, y - 0.09, z],
        s: [length / planks + 0.002, 0.18, 6],
        color: ["#806044", "#8c6a48", "#9d7b51", "#765c43", "#8f7051"][i % 5]!,
      });
    for (const side of [-1, 1]) {
      const edge = z + side * 3.12;
      boards.push({
        p: [middle, y - 0.36, z + side * 2.1],
        s: [length + 0.5, 0.42, 0.27],
        color: "#4b3829",
      });
      rope(
        Array.from(
          { length: 49 },
          (_, i) => new THREE.Vector3(a[0] + (i * length) / 48, cableHeight(i / 48), edge),
        ),
        0.075,
        96,
      );
      rope(
        Array.from(
          { length: 49 },
          (_, i) =>
            new THREE.Vector3(
              a[0] + (i * length) / 48,
              y + 0.82 - Math.sin(i * 0.5 * Math.PI) ** 2 * 0.05,
              edge,
            ),
        ),
        0.048,
        96,
      );
      const sections = Math.ceil(length / 3);
      for (let i = 0; i <= sections; i++) {
        const x = a[0] + (i * length) / sections,
          end = i === 0 || i === sections,
          height = end ? 4.3 : 1.35;
        posts.push({
          p: [x, y - 0.2 + height / 2, edge],
          s: [end ? 0.48 : 0.2, height, end ? 0.48 : 0.2],
          color: end ? "#62452f" : "#75573b",
        });
        if (!end)
          rope(
            [
              new THREE.Vector3(x, y + 0.1, edge),
              new THREE.Vector3(x, cableHeight(i / sections), edge),
            ],
            0.028,
            1,
          );
      }
    }
    const ropeGeometry = mergeGeometries(ropes)!;
    ropes.forEach((g) => g.dispose());
    return {
      boards,
      posts,
      ropeGeometry,
      plankGeometry: new THREE.BoxGeometry(1, 1, 1),
      postGeometry: new THREE.CylinderGeometry(0.46, 0.5, 1, 9),
      timber: timberMaterial(),
    };
  }, [a, length, middle, y, z]);
  useEffect(
    () => () => {
      bridge.ropeGeometry.dispose();
      bridge.plankGeometry.dispose();
      bridge.postGeometry.dispose();
      bridge.timber.dispose();
    },
    [bridge],
  );
  return (
    <group name="MountainBridge">
      <TimberBatch
        name="MountainBridgePlanks"
        items={bridge.boards}
        geometry={bridge.plankGeometry}
        material={bridge.timber}
      />
      <TimberBatch
        name="MountainBridgePosts"
        items={bridge.posts}
        geometry={bridge.postGeometry}
        material={bridge.timber}
      />
      <mesh name="MountainBridgeRopes" geometry={bridge.ropeGeometry} castShadow>
        <meshStandardMaterial color="#bcaa7b" roughness={1} />
      </mesh>
      <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
        <CuboidCollider
          args={[length / 2 + 0.15, 0.09, 3]}
          position={[middle, y - 0.09, z]}
          friction={0.85}
        />
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={side}
            args={[length / 2 + 0.3, 0.75, 0.1]}
            position={[middle, y + 0.65, z + side * 3.12]}
          />
        ))}
      </RigidBody>
      {[a[0] - 3, b[0] + 3].flatMap((x) =>
        [-4.2, 4.2].map((offset) => (
          <MountainLantern
            key={`${x}:${offset}`}
            position={[x, mountainGroundHeight(x, z + offset), z + offset]}
          />
        )),
      )}
      <group
        position={[a[0] - 4, mountainGroundHeight(a[0] - 4, z + 4.8), z + 4.8]}
        rotation-y={-Math.PI / 2}
      >
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[0.14, 1.7, 0.14]} />
          <meshStandardMaterial color="#644c35" />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <boxGeometry args={[2.4, 0.65, 0.15]} />
          <meshStandardMaterial color="#4b3829" />
        </mesh>
        <Text position={[0, 1.55, 0.085]} fontSize={0.19} color="#f0dfb8">
          JEMBATAN RIMBA
        </Text>
      </group>
    </group>
  );
}
