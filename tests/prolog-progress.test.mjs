import assert from "node:assert/strict";
import test from "node:test";
import { prologProgress } from "../src/game/prolog/progress.ts";

const state = (version, step, overrides = {}) => ({
  enabled: true,
  version,
  step,
  completedAt: null,
  ...overrides,
});

test("Pulang progress follows the current server step on fresh and resumed sessions", () => {
  const steps = [
    "wake",
    "window",
    "box",
    "phone",
    "gang",
    "reveal",
    "map",
    "koko",
    "path",
    "goal",
    "return",
    "sleep",
  ];
  steps.forEach((step, completed) =>
    assert.deepEqual(prologProgress(state(2, step)), {
      current: completed + 1,
      completed,
      total: 12,
    }),
  );
  assert.deepEqual(prologProgress(state(2, "done")), { current: 12, completed: 12, total: 12 });
});

test("Titipan Mbah counts its own steps and treats either starting path as one step", () => {
  assert.deepEqual(prologProgress(state(1, "meet")), { current: 1, completed: 0, total: 7 });
  for (const path of ["dagang", "jalanan"]) {
    assert.deepEqual(prologProgress(state(1, "goal", { path })), {
      current: 6,
      completed: 5,
      total: 7,
    });
  }
  assert.deepEqual(prologProgress(state(1, "finish")), { current: 7, completed: 6, total: 7 });
  assert.deepEqual(prologProgress(state(1, "done")), { current: 7, completed: 7, total: 7 });
});

test("unknown, disabled and exempt prolog snapshots have no step count", () => {
  for (const data of [
    null,
    { enabled: false },
    state(1, "legacy", { completedAt: "done" }),
    state(2, "meet"),
    state(3, "wake"),
  ]) {
    assert.equal(prologProgress(data), null);
  }
});
