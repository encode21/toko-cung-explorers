import test from "node:test";
import assert from "node:assert/strict";
import { deliveryPose } from "../src/game/warung/delivery-motion.ts";

test("delivery arrives, unloads, returns empty, and departs without position jumps", () => {
  const eta = 100000;
  assert.equal(deliveryPose(eta - 31000, eta, 7.7, 16.4).visible, false);
  assert.equal(deliveryPose(eta - 25000, eta, 7.7, 16.4).unloading, false);
  assert.equal(deliveryPose(eta - 15000, eta, 7.7, 16.4).truckX, 0);
  assert.equal(deliveryPose(eta - 13000, eta, 7.7, 16.4).carrying, false);
  assert.equal(deliveryPose(eta + 6000, eta, 7.7, 16.4).unloading, false);
  assert(deliveryPose(eta + 12000, eta, 7.7, 16.4).truckX > 0);
  assert.equal(deliveryPose(eta + 20000, eta, 7.7, 16.4).visible, false);
  for (const [door, road] of [
    [7.7, 16.4],
    [3.5, 10.2],
    [5, 8.4],
  ]) {
    let previous = deliveryPose(eta - 30000, eta, door, road);
    for (let now = eta - 30000 + 16; now < eta + 20000; now += 16) {
      const next = deliveryPose(now, eta, door, road);
      assert(Math.abs(next.truckX - previous.truckX) < 0.11);
      if (next.unloading && previous.unloading)
        assert(
          Math.hypot(next.porter.x - previous.porter.x, next.porter.z - previous.porter.z) < 0.05,
        );
      previous = next;
    }
  }
});
