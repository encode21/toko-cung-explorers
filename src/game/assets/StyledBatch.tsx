/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef } from "react";
import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { AssetPart, Finish, Shape } from "./parts";

// Unit geometry/materials are shared across every vehicle and accessory. No textures.
const geometry = {
  bevel: new RoundedBoxGeometry(1, 1, 1, 1, 0.07),
  box: new T.BoxGeometry(1, 1, 1),
  cylinder: new T.CylinderGeometry(0.5, 0.5, 1, 12),
  cone: new T.CylinderGeometry(0.12, 0.5, 1, 12),
  ring: new T.TorusGeometry(0.37, 0.13, 6, 16),
  dome: new T.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
};
const finishes: Record<Finish, [number, number]> = {
  paint: [0.65, 0.08],
  plastic: [0.7, 0],
  cardboard: [0.92, 0],
  wood: [0.85, 0],
  rubber: [0.96, 0],
  glass: [0.32, 0.15],
  metal: [0.5, 0.35],
  concrete: [0.95, 0],
  fabric: [0.94, 0],
};
const materials = Object.fromEntries(
  Object.entries(finishes).map(([name, [roughness, metalness]]) => [
    name,
    new T.MeshStandardMaterial({ roughness, metalness }),
  ]),
) as Record<Finish, T.MeshStandardMaterial>;
function Instances({ items, shape, finish }: { items: AssetPart[]; shape: Shape; finish: Finish }) {
  const ref = useRef<T.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new T.Object3D(),
      color = new T.Color(),
      mesh = ref.current!;
    items.forEach((part, i) => {
      o.position.set(...part.p);
      o.scale.set(...part.s);
      o.rotation.set(part.rx ?? 0, part.ry ?? 0, part.rz ?? 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, color.set(part.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry[shape], materials[finish], items.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
export function StyledBatch({ items }: { items: AssetPart[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, { items: AssetPart[]; shape: Shape; finish: Finish }>();
    for (const part of items) {
      const shape = part.shape ?? "bevel",
        finish = part.finish ?? "paint",
        key = `${shape}-${finish}`;
      if (!map.has(key)) map.set(key, { items: [], shape, finish });
      map.get(key)!.items.push(part);
    }
    return [...map];
  }, [items]);
  return (
    <group>
      {groups.map(([key, value]) => (
        <Instances key={key} {...value} />
      ))}
    </group>
  );
}
