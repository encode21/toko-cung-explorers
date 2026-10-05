import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILDING_LOTS,
  ROADS,
  SIDEWALKS,
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
