import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dueNotices,
  eventOpen,
  liveEvents,
  noticeKey,
  upcomingEvents,
  townEventStep,
  focusedActivity,
} from "../src/game/town-events/model.ts";

const ev = (host, status, hours) => ({ host, status, event: { key: `${host}-e`, hours } });
const ronda = ev("kades", "active", [20, 4]);
const senam = ev("walikota", "available", [6, 9]);
const bersih = ev("bu-sri", "active", undefined);
const all = [ronda, senam, bersih, ev("pak-rt", "done", [20, 4])];

test("tracking selects one accepted event or kuli and falls back only when it ends", () => {
  assert.equal(focusedActivity(all, true, null), "kuli");
  assert.equal(focusedActivity(all, true, "town:kades"), "town:kades");
  assert.equal(focusedActivity(all, true, "town:bu-sri"), "town:bu-sri");
  assert.equal(focusedActivity(all, false, "kuli"), "town:kades");
  assert.equal(focusedActivity(all, false, "town:pak-rt"), "town:kades");
  assert.equal(focusedActivity([], false, "town:kades"), null);
});

test("Pasar Murah guides pickup, each delivery, then reporting without retaining completed points", () => {
  const event = { name: "Pak Wali Kota", at: [26.8, 12.6], progress: [],
    event: { key: "pasar_murah", verb: "Antar sembako", points: [[90, 9], [95, 4.8], [107, 4.8], [101, 9.2]] } };
  assert.deepEqual(townEventStep(event), { point: 0, at: [90, 9], label: "Ambil sembako" });
  for (let point = 1; point < 4; point++) {
    event.progress.push(point - 1);
    assert.deepEqual(townEventStep(event), { point, at: event.event.points[point], label: "Antar sembako" });
  }
  event.progress.push(3);
  assert.deepEqual(townEventStep(event), { point: -1, at: event.at, label: "Lapor ke Pak Wali Kota" });
});

test("windows follow the server rule [from, to), wrapping midnight", () => {
  assert.equal(eventOpen([20, 4], 19), false);
  assert.equal(eventOpen([20, 4], 20), true);
  assert.equal(eventOpen([20, 4], 3), true);
  assert.equal(eventOpen([20, 4], 4), false);
  assert.equal(eventOpen([6, 9], 9), false);
  assert.equal(eventOpen(undefined, 12), true);
});

test("off-hours events are upcoming, not live in the world", () => {
  assert.deepEqual(upcomingEvents(all, 12), [ronda, senam]);
  assert.deepEqual(liveEvents(all, 12), [bersih]);
  assert.deepEqual(liveEvents(all, 21), [ronda, bersih]);
  assert.deepEqual(upcomingEvents(all, 21), [senam]);
});

test("start notice fires once per event per game day", () => {
  assert.deepEqual(dueNotices(all, 19, 7, []), []);
  assert.deepEqual(dueNotices(all, 20, 7, []), [ronda]);
  assert.deepEqual(dueNotices(all, 21, 7, [noticeKey(ronda, 7)]), []);
  assert.deepEqual(dueNotices(all, 20, 8, [noticeKey(ronda, 7)]), [ronda]);
});
