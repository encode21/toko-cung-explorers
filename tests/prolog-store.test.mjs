import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
function compiled(file) {
  return ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8").replace(/^import .*;$/gm, ""),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
}
class WorldApiError extends Error {
  constructor(status) {
    super("Rejected");
    this.status = status;
  }
}
function setup(request) {
  const useAccount = create(() => ({ user: { id: "1", guest: true } }));
  let id = 0;
  const signupSeen = new Set();
  const exports = {};
  vm.runInNewContext(compiled("../src/game/prolog/store.ts"), {
    exports,
    create,
    Error,
    WorldApiError,
    createId: () => `request-${++id}`,
    worldRequest: request,
    useAccount,
    storyCommand: () => {},
    prologSignupSeen: (id) => signupSeen.has(id),
  });
  return { ...exports, useAccount, signupSeen };
}
const data = { enabled: true, step: "goal", path: "dagang", completedAt: null };
test("guest lost path reply retries the original UUID before another advance", async () => {
  const calls = [];
  const s = setup(async (_, request) => {
    calls.push(request);
    if (calls.length === 1) throw new Error("Lost response");
    return data;
  });
  await s.prologCommand("choose-path", { path: "dagang" });
  await s.prologCommand("advance", { step: "goal" });
  assert.equal(calls.length, 1);
  s.retryProlog();
  await new Promise(setImmediate);
  assert.equal(calls[1].requestId, calls[0].requestId);
  assert.equal(s.useProlog.getState().data.step, "goal");
  assert.equal(s.useProlog.getState().retry, null);
});
test("logout discards a delayed response and resume reads server state", async () => {
  let resolve;
  const s = setup(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = s.prologCommand("state");
  s.clearProlog();
  s.useAccount.setState({ user: { id: "2" } });
  resolve(data);
  await pending;
  assert.equal(s.useProlog.getState().data, null);
  assert.equal(s.useProlog.getState().busy, false);
});
test("state refresh queued during a command cannot overwrite that command early", async () => {
  let resolve,
    calls = 0;
  const s = setup(() =>
    ++calls === 1
      ? new Promise((done) => {
          resolve = done;
        })
      : Promise.resolve(data),
  );
  const pending = s.prologCommand("advance", { step: "map" });
  await s.prologCommand("state");
  assert.equal(calls, 1);
  resolve(data);
  await pending;
  await new Promise(setImmediate);
  assert.equal(calls, 2);
  assert.equal(s.useProlog.getState().data.step, "goal");
});
test("kill switch/old backend hides prolog and definite errors allow correction", async () => {
  let calls = 0;
  const s = setup(async () => {
    if (++calls <= 2) throw new WorldApiError(calls === 1 ? 422 : 404);
    return { enabled: false };
  });
  await s.prologCommand("advance", { step: "meet" });
  assert.equal(s.useProlog.getState().retry, null);
  await s.prologCommand("state");
  assert.equal(s.useProlog.getState().data, null);
  await s.prologCommand("state");
  assert.equal(s.useProlog.getState().data, null);
});
test("book explains daily gate before missing shop, incomplete goal, or completed goal", () => {
  const exports = {};
  vm.runInNewContext(compiled("../src/game/story/page-state.ts"), { exports });
  const state = exports.storyPageState;
  const page = { needsWarung: true, progress: { done: false } };
  assert.equal(state({ locked: true }, page), "locked");
  assert.equal(state({ locked: false }, page), "needs_warung");
  page.needsWarung = false;
  assert.equal(state({ locked: false }, page), "unfinished");
  page.progress.claimInWarung = true;
  assert.equal(state({ locked: false }, page), "claim_in_warung");
  page.progress = { done: true };
  assert.equal(state({ locked: false }, page), "ready");
  assert.equal(state({ locked: true }, page), "locked");
  page.progress = { done: false, locked: true };
  assert.equal(state({ locked: false }, page), "locked");
});

test("signup invitation waits for confirmed completion and respects dismissal per account", async () => {
  let snapshot = { ...data, guest: true, step: "sleep" };
  const s = setup(async () => snapshot);
  await s.prologCommand("state");
  assert.equal(s.useProlog.getState().registrationPrompt, false);
  snapshot = { ...snapshot, step: "done", completedAt: "2026-11-27T00:00:00Z" };
  await s.prologCommand("state");
  assert.equal(s.useProlog.getState().registrationPrompt, true);
  s.signupSeen.add("1");
  await s.prologCommand("state");
  assert.equal(s.useProlog.getState().registrationPrompt, false);
  s.useAccount.setState({ user: { id: "2", guest: false } });
  await s.prologCommand("state");
  assert.equal(s.useProlog.getState().registrationPrompt, false);
});
