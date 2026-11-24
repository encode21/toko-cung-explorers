import test from "node:test";
import assert from "node:assert/strict";
import {
  BUMP_DIST, QUARREL_COOLDOWN, createQuarrelState, quarrelAnim, quarrelLine, quarrelRole,
  startQuarrel, stepQuarrel,
} from "../src/game/npc/quarrel.ts";

const run = (s, seconds) => {
  const seen = [];
  for (let i = 0; i < seconds * 10; i++) {
    stepQuarrel(s, 0.1);
    if (s.active) seen.push(`${s.active.phase}`);
  }
  return seen;
};

test("bump contact radius is tight", () => {
  assert.ok(BUMP_DIST <= 0.9);
});

test("sequence: fall, get up, 2-3 alternating lines, apology, then resume", () => {
  const s = createQuarrelState();
  const q = startQuarrel(s, "a", "b", 1);
  assert.equal(q.phase, "FALL");
  assert.deepEqual([quarrelAnim(q, 0), quarrelAnim(q, 1)], ["Hit", "Fall"]);
  assert.equal(quarrelLine(q), null);
  const phases = [...new Set(run(s, 30))];
  assert.deepEqual(phases, ["FALL", "GETUP", "ARGUE", "SORRY"]);
  assert.equal(s.active, null);
  const argue = q.lines.slice(0, -1);
  assert.ok(argue.length >= 2 && argue.length <= 3);
  argue.forEach((l, i) => assert.equal(l.who, i % 2));
  assert.match(q.lines.at(-1).text, /maaf/i);
});

test("player bump: NPC speaks alone", () => {
  const s = createQuarrelState();
  const q = startQuarrel(s, "a", null, 2);
  assert.ok(q.lines.every((l) => l.who === 0));
  assert.equal(quarrelRole(q, "a"), 0);
  assert.equal(quarrelRole(q, "zzz"), null);
});

test("only one active quarrel globally", () => {
  const s = createQuarrelState();
  assert.ok(startQuarrel(s, "a", "b", 1));
  assert.equal(startQuarrel(s, "c", "d", 1), null);
});

test("3-minute cooldown per NPC", () => {
  const s = createQuarrelState();
  startQuarrel(s, "a", "b", 1);
  run(s, 30);
  assert.equal(startQuarrel(s, "a", "c", 1), null);
  assert.equal(startQuarrel(s, "c", "b", 1), null);
  assert.ok(startQuarrel(s, "c", "d", 1));
  run(s, 30);
  run(s, QUARREL_COOLDOWN);
  assert.ok(startQuarrel(s, "a", "b", 1));
});
