/** @jsxImportSource @/game/jsx */
import { useEffect, useId, useMemo } from "react";
import * as THREE from "three";
import { MountainNatureBatch } from "../mountain/MountainNatureBatch";
import { LOW_QUALITY } from "../engine/quality";
import { avatarSurfaceY } from "../avatar/grounding";
import { groundContacts } from "./contact-shadows";
import { naturalBroadleafGeometry, naturalPineGeometry } from "./natural-tree-geometry";
import { naturalTreeParts, type TreeSpot } from "./vegetation";

/** Keep complete folded leaves at distance; foliage never becomes an opaque canopy ball. */
function distantLeaves(source: THREE.BufferGeometry, leafVertices: number) {
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"] as const) {
    const attribute = source.getAttribute(name);
    const values: number[] = [];
    for (let leaf = 0; leaf < attribute.count / leafVertices; leaf += 2)
      for (let vertex = 0; vertex < leafVertices; vertex++) {
        const i = leaf * leafVertices + vertex;
        values.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
      }
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, 3));
  }
  geometry.computeBoundingSphere();
  return geometry;
}

/** Street trees share the mountain's folded-leaf/needle geometry and bark shader. */
export function NaturalTrees({ spots }: { spots: TreeSpot[] }) {
  const id = useId();
  const forest = useMemo(() => {
    const trees = spots.map(naturalTreeParts);
    return {
      trunks: trees.flatMap((tree) => tree.trunks),
      branches: trees.flatMap((tree) => tree.branches),
      broadleaf: trees.filter((tree) => !tree.pine).map((tree) => tree.canopy),
      pine: trees.filter((tree) => tree.pine).map((tree) => tree.canopy),
    };
  }, [spots]);
  const geometry = useMemo(() => {
    const broadleaf = naturalBroadleafGeometry(),
      pine = naturalPineGeometry();
    return {
      trunk: new THREE.CylinderGeometry(0.32, 0.5, 1, 8),
      broadleaf,
      pine,
      distantBroadleaf: distantLeaves(broadleaf, 12),
      distantPine: distantLeaves(pine, 24),
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(geometry).forEach((item) => item.dispose());
    },
    [geometry],
  );
  useEffect(() => {
    groundContacts.set(
      id,
      spots.map((p) => ({
        x: p.x,
        y: p.y ?? avatarSurfaceY(p),
        z: p.z,
        width: 4.5 * (p.scale ?? 1),
        length: 4.5 * (p.scale ?? 1),
        yaw: 0,
      })),
    );
    return () => {
      groundContacts.delete(id);
    };
  }, [id, spots]);
  return (
    <group name="NaturalCityTrees">
      <MountainNatureBatch
        items={forest.trunks}
        geometry={geometry.trunk}
        name="CityTreeBark"
        surface="bark"
        distance={260}
        shadows={!LOW_QUALITY}
      />
      <MountainNatureBatch
        items={forest.branches}
        geometry={geometry.trunk}
        name="CityTreeBranches"
        surface="bark"
        distance={100}
        shadows={!LOW_QUALITY}
      />
      {(["broadleaf", "pine"] as const).map((kind) =>
        forest[kind].length ? (
          <group key={kind}>
            <MountainNatureBatch
              items={forest[kind]}
              geometry={geometry[kind]}
              name={`CityTreeLeaves-${kind}`}
              distance={100}
              wind
              shadows={!LOW_QUALITY}
            />
            <MountainNatureBatch
              items={forest[kind]}
              geometry={geometry[kind === "pine" ? "distantPine" : "distantBroadleaf"]}
              name={`CityDistantLeaves-${kind}`}
              distance={260}
              minimumDistance={100}
              wind
            />
          </group>
        ) : null,
      )}
    </group>
  );
}
