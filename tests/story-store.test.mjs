import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";

const source = readFileSync(new URL("../src/game/story/store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
class WorldApiError extends Error {
  constructor(status) {
    super("Rejected");
    this.status = status;
  }
}
function setup(request) {
  const useAccount = create(() => ({ user: { id: "1" } }));
  const useGameCore = create(() => ({ snapshot: null }));
  const useWardrobe = create(() => ({ account: "1", owned: [] }));
  let id = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    create,
    createId: () => `request-${++id}`,
    worldRequest: request,
    WorldApiError,
    useAccount,
    useGameCore,
    useWardrobe,
  });
  return { ...exports, useAccount };
}
const state = { enabled: false };

test("ambiguous claims retry with the same ID before accepting a different action", async () => {
  const calls = [];
  const s = setup(async (_, request) => {
    calls.push(request);
    if (calls.length === 1) throw new Error("Connection lost after commit");
    return state;
  });
  await s.storyCommand("claim-page", { section: "jalanan", page: 0 });
  await s.storyCommand("set-active", { section: "kos" });
  assert.equal(calls.length, 1);
  const retry = s.useStory.getState().retry;
  await s.storyCommand(retry.action, retry);
  assert.equal(calls[1].requestId, calls[0].requestId);
  assert.equal(s.useStory.getState().retry, null);
});

test("a rejected objective can refresh or switch sections without being stuck retrying", async () => {
  let count = 0;
  const s = setup(async () => {
    if (++count === 1) throw new WorldApiError(422);
    return state;
  });
  await s.storyCommand("claim-page", { section: "jalanan", page: 0 });
  assert.equal(s.useStory.getState().retry, null);
  await s.storyCommand("set-active", { section: "kos" });
  assert.equal(count, 2);
});

test("a late account response cannot publish another player's story", async () => {
  let resolve;
  const s = setup(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = s.storyCommand("state");
  s.useAccount.setState({ user: { id: "2" } });
  s.clearStory();
  resolve(state);
  await pending;
  assert.equal(s.useStory.getState().data, null);
  assert.equal(s.useStory.getState().busy, false);
});

test("business changes during an in-flight request trigger one subsequent refresh", async () => {
  let resolve,
    count = 0;
  const s = setup(() =>
    ++count === 1
      ? new Promise((done) => {
          resolve = done;
        })
      : Promise.resolve(state),
  );
  const pending = s.storyCommand("claim-page", { section: "jalanan", page: 0 });
  await s.storyCommand("state");
  await s.storyCommand("state");
  resolve(state);
  await pending;
  await new Promise(setImmediate);
  assert.equal(count, 2);
});
