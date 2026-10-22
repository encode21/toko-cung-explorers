import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/game/missions/model.ts", import.meta.url), "utf8");
const truckText = ts.transpileModule(await readFile(new URL("../src/game/missions/truck-model.ts", import.meta.url), "utf8"), {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const truckUrl = `data:text/javascript;base64,${Buffer.from(truckText).toString("base64")}`;
const truck = await import(truckUrl);
const { outputText } = ts.transpileModule(source.replace('"./truck-model"', JSON.stringify(truckUrl)), {
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
assert.equal(m.offers(events, s).length, 3);
assert.equal(
  m.offers(
    events.map((e) => ({ ...e, status: "STARTING" })),
    s,
  ).length,
  1,
);
const act = (state, action, id, time, pos, source = events) =>
  m.applyMissionAction(state, action, id, source, pos, time);
s = act(s, "accept", "store", now, null).session;
assert.equal(s.active.status, "ACCEPTED");
assert.ok(act(s, "accept", "warehouse", now, null).error);
assert.ok(act(s, "take", undefined, now + 1200, [-6.2, 0.83, -14.6]).error);
assert.ok(act(s, "scan", undefined, now + 1200, [0, 0.83, 12]).error);
for (let i = 1; i <= 5; i++) {
  s = act(s, "scan", undefined, now + i * 1200, [5.4, 0.83, -1]).session;
  if (i < 5) {
    assert.equal(s.active.progress, i);
    assert.ok(act(s, "scan", undefined, now + i * 1200 + 10, [5.4, 0.83, -1]).error);
  }
}
assert.equal(s.last.status, "COMPLETED");
assert.equal(s.contribution, 1);
assert.equal(s.active, null);
assert.ok(act(s, "accept", "store", now + 8000, null).error);
assert.ok(act(s, "scan", undefined, now + 9000, [5.4, 0.83, -1]).error);
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
assert.equal(m.offers([], m.emptySession()).length, 1);
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

// Manual delivery is staged: no shortcut or remote cargo completion.
let delivery = act(m.emptySession(), "accept", truck.TRUCK_SOURCE, now, [truck.TRUCK_PARCELS[0], .83, truck.TRUCK_PARCELS[2]]).session;
assert.ok(delivery.active.truck);
let time = now + 2000;
const step = (action, position) => {
  time += 1200;
  const result = act(delivery, action, undefined, time, position);
  assert.equal(result.error, undefined, action);
  delivery = result.session;
};
const positionFor = () => { const p = truck.truckObjective(delivery.active).position; return [p[0], .83, p[2]]; };
assert.ok(act(delivery, "board", undefined, time, [truck.TRUCK_PARCELS[0], .83, truck.TRUCK_PARCELS[2]]).error);
assert.ok(act(delivery, "take", undefined, time, [100, .83, 100]).error);
for (let n = 0; n < 3; n++) {
  step("take", positionFor());
  assert.ok(delivery.active.carrying);
  assert.ok(act(delivery, "take", undefined, time + 1200, positionFor()).error);
  step("load", positionFor());
  assert.equal(delivery.active.truck.loaded, n + 1);
  assert.equal(delivery.active.carrying, false);
}
step("board", positionFor());
let t = delivery.active.truck;
for (let i = 0; i < 20; i++) t = truck.advanceTruck(t, {throttle: 1, steer: 0, brake: false}, .05, () => false);
assert.ok(t.z > delivery.active.truck.z + 1);
assert.ok(t.speed <= 6);
assert.equal(truck.advanceTruck(t, {throttle: 1, steer: 0, brake: false}, .05, () => true).x, t.x);
delivery.active.truck = t;
assert.ok(act(delivery, "exit", undefined, time + 1200, [t.x, .83, t.z]).error, "cannot jump out while moving");
for (let i = 0; i < 30; i++) t = truck.advanceTruck(t, {throttle: 0, steer: 0, brake: true}, .05, () => false);
assert.equal(t.speed, 0);
delivery.active.truck = {...t, x: 0, z: -26}; // Arrival fixture; scene test exercises driving.
step("exit", positionFor());
for (let n = 0; n < 3; n++) {step("unload", positionFor()); step("place", positionFor());}
assert.equal(delivery.active, null);
assert.equal(delivery.last.status, "COMPLETED");
assert.equal(delivery.contribution, 1);
assert.ok(act(delivery, "place", undefined, time + 2000, [0, .83, -23.6]).error);
assert.equal(m.offers([], delivery).length, 0);
console.log("PASS truck: ordered loading, board, speed/braking, collision, stopped exit, dock-only unloading, three deliveries and reward once");

const legacy = {...m.emptySession(), active: {...delivery.last, status: "ACTIVE", carrying: true, expiresAt: time+100000, truck:{...truck.freshTruck(),x:8,z:12.5,yaw:Math.PI/2,loaded:1}}};
const relocated = m.reconcileMission(legacy,[],time);
assert.equal(relocated.active.truck.x,truck.TRUCK_START.x);
assert.equal(relocated.active.truck.loaded,1);
assert.equal(relocated.active.carrying,true);
assert.equal(m.reconcileMission(relocated,[],time),relocated,"layout recovery is idempotent");
const drivingLegacy={...legacy.active.truck,driver:"driver"};
assert.equal(truck.relocateLegacyTruck(drivingLegacy),drivingLegacy,"never relocate an occupied truck");
console.log("PASS legacy parked truck recovery preserves cargo and active drivers");
