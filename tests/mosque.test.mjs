import test from "node:test";
import assert from "node:assert/strict";
import { MOSQUE, mosqueArchitecture } from "../src/game/world/mosque-layout.ts";
import { TREE_SPOTS } from "../src/game/world/street-props.ts";
import {
  BUILDING_LOTS,
  ROADS,
  SIDEWALKS,
  buildingBounds,
  intersects,
  rect,
} from "../src/game/world/outdoor-layout.ts";

test("mosque occupies the former Principal parcel without crossing a sidewalk or another building", () => {
  assert.deepEqual(MOSQUE.position, [35, 0, 35]);
  assert.equal(MOSQUE.rotation, Math.PI);
  for (const zone of [...ROADS, ...SIDEWALKS])
    assert.equal(intersects(MOSQUE.bounds, zone), false, zone.id);
  for (const lot of BUILDING_LOTS.filter((l) => l.id !== "partner-4"))
    assert.equal(intersects(MOSQUE.bounds, buildingBounds(lot)), false, lot.id);
  const parts = mosqueArchitecture();
  for (const part of [...parts.masonry, ...parts.trim, ...parts.glazing]) {
    const b = rect(35 - part.p[0], 35 - part.p[2], part.s[0], part.s[2]);
    assert(b.minX >= MOSQUE.bounds.minX && b.maxX <= MOSQUE.bounds.maxX);
    assert(b.minZ >= MOSQUE.bounds.minZ && b.maxZ <= MOSQUE.bounds.maxZ);
  }
  assert(
    parts.masonry.length + parts.trim.length + parts.glazing.length < 200,
    "bounded instance budget",
  );
});
test("courtyard approach is clear at player height while hall and minaret are solid", () => {
  assert.equal(
    TREE_SPOTS.some((t) => Math.abs(t.x - 35) < 2 && t.z > 26 && t.z < 30),
    false,
  );
  const { colliders } = mosqueArchitecture();
  const blocked = (x, z) =>
    colliders.some(
      ({ p, s }) =>
        1 >= p[1] - s[1] / 2 &&
        1 <= p[1] + s[1] / 2 &&
        Math.abs(x - p[0]) < s[0] / 2 + 0.33 &&
        Math.abs(z - p[2]) < s[2] / 2 + 0.33,
    );
  for (let z = 3; z <= 6.5; z += 0.25)
    for (const x of [-0.6, 0, 0.6]) assert.equal(blocked(x, z), false);
  assert.equal(blocked(0, 0), true);
  assert.equal(blocked(-5.05, 4.9), true);
  const plinth = colliders[0];
  assert.equal(plinth.p[1] + plinth.s[1] / 2, 0.24);
});
