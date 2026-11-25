import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dueNotices,
  eventOpen,
  liveEvents,
  noticeKey,
  upcomingEvents,
} from "../src/game/town-events/model.ts";

const ev = (host, status, hours) => ({ host, status, event: { key: `${host}-e`, hours } });
const ronda = ev("kades", "active", [20, 4]);
const senam = ev("walikota", "available", [6, 9]);
const bersih = ev("bu-sri", "active", undefined);
const all = [ronda, senam, bersih, ev("pak-rt", "done", [20, 4])];

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
