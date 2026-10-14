/** Exercise actual Zustand dungeon commands using delayed, local-only transport. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { create } = require("zustand");
const requests = [];
const accountListeners = [];
const channels = create(() => ({ lease: { channel: "WORLD-QA" }, playing: true }));
const game = create(() => ({ playerPos: [0, 0.83, 0] }));
const core = create(() => ({ snapshot: null, error: "" }));
const hud = create((set) => ({ sheet: null, setSheet: (sheet) => set({ sheet }) }));
const net = create((set) => ({ room: "WORLD-QA", setRoom: (room) => set({ room }) }));
let handoffs = 0;
let handoffEnds = 0;
let removeChannels;
let removeChannelsCalled = false;
let authCalls = 0;
class WorldApiError extends Error {}

const dependencies = {
  zustand: { create },
  "@/services/world/client": {
    WorldApiError,
    worldRequest: (endpoint, payload) =>
      new Promise((resolve, reject) => requests.push({ endpoint, payload, resolve, reject })),
  },
  "@/net/channel-store": {
    useChannels: channels,
    connectionId: "local-tracking-check",
    beginChannelHandoff: () => handoffs++,
    endChannelHandoff: () => handoffEnds++,
  },
  "@/net/realtime": {
    realtime: {
      removeAllChannels: () => {
        removeChannelsCalled = true;
        return removeChannels ?? Promise.resolve();
      },
      realtime: { setAuth: async () => authCalls++ },
    },
  },
  "@/net/net-store": { useNet: net },
  "@/state/game-store": { useGame: game },
  "@/game/core/store": { useGameCore: core },
  "@/state/hud-store": { useHud: hud },
  "./announce-complete": { announceDungeonComplete() {} },
};

const previousWindow = globalThis.window;
globalThis.window = {
  addEventListener: (event, listener) => {
    assert.equal(event, "world-account-cleared");
    accountListeners.push(listener);
  },
};
try {
  const source = await readFile(new URL("../src/game/dungeon/store.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      assert(Object.hasOwn(dependencies, id), `Unexpected dungeon dependency: ${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  const { dungeonCommand, useDungeon } = module.exports;
  const hub = { instance: null, config: { dungeonId: "principal-qa", entrance: [-12, 0, 18] } };
  const active = { ...hub, instance: { status: "ACTIVE", currentRoom: "WORLD-QA" } };

  async function start(action) {
    const done = dungeonCommand(action);
    await Promise.resolve();
    assert.equal(requests.length, 1, `${action} sends one local request`);
    const request = requests.shift();
    assert.equal(request.endpoint, "dungeon");
    assert.equal(request.payload.action, action);
    return { done, request };
  }
  function resetAccount() {
    assert.equal(accountListeners.length, 1);
    accountListeners[0]();
    assert.equal(useDungeon.getState().tracked, false, "account reset clears old tracking");
  }

  useDungeon.setState({ data: hub, tracked: true });
  const read = await start("read");
  assert.equal(useDungeon.getState().busy, false, "background refresh stays nonblocking");
  read.request.resolve(hub);
  await read.done;
  assert.equal(useDungeon.getState().tracked, true, "hub refresh keeps entrance guidance");

  const failedRead = await start("read");
  failedRead.request.reject(new Error("Refresh unavailable"));
  await failedRead.done;
  assert.equal(useDungeon.getState().tracked, true, "failed refresh keeps entrance guidance");
  assert.equal(useDungeon.getState().error, "", "background failures remain nonsticky");

  for (const error of [new WorldApiError("Level belum cukup"), new Error("Network unavailable")]) {
    const enter = await start("enter");
    assert.equal(useDungeon.getState().tracked, true, "pending enter keeps the route");
    enter.request.reject(error);
    await enter.done;
    assert.equal(useDungeon.getState().tracked, true, "rejected enter keeps entrance guidance");
    assert.equal(useDungeon.getState().error, error.message);
    assert.equal(useDungeon.getState().busy, false);
    assert.equal(useDungeon.getState().transition, false);
  }

  const unchanged = await start("enter");
  unchanged.request.resolve(hub);
  await unchanged.done;
  assert.equal(useDungeon.getState().tracked, true, "no instance means the trip has not begun");

  for (const action of ["enter", "read", "exit"]) {
    useDungeon.setState({ tracked: true, data: hub });
    const success = await start(action);
    success.request.resolve(action === "exit" ? hub : active);
    await success.done;
    assert.equal(
      useDungeon.getState().tracked,
      false,
      `${action} success clears entrance tracking`,
    );
  }
  assert.equal(handoffs, handoffEnds, "completed commands release each channel handoff");

  // A response from an old account must not overwrite the new account's route.
  for (const reject of [false, true]) {
    useDungeon.setState({ data: hub, tracked: true });
    const stale = await start("enter");
    resetAccount();
    useDungeon.setState({ data: hub, tracked: true, error: "New session" });
    if (reject) stale.request.reject(new Error("Old session failed"));
    else stale.request.resolve(active);
    await stale.done;
    assert.equal(useDungeon.getState().tracked, true, "stale response preserves new route");
    assert.equal(useDungeon.getState().data, hub, "stale response preserves new dungeon data");
    assert.equal(useDungeon.getState().error, "New session");
  }

  // Also change accounts after the response but during the asynchronous handoff.
  let finishRemoval;
  removeChannels = new Promise((resolve) => {
    finishRemoval = resolve;
  });
  const handoff = await start("enter");
  handoff.request.resolve({
    ...active,
    lease: { channel: "DNG-QA", realtimeToken: "local-fixture" },
  });
  await Promise.resolve();
  assert(removeChannelsCalled, "lease response begins channel teardown");
  resetAccount();
  useDungeon.setState({ data: hub, tracked: true });
  finishRemoval();
  await handoff.done;
  assert.equal(useDungeon.getState().tracked, true, "stale handoff preserves new route");
  assert.equal(useDungeon.getState().data, hub);
  assert.equal(authCalls, 0, "old lease never authenticates after account reset");
  assert.equal(net.getState().room, "WORLD-QA");
  assert.equal(requests.length, 0);

  console.log(
    "PASS dungeon tracking: refresh/failure retention, successful entrance/exit clearing, stale response and handoff guards",
  );
} finally {
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}
