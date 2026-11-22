import test from "node:test";
import assert from "node:assert/strict";
import { PASSENGER_TYPES, rideRemark } from "../src/game/ojek/passenger.ts";

const type = (id) => PASSENGER_TYPES.find((p) => p.id === id);
const calm = { lastSpeed: 8, lastYaw: 0, slowFor: 0, quietUntil: 0 };

test("penakut complains about a hard brake, santai does not", () => {
  const brake = { speed: 1, yaw: 0 }; // 8 → 1 m/s in 0.5 s = 14 m/s²
  assert.ok(rideRemark(type("penakut"), calm, brake, false, 10_000).text);
  assert.equal(rideRemark(type("santai"), calm, brake, false, 10_000).text, null);
});

test("buru-buru complains after riding slowly for a while, then waits before nagging again", () => {
  let feel = { lastSpeed: 3, lastYaw: 0, slowFor: 0, quietUntil: 0 };
  let text = null;
  for (let i = 0; i < 8 && !text; i++)
    ({ feel, text } = rideRemark(type("buru"), feel, { speed: 3, yaw: 0 }, false, 10_000));
  assert.ok(text);
  assert.equal(rideRemark(type("buru"), feel, { speed: 1, yaw: 0 }, false, 11_000).text, null);
  // Slowing down at the destination is fine.
  const near = rideRemark(
    type("buru"),
    { ...feel, quietUntil: 0, slowFor: 10 },
    { speed: 1, yaw: 0 },
    true,
    20_000,
  );
  assert.equal(near.text, null);
});

test("a sharp turn at speed counts as ngawur", () => {
  const turn = rideRemark(
    type("cerewet"),
    { ...calm, lastSpeed: 9 },
    { speed: 9, yaw: 0.9 },
    false,
    10_000,
  );
  assert.ok(turn.text);
});
