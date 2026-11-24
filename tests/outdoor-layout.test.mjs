import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILDING_LOTS,
  ROADS,
  SIDEWALKS,
  PEDESTRIAN,
  validateLots,
  buildingBounds,
  intersects,
  TRAFFIC_LANES,
  pathLength,
  samplePath,
} from "../src/game/world/outdoor-layout.ts";

test("all outdoor lots are separated from roads and pedestrian infrastructure", () => {
  assert.deepEqual(validateLots(), []);
  assert.ok(BUILDING_LOTS.length >= 10);
  for (const lot of BUILDING_LOTS) {
    const bounds = buildingBounds(lot);
    assert.equal(
      ROADS.some((road) => intersects(bounds, road)),
      false,
      `${lot.id} overlaps a road`,
    );
    assert.equal(
      SIDEWALKS.some((walk) => intersects(bounds, walk)),
      false,
      `${lot.id} overlaps a sidewalk`,
    );
  }
});

test("traffic paths have finite length and sample in their lane bounds", () => {
  for (const lane of TRAFFIC_LANES) {
    const length = pathLength(lane.points);
    assert.ok(length > 100);
    const start = samplePath(lane.points, 0);
    const middle = samplePath(lane.points, length / 2);
    assert.ok(Number.isFinite(start.x) && Number.isFinite(middle.z));
    assert.ok(Math.abs(start.z - lane.points[0].z) < 0.001);
  }
});

test("debtor hangout spots stand outside every building lot", async () => {
  const { DEBTOR_SPOTS } = await import("../src/game/warung/model.ts");
  for (const spot of DEBTOR_SPOTS)
    for (const lot of BUILDING_LOTS) {
      const b = buildingBounds(lot);
      const inside = spot.x >= b.minX && spot.x <= b.maxX && spot.z >= b.minZ && spot.z <= b.maxZ;
      assert.ok(!inside, `${spot.area} is inside ${lot.id}`);
    }
});

test("every lot door opens onto a clear spot near a street, sidewalk or pedestrian zone", () => {
  const near = (p, zone, d) =>
    p.x >= zone.minX - d && p.x <= zone.maxX + d && p.z >= zone.minZ - d && p.z <= zone.maxZ + d;
  for (const lot of BUILDING_LOTS) {
    const p = {
      x: lot.x + Math.sin(lot.rotation) * (lot.depth / 2 + 2),
      z: lot.z + Math.cos(lot.rotation) * (lot.depth / 2 + 2),
    };
    for (const other of BUILDING_LOTS)
      assert.equal(near(p, buildingBounds(other), 0), false, `${lot.id} door faces ${other.id}`);
    // Known: market-* open onto the market district interior, partner-6 onto the keep courtyard.
    if (/^(market-|partner-6$)/.test(lot.id)) continue;
    assert.ok(
      [...ROADS, ...SIDEWALKS, ...PEDESTRIAN].some((z) => near(p, z, 6)),
      `${lot.id} door is >6 m from any walkable surface`,
    );
  }
});
