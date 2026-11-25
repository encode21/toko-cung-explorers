import test from "node:test";
import assert from "node:assert/strict";
import { halteCameraCeiling } from "../src/game/world/halte-camera.ts";
import { HALTE, JPO, MARKET_HALTE } from "../src/game/world/halte-jpo.ts";

test("halts switch to a low camera only at pedestrian floor level", () => {
  for (const [x, z, roof] of [
    [HALTE.x, HALTE.z, 3.05],
    [MARKET_HALTE.x, MARKET_HALTE.z, 2.6],
    [-36.5, -47, 2.6],
  ]) {
    assert.equal(halteCameraCeiling({ x, y: 1, z }), roof);
    assert.equal(halteCameraCeiling({ x, y: roof + 0.83, z }), null);
  }
  assert.equal(halteCameraCeiling({ x: 5994.5, y: 1, z: 2993 }, [6000, 0, 3000]), 2.6);
  assert.equal(halteCameraCeiling({ x: HALTE.x, y: 1, z: HALTE.z }, [6000, 0, 3000]), null);
});
test("JPO camera follows the elevated deck and both ramps, never the road below", () => {
  assert.equal(halteCameraCeiling({ x: JPO.x, y: JPO.height + 0.83, z: 20 }), 7.55);
  assert.equal(halteCameraCeiling({ x: JPO.x, y: 0.83, z: 20 }), null);
  for (const [side, z] of [
    [1, JPO.southZ],
    [-1, JPO.northZ],
  ]) {
    for (let along = 0; along <= JPO.run; along += 0.5) {
      const foot = JPO.height * (1 - along / JPO.run);
      const roof = halteCameraCeiling({
        x: JPO.x + side * (JPO.width / 2 + along),
        y: foot + 0.83,
        z,
      });
      assert(roof !== null && roof > foot + 2.2, `stairs ${side} at ${along}`);
    }
  }
  assert.equal(halteCameraCeiling({ x: 45, y: 0.83, z: 22 }), null);
});
