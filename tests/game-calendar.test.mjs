import test from "node:test";
import assert from "node:assert/strict";
import { gameDate, gameDateStart, gameClock, GAME_HOUR_MS } from "../src/game/time/calendar.ts";
import { GAME_DAY_MS, worldMinutes } from "../src/game/time/model.ts";

test("game dates advance once per 48-minute game day and round-trip", () => {
  const start = gameDateStart("2026-01-31");
  assert.equal(gameDate(start), "2026-01-31");
  assert.equal(gameDate(start - 1), "2026-01-30");
  assert.equal(gameDate(start + GAME_DAY_MS), "2026-02-01");
  assert.equal(gameDate(Date.UTC(2026, 10, 23, 17)), "2026-01-01");
});

test("game clock matches the world clock used for the sky", () => {
  const t = gameDateStart("2026-03-10") + 14 * GAME_HOUR_MS + GAME_HOUR_MS / 2;
  assert.deepEqual(gameClock(t), { hour: 14, minute: 30 });
  const m = worldMinutes(t);
  assert.equal(Math.floor(m / 60), 14);
});
