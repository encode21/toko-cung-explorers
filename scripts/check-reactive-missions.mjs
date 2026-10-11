import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/game/missions/model.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const m = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const now = 1_800_000_000_000;
const event = (type, id) => ({
  id,
  type,
  status: "ACTIVE",
  intensity: 1,
  startedAt: now,
  expiresAt: now + 300000,
  revision: 1,
  payload: {},
});
const events = [
  event("STORE_RUSH", "store"),
  event("WAREHOUSE_RUSH", "warehouse"),
  event("COURIER_PICKUP", "courier"),
];
let s = m.emptySession();
assert.equal(m.offers(events, s).length, 2);
assert.equal(
  m.offers(
    events.map((e) => ({ ...e, status: "STARTING" })),
    s,
  ).length,
  0,
);
const act = (state, action, id, time, pos, source = events) =>
  m.applyMissionAction(state, action, id, source, pos, time);
s = act(s, "accept", "store", now, null).session;
assert.equal(s.active.status, "ACCEPTED");
assert.ok(act(s, "accept", "warehouse", now, null).error);
assert.ok(act(s, "take", undefined, now + 1200, [-6.2, 0.83, -14.6]).error);
assert.ok(act(s, "scan", undefined, now + 1200, [0, 0.83, 12]).error);
for (let i = 1; i <= 5; i++) {
  s = act(s, "scan", undefined, now + i * 1200, [4.8, 0.83, 2.3]).session;
  if (i < 5) {
    assert.equal(s.active.progress, i);
    assert.ok(act(s, "scan", undefined, now + i * 1200 + 10, [4.8, 0.83, 2.3]).error);
  }
}
assert.equal(s.last.status, "COMPLETED");
assert.equal(s.contribution, 1);
assert.equal(s.active, null);
assert.ok(act(s, "accept", "store", now + 8000, null).error);
assert.ok(act(s, "scan", undefined, now + 9000, [4.8, 0.83, 2.3]).error);
assert.equal(s.contribution, 1);
s = act(s, "accept", "warehouse", now + 10000, null).session;
for (let i = 0; i < 3; i++) {
  const time = now + 12000 + i * 5000;
  assert.ok(act(s, "place", undefined, time, [-3.6, 0.83, -14.4]).error);
  s = act(s, "take", undefined, time, [-6.2, 0.83, -14.6]).session;
  assert.equal(s.active.carrying, true);
  assert.equal(s.active.progress, i);
  assert.ok(act(s, "take", undefined, time + 1200, [-6.2, 0.83, -14.6]).error);
  assert.ok(act(s, "place", undefined, time + 1200, [-6.2, 0.83, -14.6]).error);
  s = act(s, "place", undefined, time + 2400, [-3.6, 0.83, -14.4]).session;
}
assert.equal(s.contribution, 2);
assert.equal(s.last.progress, 3);
assert.equal(s.last.carrying, false);
let accepted = act(m.emptySession(), "accept", "warehouse", now, null).session;
accepted = act(accepted, "take", undefined, now + 2000, [-6.2, 0.83, -14.6]).session;
const cancelled = act(accepted, "cancel", undefined, now + 3000, null).session;
assert.equal(cancelled.active, null);
assert.equal(cancelled.last.carrying, false);
assert.equal(cancelled.last.status, "CANCELLED");
assert.equal(cancelled.contribution, 0);
const endedAt = now + 10000;
let grace = m.reconcileMission(accepted, [], endedAt);
assert.equal(grace.active.expiresAt, endedAt + m.GRACE_MS);
assert.equal(m.offers([], m.emptySession()).length, 0);
assert.equal(m.reconcileMission(grace, [], endedAt + 119999).active.carrying, true);
const expired = m.reconcileMission(grace, [], endedAt + 120001);
assert.equal(expired.last.status, "EXPIRED");
assert.equal(expired.last.carrying, false);
const restored = JSON.parse(JSON.stringify(grace));
assert.equal(
  m.reconcileMission(restored, [], endedAt + 60000).active.expiresAt,
  grace.active.expiresAt,
  "refresh cannot renew grace",
);
assert.equal(m.emptySession().contribution, 0, "another player remains independent");
console.log(
  "PASS missions: offers, one-active rule, proximity, cooldown, 5 scans, 3 pickup/drop cycles, reward once, cancel, expiry/grace and checkpoint recovery",
);
