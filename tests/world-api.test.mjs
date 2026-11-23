import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const source = readFileSync(
  new URL("../src/services/world/api.functions.ts", import.meta.url),
  "utf8",
);
let validate, handle;
const calls = [];
const gateway = {
  assertOrigin() {},
  accountToken: () => "fixture-account",
  backend: (...args) => {
    calls.push(args);
    return { ok: true, value: { enabled: true } };
  },
};
vm.runInNewContext(
  ts.transpileModule(source.replace(/^import .*;$/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
  {
    exports: {},
    z,
    require: (path) => {
      assert.equal(path, "./gateway.server");
      return gateway;
    },
    createServerFn: () => ({
      inputValidator(fn) {
        validate = fn;
        return {
          handler(fn) {
            handle = fn;
          },
        };
      },
    }),
  },
);
test("prolog passes the server validator and reaches its authenticated backend route", async () => {
  const data = validate({ operation: "prolog", data: { action: "state", requestId: "fixture" } });
  assert.equal((await handle({ data })).ok, true);
  assert.deepEqual(calls[0], ["prolog", "POST", data.data]);
});
test("every client operation is accepted, while unknown operations remain rejected", () => {
  const contracts = readFileSync(
    new URL("../src/services/world/contracts.ts", import.meta.url),
    "utf8",
  );
  const operations = contracts
    .split("export type WorldOperation =")[1]
    .split(";")[0]
    .matchAll(/"([^"]+)"/g);
  for (const [, operation] of operations) assert.doesNotThrow(() => validate({ operation }));
  assert.throws(() => validate({ operation: "not-a-world-route" }));
});
