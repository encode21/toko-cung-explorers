import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";

const source = readFileSync(new URL("../src/game/staff/store.ts", import.meta.url), "utf8");
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
  const useWarung = create(() => ({ data: { warung: { cash: 100000 } } }));
  const useUsaha = create(() => ({ data: null }));
  let id = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    create,
    Error,
    createId: () => `request-${++id}`,
    worldRequest: request,
    WorldApiError,
    useAccount,
    useWarung,
    useUsaha,
    warungCommand: () => {},
    usahaCommand: () => {},
    storyCommand: () => {},
  });
  return { ...exports, useAccount, useWarung };
}
const state = { enabled: true, kas: 60000, staff: [], messages: [], text: {}, pollSeconds: 60 };

test("lost hire reply retries the same request before allowing another hire or dismissal", async () => {
  const calls = [];
  const s = setup(async (_, request) => {
    calls.push(request);
    if (calls.length === 1) throw new Error("Connection lost after commit");
    return state;
  });
  await s.staffCommand("hire", { kind: "guard" });
  await s.staffCommand("dismiss", { kind: "guard" });
  assert.equal(calls.length, 1);
  await s.retryStaff();
  await new Promise(setImmediate);
  assert.equal(calls[1].requestId, calls[0].requestId);
  assert.equal(s.useStaff.getState().retry, null);
  assert.equal(s.useWarung.getState().data.warung.cash, 60000);
});

test("a late response cannot expose another account's employees or change its Kas", async () => {
  let resolve;
  const s = setup(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = s.staffCommand("state");
  s.useAccount.setState({ user: { id: "2" } });
  s.clearStaff();
  resolve(state);
  await pending;
  assert.equal(s.useStaff.getState().data, null);
  assert.equal(s.useStaff.getState().busy, false);
  assert.equal(s.useWarung.getState().data.warung.cash, 100000);
});

test("lost salary transfer reply keeps its quote and request ID on retry", async () => {
  const calls = [];
  const s = setup(async (_, request) => {
    calls.push(request);
    if (calls.length === 1) throw new Error("Lost transfer receipt");
    return state;
  });
  await s.staffCommand("pay", { kind: "guard", paymentToken: "confirmed-quote" });
  await s.staffCommand("pay", { kind: "courier", paymentToken: "another-quote" });
  assert.equal(calls.length, 1);
  const result = await s.retryStaff();
  assert.deepEqual(calls[1], calls[0]);
  assert.equal(result.kas, 60000);
  assert.equal(s.useStaff.getState().retry, null);
});

test("a definite salary rejection clears retry; older backend hides the panel", async () => {
  let calls = 0;
  const s = setup(async () => {
    throw new WorldApiError(++calls === 1 ? 422 : 404);
  });
  await s.staffCommand("hire", { kind: "guard" });
  assert.equal(s.useStaff.getState().retry, null);
  assert.equal(s.useStaff.getState().error, "Rejected");
  await s.staffCommand("state");
  assert.equal(s.useStaff.getState().data, null);
  assert.equal(s.useStaff.getState().error, "");
  assert.equal(s.useStaff.getState().retry, null);
});

test("several panel refreshes during hire cause one follow-up read", async () => {
  let resolve,
    calls = 0;
  const s = setup(() =>
    ++calls === 1
      ? new Promise((done) => {
          resolve = done;
        })
      : Promise.resolve(state),
  );
  const pending = s.staffCommand("hire", { kind: "guard" });
  await s.staffCommand("state");
  await s.staffCommand("state");
  resolve(state);
  await pending;
  await new Promise(setImmediate);
  assert.equal(calls, 2);
});
