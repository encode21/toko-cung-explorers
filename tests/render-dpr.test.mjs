import test from "node:test";
import assert from "node:assert/strict";
import { renderDpr } from "../src/game/engine/quality.ts";

test("LOW is sharp by default and drops to 1 only when Auto marks it slow", () => {
  assert.deepEqual(renderDpr("LOW"), [0, 1.25]);
  assert.deepEqual(renderDpr("LOW", false), [0, 1]);
  assert.deepEqual(renderDpr("MEDIUM", false), [0, 1.25]);
  assert.deepEqual(renderDpr("HIGH", false), [0, 1.5]);
});
