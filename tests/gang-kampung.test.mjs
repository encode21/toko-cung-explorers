import test from "node:test";
import assert from "node:assert/strict";
import { kampungHouses, kaliBridges, KALI, PLAY_HALF } from "../src/game/gang/kampung-layout.ts";

test("kampung houses stay outside the walkable gang and off the kali, same per gang", () => {
  const a = kampungHouses(3, -15, 130);
  assert.deepEqual(a, kampungHouses(3, -15, 130));
  assert.notDeepEqual(a, kampungHouses(4, -15, 130));
  assert.ok(a.length > 40);
  for (const h of a) {
    assert.ok(Math.abs(h.x) - h.w / 2 > PLAY_HALF + 0.5, `inside play area: ${h.x}`);
    assert.ok(h.x - h.w / 2 > KALI.x1 || h.x + h.w / 2 < KALI.x0, `on the kali: ${h.x}`);
    assert.ok(h.z >= -15 && h.z <= 130);
  }
});
test("kali footbridges are spread along the gang", () => {
  const b = kaliBridges(-15, 130);
  assert.ok(b.length >= 3);
  assert.ok(b.every((z) => z > -15 && z < 130));
});
