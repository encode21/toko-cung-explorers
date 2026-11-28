import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../src/game/warung/disaster-alert.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
vm.runInNewContext(source, { exports });

test("each server disaster kind gets its own headline, unknown kinds a generic one", () => {
  assert.equal(exports.disasterTitle("gempa"), "Gempa bumi!");
  assert.equal(exports.disasterTitle("banjir"), "Banjir!");
  assert.equal(exports.disasterTitle("angin_kencang"), "Angin kencang!");
  assert.equal(exports.disasterTitle("korsleting"), "Korsleting listrik!");
  assert.equal(exports.disasterTitle("kebakaran"), "Kebakaran!");
  assert.equal(exports.disasterTitle("tsunami"), "Bencana!");
  assert.equal(exports.disasterTitle(undefined), "Bencana!");
});

test("an earthquake vibrates longer than other disasters", () => {
  const total = (p) => p.reduce((a, b) => a + b, 0);
  assert.ok(total(exports.vibrationPattern("gempa")) > total(exports.vibrationPattern("banjir")));
});

test("only a fire burns the card instead of shaking the screen", () => {
  assert.equal(exports.isFire("kebakaran"), true);
  assert.equal(exports.isFire("gempa"), false);
  assert.equal(exports.isFire(undefined), false);
});
