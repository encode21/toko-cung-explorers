import test from "node:test";
import assert from "node:assert/strict";
import {
  createQuarrelState, punchDelay, punchLanded, quarrelAnim, quarrelLine, quarrelNear, quarrelRole,
  startPunch, stepQuarrel,
} from "../src/game/npc/quarrel.ts";

const ready = () => {
  const s = createQuarrelState();
  s.now = s.nextPunch;
  return s;
};
const run = (s, seconds) => {
  const seen = [];
  for (let i = 0; i < seconds * 10; i++) {
    stepQuarrel(s, 0.1);
    if (s.active) seen.push(s.active.phase);
  }
  return [...new Set(seen)];
};

test("no punch before the first 4 minutes", () => {
  const s = createQuarrelState();
  assert.equal(startPunch(s, "a", "b", 2, null), null);
});

test("sequence with breaker: charge, hit, getup, shouts, bubar", () => {
  const s = ready();
  const q = startPunch(s, "a", "b", 2, "c");
  assert.equal(q.kind, "punch");
  assert.deepEqual([quarrelAnim(q, 0), quarrelAnim(q, 1)], ["Run", "Idle"]);
  punchLanded(q);
  assert.deepEqual([quarrelAnim(q, 0), quarrelAnim(q, 1)], ["Hit", "Fall"]);
  assert.deepEqual(run(s, 30), ["FALL", "GETUP", "ARGUE", "BREAK"]);
  assert.equal(s.active, null);
  assert.equal(quarrelRole(q, "c"), 2);
  assert.equal(q.lines.at(-1).text, "Sudah, sudah! Bubar!");
});

test("charge times out into the fall; odd seed = victim flees", () => {
  const s = ready();
  const q = startPunch(s, "a", "b", 3, "c");
  assert.equal(q.breaker, null);
  assert.deepEqual(run(s, 30), ["CHARGE", "FALL", "GETUP", "ARGUE", "FLEE"]);
});

test("shout lines alternate victim then attacker", () => {
  const s = ready();
  const q = startPunch(s, "a", "b", 2, null);
  punchLanded(q);
  run(s, 2.5);
  assert.equal(quarrelLine(q).who, 1);
});

test("cooldown: next punch 4-7 minutes later, one active at a time", () => {
  const s = ready();
  assert.ok(startPunch(s, "a", "b", 2, null));
  assert.equal(startPunch(s, "c", "d", 2, null), null);
  run(s, 30);
  assert.equal(startPunch(s, "c", "d", 2, null), null);
  assert.ok(s.nextPunch - s.now > 200);
  assert.equal(punchDelay(0), 240);
  assert.equal(punchDelay(1), 420);
  s.now = s.nextPunch;
  assert.ok(startPunch(s, "c", "d", 2, null));
});

test("record range follows the aggressor", () => {
  const s = ready();
  assert.equal(quarrelNear(s, 0, 0, 20), false);
  startPunch(s, "a", "b", 2, null);
  s.at = [12, 16];
  assert.equal(quarrelNear(s, 0, 0, 20), true);
  assert.equal(quarrelNear(s, 0, 0, 19), false);
});
