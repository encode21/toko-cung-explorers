import { publicBikeCount } from "../src/game/mobility/model.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  CITY_HALL,
  CITY_HALL_TERRACE,
  MAYOR_POSITION,
  COASTAL_PARKING,
  PARKING_BAYS,
  cityHallArchitecture,
} from "../src/game/world/civic-layout.ts";
import { MOSQUE_TERRACE } from "../src/game/world/mosque-layout.ts";
import { CITY_LAKE } from "../src/game/world/expansion-plan.ts";
import {
  BUILDING_LOTS,
  DRIVEWAYS,
  PARKING,
  ROADS,
  SIDEWALKS,
  buildingBounds,
  intersects,
  contains,
  rect,
} from "../src/game/world/outdoor-layout.ts";
import { CITY_BENCHES, TREE_SPOTS } from "../src/game/world/street-props.ts";

test("six personal vehicle bays fit beside the park with a clear driving aisle and two road entries", () => {
  assert.equal(PARKING.find((p) => p.id === "park-parking").minX, COASTAL_PARKING.minX);
  assert.equal(PARKING_BAYS.length, 6);
  assert.equal(intersects(COASTAL_PARKING, CITY_LAKE.bounds), false);
  for (const { x, z } of PARKING_BAYS) {
    const car = rect(x, z, 5.2, 2.6); // Longest personal cars, turned east into the bays.
    assert(contains(COASTAL_PARKING, { x: car.minX, z: car.minZ }));
    assert(contains(COASTAL_PARKING, { x: car.maxX, z: car.maxZ }));
    for (const obstacle of [...ROADS, ...BUILDING_LOTS.map((l) => buildingBounds(l))])
      assert.equal(intersects(car, obstacle), false);
  }
  for (const z of [92, 112]) {
    const entry = DRIVEWAYS.find((d) => d.id === `coastal-parking-${z}`);
    assert(ROADS.some((r) => intersects(r, entry)));
    assert(intersects(COASTAL_PARKING, entry));
    assert(!SIDEWALKS.some((w) => contains(w, { x: 76, z })), "curb opens at driveway");
  }
  for (const [x, z] of [
    ...TREE_SPOTS.map((t) => [t.x, t.z]),
    ...CITY_BENCHES.map((b) => [b.position[0], b.position[2]]),
  ])
    assert(!contains(COASTAL_PARKING, { x, z }), "parking remains clear of furniture");
});
test("city hall sits beside the mosque with an accessible mayor on its forecourt", () => {
  assert(!intersects(CITY_HALL_TERRACE.bounds, MOSQUE_TERRACE.bounds));
  assert(CITY_HALL_TERRACE.bounds.minX > MOSQUE_TERRACE.bounds.maxX);
  const lot = BUILDING_LOTS.find((l) => l.id === "city-hall");
  assert.equal(lot.rotation, Math.PI);
  const [x, y, z] = MAYOR_POSITION;
  assert(contains(CITY_HALL_TERRACE.bounds, { x, z }));
  assert(!contains(buildingBounds(lot), { x, z }));
  assert.equal(y, 0.06);
  assert(SIDEWALKS.some((w) => contains(w, { x, z: 125.1 })));
  const parts = cityHallArchitecture();
  for (const p of [...parts.masonry, ...parts.trim, ...parts.glazing]) {
    assert(
      contains(CITY_HALL_TERRACE.bounds, {
        x: CITY_HALL.x + p.p[0] - p.s[0] / 2,
        z: CITY_HALL.z + p.p[2] - p.s[2] / 2,
      }),
    );
    assert(
      contains(CITY_HALL_TERRACE.bounds, {
        x: CITY_HALL.x + p.p[0] + p.s[0] / 2,
        z: CITY_HALL.z + p.p[2] + p.s[2] / 2,
      }),
    );
  }
  assert(parts.masonry.length + parts.trim.length + parts.glazing.length < 150);
});

test("owned vehicles and retiring cars do not fill the public ojek pool", () => {
  const bikes = [{ model: "scooter" }, { model: "motorcycle" }];
  const privateVehicles = [
    { model: "scooter", personal: true },
    { model: "car", personal: true },
  ];
  assert.equal(publicBikeCount(privateVehicles), 0);
  assert.equal(publicBikeCount([...privateVehicles, { model: "car" }, bikes[0]]), 1);
  assert.equal(publicBikeCount([...privateVehicles, ...bikes]), 2);
});
