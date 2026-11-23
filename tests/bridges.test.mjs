import test from "node:test";
import assert from "node:assert/strict";
import { CITY_BRIDGES, GANG_BRIDGE_LENGTH, bridgeParts } from "../src/game/world/bridges.ts";
import { ROAD_SEGMENTS } from "../src/game/world/outdoor-layout.ts";
import { coastDistance } from "../src/game/swimming/model.ts";

test("all four coastal road ends have connected bridges through the horizon road ends", () => {
  assert.equal(CITY_BRIDGES.length, 4);
  for (const b of CITY_BRIDGES) {
    const [x, , z] = b.position;
    assert.equal(coastDistance(x, z), 0);
    const end = [x + Math.sin(b.yaw) * b.length, z + Math.cos(b.yaw) * b.length];
    assert(
      ROAD_SEGMENTS.some(
        (r) =>
          Math.abs(end[0] - r.x) <= (r.axis === "x" ? r.length / 2 : r.width / 2) + 1e-6 &&
          Math.abs(end[1] - r.z) <= (r.axis === "z" ? r.length / 2 : r.width / 2) + 1e-6,
      ),
    );
    assert(Math.abs(Math.max(Math.abs(end[0]), Math.abs(end[1])) - 300) < 1e-6);
  }
});
test("bridge masonry supports the road and leaves lanes and walkways clear", () => {
  for (const length of [...CITY_BRIDGES.map((b) => b.length), GANG_BRIDGE_LENGTH]) {
    const { stone, iron } = bridgeParts(length);
    assert(stone.every((p) => p.p.every(Number.isFinite) && p.s.every((v) => v > 0)));
    assert(iron.every((p) => p.p.every(Number.isFinite) && p.s.every((v) => v > 0)));
    assert(
      stone.some((p) => p.p[1] - p.s[1] / 2 <= -5),
      "piers reach below city and Gang seabeds",
    );
    for (const part of stone) {
      const crossesPath = Math.abs(part.p[0]) - part.s[0] / 2 < 5.2;
      if (crossesPath)
        assert(
          part.p[1] + part.s[1] / 2 < 0 || part.p[1] - part.s[1] / 2 > 6,
          "cars, trucks and pedestrians fit under the towers",
        );
    }
  }
});
