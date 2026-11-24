import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey, questMarkerState } from "../src/game/npc/quest-marker.ts";

const base = { available: true, hasQuests: true, skippedOn: "", today: "2026-11-24" };

test("marker shows ! while a quest is available", () => {
  assert.equal(questMarkerState(base), "available");
});
test("accepted: no quest left to offer but quests exist", () => {
  assert.equal(questMarkerState({ ...base, available: false }), "accepted");
  assert.equal(questMarkerState({ ...base, available: false, hasQuests: false }), "none");
});
test("skipped today hides the !, next day resets it", () => {
  const skipped = { ...base, skippedOn: "2026-11-24" };
  assert.equal(questMarkerState(skipped), "skipped");
  assert.equal(questMarkerState({ ...skipped, today: "2026-11-25" }), "available");
});
test("dayKey is a zero-padded local date", () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
});
