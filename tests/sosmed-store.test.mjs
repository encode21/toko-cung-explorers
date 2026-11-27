import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import { MAX_FRAMES, MAX_TEXT, mergeRows } from "../src/game/sosmed/sosmed.ts";

const source = readFileSync(new URL("../src/game/sosmed/store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
class WorldApiError extends Error {
  constructor(status, message = "Rejected") {
    super(message);
    this.status = status;
  }
}
const empty = { posts: [], counts: [], hasMore: false };
function setup(request) {
  const exports = {};
  let now = 1_000_000;
  vm.runInNewContext(compiled, {
    exports,
    create,
    WorldApiError,
    worldRequest: request,
    Date: { now: () => now },
    MAX_FRAMES,
    MAX_TEXT,
    mergeRows,
    useProfile: create(() => ({ profile: { id: "player-a" } })),
    createId: () => "request",
  });
  exports.useSosmed.getState().bind("player-a");
  return {
    ...exports,
    advance: (ms) => {
      now += ms;
    },
  };
}
test("automatic feed refresh waits a minute, deduplicates focus events, and permits manual refresh", async () => {
  let calls = 0;
  const s = setup(async () => {
    calls++;
    return empty;
  });
  const read = s.useSosmed.getState().read;
  await read("initial");
  for (let i = 0; i < 59; i++) {
    s.advance(1000);
    await read("poll");
  }
  assert.equal(calls, 1);
  s.advance(1000);
  await Promise.all([read("poll"), read("poll"), read("poll")]);
  assert.equal(calls, 2);
  await read("new");
  assert.equal(calls, 3);
  await read("poll");
  assert.equal(calls, 3);
});
test("429 backs off all CungGram requests for 1, 2, 4 then 5 minutes and resets after success", async () => {
  let calls = 0,
    reject = true;
  const s = setup(async () => {
    calls++;
    if (reject) throw new WorldApiError(429);
    return empty;
  });
  for (const delay of [60_000, 120_000, 240_000, 300_000, 300_000]) {
    await assert.rejects(s.sosmedRequest("read"), { status: 429 });
    const before = calls;
    s.advance(delay - 1);
    await assert.rejects(s.sosmedRequest("comments"), { status: 429 });
    await s.useSosmed.getState().read("poll");
    assert.equal(calls, before);
    s.advance(1);
  }
  reject = false;
  await s.sosmedRequest("read");
  reject = true;
  await assert.rejects(s.sosmedRequest("read"), { status: 429 });
  s.advance(60_000);
  reject = false;
  await s.sosmedRequest("read");
});
test("another account does not inherit a stale response or its rate limit", async () => {
  let finish;
  const s = setup(
    () =>
      new Promise((_, reject) => {
        finish = reject;
      }),
  );
  const pending = s.useSosmed.getState().read("initial");
  s.useSosmed.getState().bind("player-b");
  finish(new WorldApiError(429));
  await pending;
  assert.equal(s.useSosmed.getState().error, "");
  const next = s.sosmedRequest("read");
  finish(new WorldApiError(422));
  await assert.rejects(next, { status: 422 });
});
