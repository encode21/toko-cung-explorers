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

import {
  deliveryRoute,
  deliveryJourney,
  DELIVERY_DEPOT,
} from "../src/game/warung/delivery-route.ts";
test("delivery leaves Toko Cung, crosses both bridges, unloads and drives back to the depot", () => {
  for (const house of [1, 2, 9, 10]) {
    const route = deliveryRoute(house);
    const trip = {
      id: 1,
      warungId: 1,
      gang: 1,
      house,
      departAt: 1000,
      etaAt: 151000,
      returnAt: 286000,
    };
    const start = deliveryJourney(trip.departAt, trip, route);
    assert.deepEqual([start.area, start.x, start.z], ["city", DELIVERY_DEPOT.x, DELIVERY_DEPOT.z]);
    let previous = start,
      transfers = [],
      atHouse = false,
      returning = false;
    for (let t = trip.departAt + 16; t < trip.returnAt; t += 16) {
      const p = deliveryJourney(t, trip, route);
      if (p.area !== previous.area) transfers.push([previous.area, p.area, previous.z, p.z]);
      else assert(Math.hypot(p.x - previous.x, p.z - previous.z) < 0.2, "no same-scene teleport");
      if (p.unloading) {
        assert.equal(p.area, "gang");
        assert.equal(p.z, route.stop.z);
        atHouse = true;
      }
      if (t > trip.etaAt + 5000 && p.area === "city") returning = true;
      previous = p;
    }
    assert(atHouse && returning);
    assert.equal(transfers.length, 2);
    assert(transfers[0][2] < -199 && transfers[0][3] < -159);
    assert(transfers[1][2] < -159 && transfers[1][3] < -199);
    assert(Math.hypot(previous.x - DELIVERY_DEPOT.x, previous.z - DELIVERY_DEPOT.z) < 1e-8);
    assert.equal(deliveryJourney(trip.returnAt, trip, route).visible, false);
  }
});

test("convoy trucks park behind the first one and never have to pass it", async () => {
  const { deliveryRoute, deliveryJourney, TRUCK_SLOT_GAP } =
    await import("../src/game/warung/delivery-route.ts");
  const routes = [0, 1, 2].map((slot) => deliveryRoute(3, 24, 10, slot));
  for (const r of routes) assert.deepEqual(r.door, routes[0].door);
  assert.deepEqual(
    routes.map((r) => routes[0].stop.z - r.stop.z),
    [0, TRUCK_SLOT_GAP, 2 * TRUCK_SLOT_GAP],
  );
  // Each trip is parked at its own slot while unloading.
  const trip = (slot, eta) => ({
    id: slot,
    warungId: 1,
    gang: 1,
    house: 3,
    slot,
    departAt: eta - 150000,
    etaAt: eta,
    returnAt: eta + 135000,
  });
  routes.forEach((r, slot) => {
    const eta = 1_000_000 + slot * 10000;
    const pose = deliveryJourney(eta - 5000, trip(slot, eta), r);
    assert.equal(pose.z, r.stop.z);
    assert.equal(pose.parked, true);
  });
});
