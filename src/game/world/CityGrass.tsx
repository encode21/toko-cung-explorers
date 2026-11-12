/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { MountainNatureBatch } from "../mountain/MountainNatureBatch";
import { CITY_HELIPAD } from "../mountain/model";
import { LOW_QUALITY } from "../engine/quality";
import { coastDistance, BEACH_BOUNDS, FISHING_WATER_BOUNDS } from "../swimming/model";
import { OBBY_BOUNDS } from "../obby/model";
import { CITY_LAKE, DISTRICTS } from "./expansion-plan";
import { BUILDING_LOTS, buildingBounds, RESERVED, contains, rect } from "./outdoor-layout";
import { BENCHES } from "./street-props";
import type { OutdoorPart } from "./OutdoorBatch";
import { grassGeometry } from "./natural-grass-geometry";

const exclusions = [
  ...RESERVED,
  ...BUILDING_LOTS.map((lot) => buildingBounds(lot)),
  OBBY_BOUNDS,
  FISHING_WATER_BOUNDS,
  CITY_LAKE.bounds,
  // Expanded keep, helipad/boarding apron, fishing path and supplier booth.
  rect(35, 35.2, 16.5, 18),
  rect(CITY_HELIPAD.position[0] + 1.8, 49, 17, 14),
  rect(30.6, -34, 11.4, 2.4),
  rect(35, -35.5, 3.2, 3),
  rect(39.3, -33.3, 3, 2.6),
  rect(-14.5, 12.8, 4, 3),
  ...BENCHES.map((bench) => rect(bench.position[0], bench.position[2], 4, 3.5)),
  ...[88, 124].flatMap((x) => [70, 104].map((z) => rect(x, z, 4, 3))),
];

/** Seeded low meadow growth; all playable streets, forecourts and shores remain clear. */
function makeCityGrass() {
  let seed = 82471;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const items: OutdoorPart[] = [];
  const step = LOW_QUALITY ? 2.1 : 1.4;
  for (let z = -61; z < 130; z += step)
    for (let x = -61; x < 146; x += step) {
      const px = x + (random() - 0.5) * step,
        pz = z + (random() - 0.5) * step;
      const point = { x: px, z: pz };
      if (!contains(BEACH_BOUNDS, point) && !DISTRICTS.some((b) => contains(b, point))) continue;
      if (coastDistance(px, pz) > -3.5) continue;
      if (exclusions.some((bounds) => contains(bounds, point, -0.6))) continue;
      const patch =
        (Math.sin(px * 0.32 + pz * 0.15) + Math.cos(pz * 0.43 - px * 0.18)) * 0.25 + 0.5;
      if (random() > 0.42 + patch * 0.5) continue;
      const size = 0.5 + random() * 0.42;
      const district = DISTRICTS.some((bounds) => contains(bounds, point));
      items.push({
        p: [px, district ? -0.03 : -0.05, pz],
        s: [size, 0.18 + random() * 0.28, size],
        ry: random() * Math.PI * 2,
        color: ["#9cb969", "#73954c", "#8daa53", "#b3c87d", "#b4ab72"][items.length % 5]!,
      });
    }
  return items;
}

export function CityGrass() {
  const items = useMemo(makeCityGrass, []);
  const geometry = useMemo(grassGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <MountainNatureBatch
      name="CityMeadowGrass"
      items={items}
      geometry={geometry}
      distance={55}
      wind
    />
  );
}
