/** @jsxImportSource @/game/jsx */
import { isMotorcycle } from "../vehicles/motorcycles";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, Object3D, SpotLight, Vector3 } from "three";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { carBlueprint } from "../vehicles/blueprints";
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
  const bike = isMotorcycle(kind);
  const d = VEHICLE_DEFINITIONS[kind];
  const blueprint = carBlueprint(kind);
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
      {(x === 0 ? [0] : [-x, x]).map((offset) => (
        <group key={offset} position={[offset, 0, 0]}>
          <mesh
            rotation-x={blueprint === "pickup" ? Math.PI / 2 : 0}
            rotation-z={bike && x !== 0 ? (offset > 0 ? -0.2 : 0.2) : 0}
            rotation-y={bike && x !== 0 ? Math.sign(offset) * 0.5 : 0}
          >
            {blueprint === "pickup" ? (
              <cylinderGeometry args={[0.145, 0.145, 0.018, 24]} />
            ) : round ? (
              <sphereGeometry args={[0.16, 12, 8]} />
            ) : blueprint ? (
              <boxGeometry args={[blueprint === "city-car" ? 0.21 : 0.39, 0.055, 0.018]} />
            ) : (
              <boxGeometry
                args={[
                  bike ? 0.2 : kind === "truck" || kind === "mpv" ? 0.29 : 0.42,
                  bike ? 0.045 : kind === "mpv" ? 0.08 : kind === "car" ? 0.12 : 0.17,
                  kind === "mpv" ? 0.008 : 0.025,
                ]}
              />
            )}
            <primitive attach="material" object={front} />
          </mesh>
          {(!bike || offset === -x) && (
            <mesh
              position={[
                bike ? -offset : 0,
                bike ? (kind === "sport-bike" ? 0.94 : kind === "scooter" ? 0.8 : 0.68) - y : -0.01,
                bike ? -z - 1.02 : -z - d.size[2] / 2 + (blueprint ? -0.026 : 0.04),
              ]}
            >
              <boxGeometry args={bike ? [0.22, 0.065, 0.025] : [0.25, 0.14, 0.025]} />
              <primitive attach="material" object={rear} />
            </mesh>
          )}
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
