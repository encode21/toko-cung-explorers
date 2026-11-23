import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import { gangCoastContains } from "../src/game/gang/beach.ts";
const source = readFileSync(new URL("../src/game/gang/store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
class WorldApiError extends Error {
  constructor(status) {
    super("Rejected");
    this.status = status;
  }
}
const model = {};
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/game/gang/model.ts", import.meta.url), "utf8").replace(
      /^import .*;$/gm,
      "",
    ),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: model },
);
const data = {
  enabled: true,
  gang: 1,
  arrival: 1,
  home: { gang: 2, number: 1 },
  houses: Array.from({ length: 10 }, (_, i) => ({ number: i + 1 })),
  layout: { origin: [6000, 0, 3000], gate: { x: -36, z: 12 }, house_spacing: 24, house_offset: 18 },
};
function setup(request) {
  const useAccount = create(() => ({ user: { id: "1" } })),
    useGame = create(() => ({ playerPos: [0, 0.83, 0], pendingTeleport: null })),
    useWarung = create(() => ({ inside: null }));
  const empty = create(() => ({}));
  const exports = {};
  let id = 0,
    entered = 0;
  vm.runInNewContext(compiled, {
    exports,
    ...model,
    gangCoastContains,
    create,
    createId: () => `request-${++id}`,
    worldRequest: request,
    WorldApiError,
    useAccount,
    useGame,
    useWarung,
    useHud: { getState: () => ({ setSheet: () => {} }) },
    useUsaha: empty,
    useClub: empty,
    useDungeon: empty,
    useChannels: empty,
    useFishing: empty,
    useMobility: empty,
    vehicleFor: () => null,
    miniParticipant: () => false,
    isMountainPosition: () => false,
    enterWarung: () => {
      entered++;
    },
    openWarungPanel: () => {},
    WARUNG_LOTS: [],
    lotFront: () => [],
  });
  return { ...exports, useAccount, useWarung, useGame, entered: () => entered };
}
test("all four Gang beaches remain in the Gang room through the waterline", () => {
  const s = setup(async () => data);
  s.useGang.setState({ inside: 1, data });
  for (const [x, z] of [
    [6045.3, 3060],
    [5954.7, 3060],
    [6000, 2974.7],
    [6000, 3140.3],
  ]) {
    s.useGame.setState({ playerPos: [x, -0.9, z] });
    assert.equal(s.isGangPosition(x, z), true);
    assert.equal(s.localGangId(), 1, "beach does not leak into the public city room");
  }
  assert.equal(s.isGangPosition(6100, 3060), false);
});
test("Mampir enters the owner gang, not the shop interior", async () => {
  const calls = [];
  const s = setup(async (op, req) => {
    calls.push([op, req]);
    return data;
  });
  s.useGang.setState({ data });
  await s.visitGangShop(9);
  assert.equal(calls[0][0], "gang");
  assert.equal(calls[0][1].action, "visit");
  assert.equal(calls[0][1].warungId, 9);
  assert.equal(s.useGang.getState().inside, 1);
  assert.equal(s.entered(), 0);
  assert.deepEqual([...s.useGame.getState().pendingTeleport], [5990, 0.83, 3010]);
});
test("ambiguous decoration retries the same request before allowing another write", async () => {
  const calls = [];
  const s = setup(async (_, req) => {
    calls.push(req);
    if (calls.length === 1) throw new Error("Lost response");
    return data;
  });
  await s.gangCommand("decorate", { slot: "paint", itemId: "blue" });
  await s.gangCommand("decorate", { slot: "paint", itemId: "mint" });
  assert.equal(calls.length, 1);
  const retry = s.useGang.getState().retry;
  await s.gangCommand(retry.action, retry);
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.equal(s.useGang.getState().retry, null);
});
test("late account responses are discarded; kill switch preserves a safe shop exit", async () => {
  let resolve;
  const s = setup(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = s.gangCommand("read");
  s.useAccount.setState({ user: { id: "2" } });
  s.clearGang();
  resolve(data);
  await pending;
  assert.equal(s.useGang.getState().data, null);
  s.useGang.setState({ data, inside: 1 });
  s.useWarung.setState({ inside: { id: 1 } });
  s.clearGang();
  assert.deepEqual([...s.useWarung.getState().returnTo], [-36, 0.83, 15]);
});

test("guests can enter temporary gangs and profile visits arrive at the chosen home", async () => {
  const calls = [];
  const s = setup(async (_, req) => {
    calls.push(req);
    return { ...data, gang: -1, arrival: 4 };
  });
  s.useAccount.setState({ user: { id: "guest", guest: true } });
  await s.enterGang(undefined, { playerId: "target-player" });
  assert.equal(calls[0].action, "visit");
  assert.equal(calls[0].playerId, "target-player");
  assert.equal(s.useGang.getState().inside, -1);
  assert.deepEqual([...s.useGame.getState().pendingTeleport], [6010, 0.83, 3034]);
});

test("privacy uncertainty retries the original value and UUID", async () => {
  const calls = [];
  const s = setup(async (_, req) => {
    calls.push(req);
    if (calls.length === 1) throw new Error("Lost response");
    return { ...data, privacy: { value: req.privacy } };
  });
  await s.gangCommand("privacy", { privacy: "friends" });
  await s.gangCommand("privacy", { privacy: "open" });
  assert.equal(calls.length, 1);
  const retry = s.useGang.getState().retry;
  await s.gangCommand(retry.action, retry);
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.equal(calls[1].privacy, "friends");
  assert.equal(s.useGang.getState().data.privacy.value, "friends");
});
