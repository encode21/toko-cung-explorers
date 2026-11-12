/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Trees } from "@/game/world/Foliage";
import { MountainNatureBatch as NatureBatch } from "./MountainNatureBatch";
import { mountainBoulderGeometry } from "./MountainMaterials";
import { naturalPineGeometry, naturalBroadleafGeometry } from "@/game/world/natural-tree-geometry";
import { grassGeometry } from "@/game/world/natural-grass-geometry";
import type { TreeSpot } from "@/game/world/vegetation";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { LOW_QUALITY } from "@/game/engine/quality";
import {
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_BOUNDS,
  mountainWorldPoint,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  mountainGroundHeight,
  mountainCheckpointTerrace,
  mountainStreamAt,
  nearestMountainTrail,
} from "./model";

function geometryFrom(vertices: number[], colors?: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  if (colors) g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function fernGeometry() {
  const vertices: number[] = [];
  for (let arm = 0; arm < 7; arm++) {
    const a = (arm * Math.PI * 2) / 7;
    for (let leaf = 0; leaf < 7; leaf++) {
      const t = (leaf + 1) / 8,
        length = 0.34 * Math.sin(t * Math.PI);
      const x = Math.sin(a) * t,
        z = Math.cos(a) * t,
        y = Math.sin(t * Math.PI) * 0.5 + 0.05;
      for (const side of [-1, 1]) {
        const sx = Math.cos(a) * length * side,
          sz = -Math.sin(a) * length * side;
        vertices.push(
          x,
          y,
          z,
          x + sx + Math.sin(a) * 0.13,
          y + 0.06,
          z + sz + Math.cos(a) * 0.13,
          x + Math.sin(a) * 0.14,
          y - 0.02,
          z + Math.cos(a) * 0.14,
        );
      }
    }
  }
  return geometryFrom(vertices);
}

/** Three flower stems per instance, with folded leaves and six rounded buttercup petals. */
function flowerGeometry() {
  const vertices: number[] = [],
    colors: number[] = [];
  const tri = (points: number[], color: number[]) => {
    vertices.push(...points);
    for (let n = 0; n < 3; n++) colors.push(...color);
  };
  for (let flower = 0; flower < 3; flower++) {
    const x = Math.cos(flower * 2.4) * 0.25,
      z = Math.sin(flower * 2.4) * 0.25,
      h = 0.65 + flower * 0.17;
    tri([x - 0.012, 0, z, x + 0.012, 0, z, x + 0.06, h, z], [0.26, 0.47, 0.12]);
    tri([x, 0, z - 0.012, x, 0, z + 0.012, x + 0.06, h, z], [0.26, 0.47, 0.12]);
    for (const side of [-1, 1])
      tri(
        [x, h * 0.45, z, x + side * 0.22, h * 0.55, z + 0.08, x + 0.04, h * 0.62, z],
        [0.33, 0.55, 0.15],
      );
    for (let petal = 0; petal < 6; petal++) {
      const a = (petal * Math.PI) / 3,
        dx = Math.cos(a),
        dz = Math.sin(a),
        r = 0.15;
      const center = [x + 0.06, h, z],
        left = [x + 0.06 + dx * r - dz * 0.07, h + 0.015, z + dz * r + dx * 0.07],
        tip = [x + 0.06 + dx * r * 1.3, h + 0.045, z + dz * r * 1.3],
        right = [x + 0.06 + dx * r + dz * 0.07, h + 0.015, z + dz * r - dx * 0.07];
      tri([...center, ...left, ...tip], [1, 0.81, 0.1]);
      tri([...center, ...tip, ...right], [1, 0.92, 0.24]);
    }
  }
  return geometryFrom(vertices, colors);
}

function makeForest() {
  let seed = 637013;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const trees: TreeSpot[] = [],
    grass: OutdoorPart[] = [],
    rocks: OutdoorPart[] = [],
    moss: OutdoorPart[] = [],
    ferns: OutdoorPart[] = [],
    pines: OutdoorPart[] = [],
    trunks: OutdoorPart[] = [],
    crowns: OutdoorPart[] = [],
    flowers: OutdoorPart[] = [],
    pebbles: OutdoorPart[] = [],
    logs: OutdoorPart[] = [];
  const allowed = (x: number, z: number, clearance: number) => {
    if (nearestMountainTrail(x, z).distance < clearance) return false;
    if (
      Math.hypot(x - MOUNTAIN_SUMMIT.position[0], z - MOUNTAIN_SUMMIT.position[2]) <
      25 + clearance
    )
      return false;
    if (
      MOUNTAIN_CHECKPOINTS.some((cp) => {
        const [a, b] = mountainCheckpointTerrace(cp.id);
        return (
          Math.abs(x - cp.position[0]) < a + clearance &&
          Math.abs(z - cp.position[2]) < b + clearance
        );
      })
    )
      return false;
    // Arrival, wardrobe, fire, tents, signs and the sandy waterfront stay open.
    if (x > 926 && x < 1094 && z > 255) return false;
    if (z > 344) return false;
    const stream = mountainStreamAt(x, z);
    if (stream.distance < stream.halfWidth + clearance * 0.7) return false;
    const y = mountainGroundHeight(x, z);
    return y > 3;
  };
  const randomPoint = () =>
    [
      MOUNTAIN_BOUNDS.minX + 15 + random() * (MOUNTAIN_BOUNDS.maxX - MOUNTAIN_BOUNDS.minX - 30),
      MOUNTAIN_BOUNDS.minZ + 15 + random() * (MOUNTAIN_BOUNDS.maxZ - MOUNTAIN_BOUNDS.minZ - 30),
    ] as const;
  const target = LOW_QUALITY ? 480 : 1150;
  for (let attempt = 0; attempt < target * 10 && pines.length + crowns.length < target; attempt++) {
    const [x, z] = randomPoint();
    if (!allowed(x, z, 5.5)) continue;
    const y = mountainGroundHeight(x, z);
    if (Math.abs(mountainGroundHeight(x + 1, z) - y) > 1.6) continue;
    const scale = 1.15 + random() * 0.85;
    if (random() < 0.68)
      pines.push({
        p: [x, y, z],
        s: [scale, scale, scale],
        ry: random() * Math.PI,
        color: ["#396545", "#456e43", "#567b48"][attempt % 3]!,
      });
    else
      crowns.push({
        p: [x, y, z],
        s: [scale, scale, scale],
        ry: random() * Math.PI,
        color: ["#547048", "#647c4a", "#45633e"][attempt % 3]!,
      });
    trunks.push({
      p: [x, y + 3.3 * scale, z],
      s: [0.36 * scale, 6.6 * scale, 0.36 * scale],
      color: "#68543d",
    });
    if (attempt % 3 === 0)
      for (let branch = 0; branch < 3; branch++) {
        const angle = branch * 2.1 + attempt;
        trunks.push({
          p: [
            x + Math.sin(angle) * 0.7 * scale,
            y + (3.8 + branch * 0.4) * scale,
            z + Math.cos(angle) * 0.7 * scale,
          ],
          s: [0.12 * scale, 1.7 * scale, 0.12 * scale],
          rx: Math.cos(angle) * 0.8,
          rz: -Math.sin(angle) * 0.8,
          color: "#66513b",
        });
      }
  }
  const addGrass = (x: number, z: number) => {
    if (!allowed(x, z, 3.35)) return;
    const y = mountainGroundHeight(x, z);
    if (Math.abs(mountainGroundHeight(x + 0.5, z) - y) > 1.3) return;
    const size = 0.65 + random() * 0.6;
    grass.push({
      p: [x, y - 0.035, z],
      s: [size, 0.32 + random() * 0.48, size],
      ry: random() * Math.PI,
      color: ["#9cb969", "#73954c", "#8daa53", "#b3c87d"][grass.length % 4]!,
    });
  };
  for (let segment = 0; segment < MOUNTAIN_TRAIL.length - 1; segment++) {
    const a = MOUNTAIN_TRAIL[segment]!,
      b = MOUNTAIN_TRAIL[segment + 1]!,
      dx = b[0] - a[0],
      dz = b[2] - a[2],
      length = Math.hypot(dx, dz);
    for (let along = 0; along < length; along += LOW_QUALITY ? 1.25 : 0.75)
      for (const side of [-1, 1]) {
        const t = along / length,
          offset = 3.6 + random() * 0.8;
        for (let row = 0; row < (LOW_QUALITY ? 1 : 2); row++)
          addGrass(
            a[0] + dx * t - (dz / length) * (offset + row * 0.8) * side,
            a[2] + dz * t + (dx / length) * (offset + row * 0.8) * side,
          );
        if (segment % 3 !== 1 && random() < 0.4) {
          const x = a[0] + dx * t - (dz / length) * (4 + random() * 1.8) * side,
            z = a[2] + dz * t + (dx / length) * (4 + random() * 1.8) * side;
          if (allowed(x, z, 3.6))
            flowers.push({
              p: [x, mountainGroundHeight(x, z), z],
              s: [0.85, 0.7 + random() * 0.35, 0.85],
              ry: random() * Math.PI,
              color: "#fff",
            });
        }
        if (random() < 0.35) {
          const x = a[0] + dx * t - (dz / length) * 2.8 * side,
            z = a[2] + dz * t + (dx / length) * 2.8 * side,
            trail = nearestMountainTrail(x, z);
          if (Math.abs(mountainGroundHeight(x, z) - trail.height) < 0.3)
            pebbles.push({
              p: [x, mountainGroundHeight(x, z) + 0.02, z],
              s: [0.2 + random() * 0.2, 0.1, 0.2],
              ry: random() * Math.PI,
              color: "#9c9a87",
            });
        }
      }
  }
  for (let patch = 0; patch < (LOW_QUALITY ? 220 : 520); patch++) {
    const [x, z] = randomPoint();
    for (let tuft = 0; tuft < 12; tuft++) {
      const angle = tuft * 2.399,
        radius = Math.sqrt(tuft) * 0.6;
      addGrass(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
    }
  }
  for (let i = 0; i < (LOW_QUALITY ? 520 : 1000); i++) {
    const [x, z] = randomPoint(),
      size = 0.9 + random() * 3.2;
    if (!allowed(x, z, 3.7 + size)) continue;
    const y = mountainGroundHeight(x, z),
      height = size * (0.65 + random() * 0.4);
    if (Math.abs(mountainGroundHeight(x + size * 0.6, z) - y) > height * 0.45) continue;
    rocks.push({
      p: [x, y + height * 0.06, z],
      s: [size * 1.5, height, size],
      ry: random() * Math.PI,
      color: ["#747a6c", "#858976", "#656e63"][i % 3]!,
    });
    if (i % 2 === 0)
      moss.push({
        p: [x, y + height * 0.35, z],
        s: [size * 0.6, 0.12, size * 0.5],
        color: "#69804b",
      });
  }
  for (let i = 0; i < (LOW_QUALITY ? 350 : 800); i++) {
    const [x, z] = randomPoint();
    if (!allowed(x, z, 4)) continue;
    const size = 0.7 + random() * 0.8;
    ferns.push({
      p: [x, mountainGroundHeight(x, z) + 0.02, z],
      s: [size, size, size],
      ry: random() * Math.PI,
      color: i % 2 ? "#619046" : "#7e9e4e",
    });
  }
  for (const local of [
    [324, 12, 63],
    [397, 24, 29],
    [399, 36, -34],
    [321, 43, -54],
    [367, 18, 38],
  ] as const) {
    const [x, , z] = mountainWorldPoint(local);
    if (allowed(x, z, 6))
      logs.push({
        p: [x, mountainGroundHeight(x, z) + 0.25, z],
        s: [0.72, 4.8, 0.72],
        rx: Math.PI / 2,
        ry: random() * Math.PI,
        color: "#67513a",
      });
  }
  return { trees, grass, rocks, moss, ferns, pines, trunks, crowns, flowers, pebbles, logs };
}

export function MountainVegetation() {
  const forest = useMemo(makeForest, []);
  const geometry = useMemo(
    () => ({
      grass: grassGeometry(),
      fern: fernGeometry(),
      pine: naturalPineGeometry(),
      rock: mountainBoulderGeometry(),
      broadleaf: naturalBroadleafGeometry(),
      flowers: flowerGeometry(),
      trunk: new THREE.CylinderGeometry(0.4, 0.5, 1, 9),
      distantPine: new THREE.ConeGeometry(2.2, 5.5, 7).translate(0, 4.8, 0),
      distantCrown: new THREE.IcosahedronGeometry(2.05, 1).translate(0, 5.0, 0),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometry).forEach((g) => g.dispose());
    },
    [geometry],
  );
  return (
    <group name="MountainForest">
      <Trees spots={forest.trees} />
      <NatureBatch
        items={forest.trunks}
        geometry={geometry.trunk}
        name="MountainTreeBark"
        distance={650}
        surface="bark"
        shadows={!LOW_QUALITY}
      />
      <NatureBatch
        items={forest.crowns}
        geometry={geometry.broadleaf}
        name="MountainBroadleafCanopy"
        distance={180}
        wind
        shadows={!LOW_QUALITY}
      />
      <NatureBatch
        items={forest.flowers}
        geometry={geometry.flowers}
        name="MountainWildflowers"
        distance={110}
        wind
      />
      <NatureBatch
        items={forest.pebbles}
        geometry={geometry.rock}
        name="MountainTrailPebbles"
        distance={85}
        surface="rock"
      />
      <NatureBatch
        items={forest.logs}
        geometry={geometry.trunk}
        name="MountainFallenLogs"
        surface="bark"
        shadows={!LOW_QUALITY}
      />
      <NatureBatch
        items={forest.pines}
        geometry={geometry.distantPine}
        name="MountainDistantConifers"
        distance={650}
        minimumDistance={150}
      />
      <NatureBatch
        items={forest.crowns}
        geometry={geometry.distantCrown}
        name="MountainDistantBroadleaf"
        distance={650}
        minimumDistance={150}
      />
      <NatureBatch
        items={forest.pines}
        geometry={geometry.pine}
        name="MountainConifers"
        distance={180}
        wind
        shadows={!LOW_QUALITY}
      />
      <NatureBatch
        items={forest.grass}
        geometry={geometry.grass}
        name="MountainGrass"
        distance={110}
        wind
      />
      <NatureBatch
        items={forest.ferns}
        geometry={geometry.fern}
        name="MountainFerns"
        distance={130}
      />
      <NatureBatch
        items={forest.rocks}
        geometry={geometry.rock}
        name="MountainBoulders"
        distance={180}
        surface="rock"
        shadows={!LOW_QUALITY}
      />
      <OutdoorBatch items={forest.moss} shape="foliage" shadows={false} />
    </group>
  );
}
