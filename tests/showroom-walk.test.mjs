import test from "node:test";
import assert from "node:assert/strict";
import { showroomWalkStep } from "../src/game/showroom/layout.ts";

test("door walk keeps walking until it reaches the doorway", () => {
  assert.equal(showroomWalkStep(1.8, false), "walk");
  assert.equal(showroomWalkStep(0.05, false), "arrive");
});

test("blocked in the doorway when time runs out still passes through", () => {
  assert.equal(showroomWalkStep(0.6, true), "arrive");
  assert.equal(showroomWalkStep(1, true), "arrive");
});

test("still far from the door when time runs out fails", () => {
  assert.equal(showroomWalkStep(1.6, true), "fail");
});
