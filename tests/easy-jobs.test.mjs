import test from "node:test";
import assert from "node:assert/strict";
import {
  FRUIT_REGROW_MS,
  treeReady,
  fishPrice,
  kuliStart,
  kuliDrop,
  kuliTarget,
  kuliExpired,
  KULI_DELIVERIES,
  KULI_PAY,
  KULI_BONUS,
  KULI_TIME_MS,
  KULI_STALLS,
  gangHasEmpang,
  EMPANG_LOCAL,
  FRUIT_TREES,
  FRUIT_STALL,
  FISH_STALL,
  KULI_TRUCK,
} from "../src/game/easyjobs/model.ts";
import { BUILDING_LOTS, buildingBounds, contains } from "../src/game/world/outdoor-layout.ts";

test("fruit regrows only after the cooldown", () => {
  assert.equal(treeReady(undefined, 5), true);
  assert.equal(treeReady(1000, 1000 + FRUIT_REGROW_MS - 1), false);
  assert.equal(treeReady(1000, 1000 + FRUIT_REGROW_MS), true);
});

test("fish price grows with tier and size, never negative", () => {
  assert.ok(fishPrice("Rare", 30) > fishPrice("Basic", 30));
  assert.ok(fishPrice("Basic", 60) > fishPrice("Basic", 10));
  assert.equal(fishPrice("Basic", 500), fishPrice("Basic", 100));
  assert.equal(fishPrice("Basic", 20) % 100, 0);
});

test("kuli job runs the stalls in order, pays per delivery plus a final bonus", () => {
  let job = kuliStart(0),
    total = 0;
  for (let i = 0; i < KULI_DELIVERIES; i++) {
    assert.deepEqual(kuliTarget(job), KULI_STALLS[i % KULI_STALLS.length]);
    const r = kuliDrop(job);
    total += r.pay;
    job = r.job;
    if (i < KULI_DELIVERIES - 1) assert.equal(r.pay, KULI_PAY);
  }
  assert.equal(job, null);
  assert.equal(total, KULI_PAY * KULI_DELIVERIES + KULI_BONUS);
  assert.equal(kuliExpired(kuliStart(0), KULI_TIME_MS), false);
  assert.equal(kuliExpired(kuliStart(0), KULI_TIME_MS + 1), true);
});

test("empang rule is deterministic, only some gangs, none for temporary gangs", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(gangHasEmpang), [false, false, true, false, false, true]);
  assert.equal(gangHasEmpang(-3), false);
  assert.equal(gangHasEmpang(9), gangHasEmpang(9));
});

test("easy-job props stay clear of building lots", () => {
  const points = [
    ...FRUIT_TREES.map((t) => ({ x: t.x, z: t.z })),
    ...[FRUIT_STALL, FISH_STALL, KULI_TRUCK, ...KULI_STALLS].map((p) => ({ x: p[0], z: p[2] })),
  ];
  for (const p of points)
    for (const lot of BUILDING_LOTS)
      assert.equal(contains(buildingBounds(lot), p, -1.5), false, `${JSON.stringify(p)} vs ${lot.id}`);
});

test("empang sits between the lane gate and the first houses", () => {
  assert.ok(EMPANG_LOCAL.z + EMPANG_LOCAL.rz + 0.8 < 3);
  assert.ok(EMPANG_LOCAL.x - EMPANG_LOCAL.rx > 8);
});
