/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, Object3D, SpotLight, Vector3 } from "three";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import type { VehicleKind } from "@/game/assets/vehicles";
import { sceneLighting } from "@/game/time/lighting";
import { LOW_QUALITY } from "@/game/engine/quality";

const vehicles = new Set<Group>();
/** Lens geometry follows the same +Z-forward contract as every existing traffic vehicle. */
export function VehicleLights({ kind }: { kind: VehicleKind }) {
  const root = useRef<Group>(null);
  const front = useMemo(
    () => new MeshStandardMaterial({ color: "#fff1c6", emissive: "#fff0c6", emissiveIntensity: 0 }),
    [],
  );
  const rear = useMemo(
    () => new MeshStandardMaterial({ color: "#a43f43", emissive: "#ff3025", emissiveIntensity: 0 }),
    [],
  );
  useLayoutEffect(
    () => () => {
      front.dispose();
      rear.dispose();
    },
    [front, rear],
  );
  const bike = kind === "motorcycle" || kind === "scooter";
  const d = VEHICLE_DEFINITIONS[kind];
  const { x, y, z, round } = d.headlights;
  useLayoutEffect(() => {
    const node = root.current!;
    vehicles.add(node);
    return () => {
      vehicles.delete(node);
    };
  }, []);
  useFrame(() => {
    front.emissiveIntensity = sceneLighting.street * 3;
    rear.emissiveIntensity = sceneLighting.street * 2;
  });
  return (
    <group ref={root} name="VehicleHeadlights" position={[0, y, z]}>
      {(bike ? [0] : [-x, x]).map((offset) => (
        <group key={offset} position={[offset, 0, 0]}>
          <mesh>
            {round ? <sphereGeometry args={[.16,12,8]} /> : <boxGeometry args={[bike ? .24 : .42, kind === "car" || kind === "mpv" ? .12 : .17, .025]} />}
            <primitive attach="material" object={front} />
          </mesh>
          <mesh position={[0, bike ? -0.1 : -0.01, -z - d.size[2] / 2 + .04]}>
            <boxGeometry args={[0.25, 0.14, 0.025]} />
            <primitive attach="material" object={rear} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A fixed pool illuminates the road for the nearest vehicles; no per-car shadow maps. */
export function VehicleLightPool() {
  const lights = useMemo(
    () =>
      Array.from({ length: LOW_QUALITY ? 1 : 2 }, () => {
        const light = new SpotLight("#fff0cc", 0, 20, 0.48, 0.7, 1.3);
        light.name = "VehicleRoadLight";
        light.castShadow = false;
        light.target = new Object3D();
        return light;
      }),
    [],
  );
  const point = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    const candidates = [...vehicles]
      .filter((node) => {
        let visible = node.visible;
        node.traverseAncestors((parent) => {
          if (!parent.visible) visible = false;
        });
        return visible;
      })
      .map((node) => {
        node.updateWorldMatrix(true, false);
        node.getWorldPosition(point);
        return { node, distance: point.distanceToSquared(camera.position) };
      })
      .filter((v) => v.distance < 45 * 45)
      .sort((a, b) => a.distance - b.distance);
    lights.forEach((light, i) => {
      const vehicle = candidates[i]?.node;
      light.intensity = vehicle ? 65 * sceneLighting.street : 0;
      if (!vehicle) return;
      vehicle.getWorldPosition(light.position);
      target.set(0, -0.6, 9);
      vehicle.localToWorld(target);
      light.target.position.copy(target);
      light.target.updateMatrixWorld();
    });
  });
  return (
    <>
      {lights.map((light, i) => (
        <group key={i}>
          <primitive object={light} />
          <primitive object={light.target} />
        </group>
      ))}
    </>
  );
}
