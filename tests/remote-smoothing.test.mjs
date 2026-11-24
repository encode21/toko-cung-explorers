import test from "node:test";
import assert from "node:assert/strict";
import { remoteRenderPose, pruneRenderPoses } from "../src/game/mobility/render-pose.ts";

// A peer walking +x at 4 m/s, packets every 6-9 frames (real network jitter), rendered at 60fps:
// per-frame steps must stay even.
test("remote pose moves at a steady pace between 8Hz packets", () => {
  pruneRenderPoses([]);
  const dt = 1 / 60;
  let target = { x: 0, y: 0.83, z: 0, ry: 0 };
  let prev = null;
  const steps = [];
  for (let f = 0; f < 180; f++) {
    const t = f * dt;
    if (f % 15 === 0 || f % 15 === 9) target = { ...target, x: Math.round(t * 4 * 100) / 100 };
    const p = remoteRenderPose("peer", target, t, dt);
    if (prev !== null && f > 40) steps.push(p.x - prev);
    prev = p.x;
  }
  const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
  assert.ok(Math.abs(mean - 4 * dt) < 0.01, `mean step ${mean}`);
  for (const s of steps) assert.ok(s > mean * 0.5 && s < mean * 1.5, `uneven step ${s} vs mean ${mean}`);
});

test("large jumps snap instead of sliding", () => {
  pruneRenderPoses([]);
  remoteRenderPose("tp", { x: 0, y: 0, z: 0, ry: 0 }, 0, 1 / 60);
  remoteRenderPose("tp", { x: 0, y: 0, z: 0, ry: 0 }, 1 / 60, 1 / 60);
  const p = remoteRenderPose("tp", { x: 50, y: 0, z: 0, ry: 0 }, 2 / 60, 1 / 60);
  assert.equal(p.x, 50);
});
