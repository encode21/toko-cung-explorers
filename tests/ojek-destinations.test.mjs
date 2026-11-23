import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  BUILDING_LOTS,
  ROADS,
  SIDEWALKS,
  DRIVEWAYS,
  PARKING,
  PEDESTRIAN,
  buildingBounds,
  contains,
} from "../src/game/world/outdoor-layout.ts";
import { DISTRICTS, EXPANSION_DESTINATIONS } from "../src/game/world/expansion-plan.ts";

const backend =
  process.env.WORLD_QA_BACKEND ?? fileURLToPath(new URL("../../toko-cung", import.meta.url));
const config = JSON.parse(
  execFileSync(
    "php",
    ["-r", "function env($k,$v){return $v;} echo json_encode(require 'config/world-ojek.php');"],
    { cwd: backend, encoding: "utf8" },
  ),
);

test("every ojek stop is accessible and each pickup has a 100–200 m destination", () => {
  for (const spot of config.spots) {
    assert.ok(
      !BUILDING_LOTS.some((lot) => contains(buildingBounds(lot), spot)),
      `${spot.id}: inside a building`,
    );
    assert.ok(
      [...ROADS, ...SIDEWALKS, ...DRIVEWAYS, ...PARKING, ...PEDESTRIAN].some((area) =>
        contains(area, spot),
      ),
      `${spot.id}: outside street access`,
    );
    assert.ok(
      config.spots.some((other) => {
        const d = Math.round(Math.hypot(other.x - spot.x, other.z - spot.z));
        return d >= config.npc_min_trip_meters && d <= config.npc_max_trip_meters;
      }),
      `${spot.id}: no long trip`,
    );
  }
});

test("market, square and park stops match the rendered districts and map names", () => {
  for (const [id, venue, district] of [
    ["pasar-warga", "venue-market", "market"],
    ["alun-alun", "venue-square", "market"],
    ["taman", "venue-park", "park"],
  ]) {
    const stop = config.spots.find((s) => s.id === id);
    const destination = EXPANSION_DESTINATIONS.find((s) => s.id === venue);
    assert.equal(stop.name, destination.label);
    assert.ok(
      contains(
        DISTRICTS.find((s) => s.id === district),
        stop,
      ),
    );
    assert.ok(Math.hypot(stop.x - destination.position[0], stop.z - destination.position[2]) < 18);
  }
});
