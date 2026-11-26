import test from "node:test";
import assert from "node:assert/strict";
import {
  BENCH_SEATS,
  BENCHES,
  CITY_BENCHES,
  benchSitPose,
} from "../src/game/world/street-props.ts";
import { availableBenchSeat, benchSeatClaims } from "../src/game/world/bench-occupancy.ts";

const [left, right] = BENCH_SEATS.filter((seat) => seat.benchId === CITY_BENCHES[0].id);
const claim = (id, seat) => ({ id, seatId: seat.id });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8);

test("eight physical city benches have two side-by-side seats each", () => {
  const ids = new Set(BENCH_SEATS.map((seat) => seat.id));
  assert.equal(ids.size, BENCH_SEATS.length);
  assert.equal(CITY_BENCHES.length, 8);
  for (const bench of CITY_BENCHES) {
    assert.equal(BENCHES.filter((item) => item.id === bench.id).length, 1);
    const pair = BENCH_SEATS.filter((seat) => seat.benchId === bench.id);
    assert.equal(pair.length, 2);
    const [a, b] = pair;
    assert.equal(a.id, bench.id);
    assert.equal(b.id, bench.id + "-2");
    const first = benchSitPose(a),
      second = benchSitPose(b);
    close(second.x - first.x, 0.96 * Math.cos(bench.yaw));
    close(second.z - first.z, -0.96 * Math.sin(bench.yaw));
    assert.equal(first.y, second.y);
    assert.equal(first.yaw, second.yaw);
  }
  for (const seat of BENCHES.filter((item) => !CITY_BENCHES.includes(item))) {
    assert.ok(BENCH_SEATS.includes(seat), "venue seat identity stays unchanged");
  }
});

test("a stale prompt selects the other place or reports a full bench", () => {
  assert.equal(availableBenchSeat(left, benchSeatClaims([])), left);
  assert.equal(availableBenchSeat(right, benchSeatClaims([])), right);
  const one = benchSeatClaims([claim("A", left)]);
  assert.equal(availableBenchSeat(left, one), right);
  const full = benchSeatClaims([claim("A", left), claim("B", right)]);
  assert.equal(availableBenchSeat(left, full), undefined);
});

test("simultaneous seat claims converge regardless of message order", () => {
  assert.equal(availableBenchSeat(left, benchSeatClaims([claim("B", left)]), "A"), left);
  assert.equal(availableBenchSeat(left, benchSeatClaims([claim("A", left)]), "B"), right);
  for (const ids of [
    ["A", "B"],
    ["B", "A"],
  ]) {
    const others = ids.map((id) => claim(id, left));
    const claims = benchSeatClaims([...others, claim("C", right)]);
    assert.equal(claims.get(left.id).id, "A");
    assert.equal(availableBenchSeat(left, claims, "D"), undefined);
  }
});

test("old seated clients occupy one place and modern ground emotes occupy none", () => {
  const pose = benchSitPose(CITY_BENCHES[0]);
  const legacy = { ...pose, id: "old", anim: "Sit" };
  const claims = benchSeatClaims([legacy]);
  assert.equal(claims.size, 1);
  const occupied = claims.has(left.id) ? left : right;
  assert.notEqual(availableBenchSeat(occupied, claims, "A"), occupied);
  assert.equal(benchSeatClaims([{ ...legacy, seatId: null }]).size, 0);
  assert.equal(benchSeatClaims([{ ...legacy, y: 0.83 }]).size, 0);
  assert.equal(benchSeatClaims([{ ...legacy, anim: "Idle" }]).size, 0);
  assert.equal(benchSeatClaims([{ ...legacy, x: pose.x + 5 }]).size, 0);
});


test("Explorer fits the city slats while original venue and collectible poses stay unchanged", () => {
  for (const seat of BENCH_SEATS.filter((entry) => entry.benchId)) {
    const base = benchSitPose(seat);
    const explorer = benchSitPose(seat, "explorer");
    close(explorer.y - base.y, 0.14);
    close(explorer.x - base.x, 0.04 * Math.sin(seat.yaw));
    close(explorer.z - base.z, 0.04 * Math.cos(seat.yaw));
    close(explorer.y - 0.83 + 0.22, seat.position[1] + 0.51);
    assert.deepEqual(benchSitPose(seat, "base"), base);
  }
  for (const seat of BENCH_SEATS.filter((entry) => !entry.benchId)) {
    assert.deepEqual(benchSitPose(seat, "explorer"), benchSitPose(seat));
  }
});
