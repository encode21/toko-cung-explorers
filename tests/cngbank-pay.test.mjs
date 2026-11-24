import test from "node:test";
import assert from "node:assert/strict";
import {
  isPayMethod,
  nextStep,
  pinComplete,
  pushPin,
  stepsFor,
} from "../src/ui/hud/cngbank-pay.ts";

test("every method goes method -> own screen -> pin -> receipt", () => {
  for (const m of ["qris", "transfer", "va"]) {
    assert.deepEqual(stepsFor(m), ["method", m, "pin", "receipt"]);
  }
  assert.equal(nextStep("qris", "method"), "qris");
  assert.equal(nextStep("va", "va"), "pin");
  assert.equal(nextStep("transfer", "pin"), "receipt");
  assert.equal(nextStep("transfer", "receipt"), "receipt");
});

test("pin completes at 6 digits and ignores extra taps", () => {
  let pin = "";
  for (const d of "12345") pin = pushPin(pin, d);
  assert.equal(pinComplete(pin), false);
  pin = pushPin(pin, "6");
  assert.equal(pinComplete(pin), true);
  assert.equal(pushPin(pin, "7"), "123456");
});

test("stored method is validated", () => {
  assert.equal(isPayMethod("qris"), true);
  assert.equal(isPayMethod("cash"), false);
  assert.equal(isPayMethod(null), false);
});
