import test from "node:test";
import assert from "node:assert/strict";
import { stickDrive } from "../src/game/player/stick-drive.ts";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("stick up drives straight, gas follows push distance", () => {
  const s = stickDrive(0, -0.5);
  close(s.throttle, 0.5);
  close(s.steer, 0);
});

test("stick left alone drives forward while turning left", () => {
  const s = stickDrive(-1, 0);
  close(s.throttle, 1);
  close(s.steer, -1);
  const r = stickDrive(0.6, 0);
  close(r.throttle, 0.6);
  close(r.steer, 1);
});

test("diagonal is half steer at full gas", () => {
  const s = stickDrive(Math.SQRT1_2, -Math.SQRT1_2);
  close(s.throttle, 1);
  close(s.steer, 0.5);
});

test("down-sideways still turns forward at full lock", () => {
  const s = stickDrive(-0.8, 0.5);
  assert.ok(s.throttle > 0);
  close(s.steer, -1);
});

test("stick down means reverse", () => {
  const s = stickDrive(0, 1);
  close(s.throttle, -1);
  close(s.steer, 0);
  const d = stickDrive(-0.2, 0.9);
  assert.ok(d.throttle < 0 && d.steer < 0 && d.steer >= -1);
});

test("centered stick does nothing", () => {
  assert.deepEqual(stickDrive(0, 0), { throttle: 0, steer: 0 });
});
