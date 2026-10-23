/** Deterministic transport recovery and lease races; no server or credentials. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import { createRoomRecovery } from "../src/net/room-recovery.ts";
const require = createRequire(import.meta.url);
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
let timers = new Map(),
  serial = 0;
const realTimeout = globalThis.setTimeout,
  realClear = globalThis.clearTimeout;
globalThis.setTimeout = (fn, delay) => {
  const id = ++serial;
  timers.set(id, { fn, delay });
  return id;
};
globalThis.clearTimeout = (id) => timers.delete(id);
const tick = async () => {
  const [id, timer] = timers.entries().next().value;
  timers.delete(id);
  timer.fn();
  await flush();
  return timer.delay;
};
try {
  let current = true,
    connected = false,
    online = true,
    auth = 0,
    replaced = 0,
    resolveAuth;
  let authorize = async () => {
    auth++;
    return true;
  };
  const recovery = createRoomRecovery({
    current: () => current,
    connected: () => connected,
    online: () => online,
    authorize: () => authorize(),
    reconnect: () => {
      replaced++;
    },
  });
  recovery.schedule(1500);
  recovery.schedule(1500);
  assert.equal(timers.size, 1);
  assert.equal(await tick(), 2000);
  assert.equal(auth, 1);
  assert.equal(replaced, 1);
  assert.equal([...timers.values()][0].delay, 12000, "allow replacement subscription to finish");
  connected = true;
  recovery.connected();
  assert.equal(timers.size, 0);
  connected = false;
  online = false;
  recovery.schedule();
  await tick();
  assert.equal(auth, 1, "offline does not hammer authorization");
  online = true;
  authorize = () => {
    auth++;
    return new Promise((r) => (resolveAuth = r));
  };
  recovery.retry();
  recovery.retry();
  assert.equal(auth, 2, "single recovery in flight");
  current = false;
  resolveAuth(true);
  await flush();
  assert.equal(replaced, 1, "handoff cannot recreate old room");
  recovery.dispose();
  assert.equal(timers.size, 0);
  let tries = 0;
  const failing = createRoomRecovery({
    current: () => true,
    connected: () => false,
    online: () => true,
    authorize: async () => {
      tries++;
      throw Error("offline");
    },
    reconnect: () => assert.fail("no authorization"),
  });
  failing.schedule();
  const delays = [];
  for (let i = 0; i < 7; i++) delays.push(await tick());
  assert.deepEqual(delays, [2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  assert.equal(tries, 7);
  failing.dispose();
  assert.equal(timers.size, 0);

  // Exercise the real hook and subscription callbacks, including SDK topic caching.
  const path = new URL("../src/net/useWorldChannel.ts", import.meta.url);
  const source = ts.createSourceFile(
    path.pathname,
    await readFile(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const names = ["joinRoom", "useWorldChannel", "validPose", "presencePayload", "sendOwnSnapshot"];
  const selected = source.statements.filter(
    (n) => ts.isFunctionDeclaration(n) && names.includes(n.name?.text),
  );
  const code = selected
    .map((n) => ts.createPrinter().printNode(ts.EmitHint.Unspecified, n, source))
    .join("\n");
  const noop = () => {};
  const channels = { lease: { channel: "CHANNEL-01" }, busy: false };
  const net = {
    connected: false,
    connectionError: "",
    roster: [],
    name: "QA",
    setRoster(v) {
      this.roster = v;
    },
    setConnected(v) {
      this.connected = v;
    },
  };
  const makeStore = (value) =>
    Object.assign((select) => select(value), {
      getState: () => value,
      setState: (patch) => Object.assign(value, patch),
    });
  const effects = [],
    cache = new Map(),
    created = [];
  let removal;
  const supabase = {
    channel(topic) {
      if (cache.has(topic)) return cache.get(topic);
      const channel = {
        state: "joining",
        on() {
          return this;
        },
        subscribe(fn) {
          this.callback = fn;
          return this;
        },
        track: async () => {},
        send: async () => {},
        presenceState: () => ({}),
      };
      cache.set(topic, channel);
      created.push(channel);
      return channel;
    },
    async removeChannel(channel) {
      if (removal) await removal;
      for (const [key, value] of cache) if (value === channel) cache.delete(key);
      channel.callback("CLOSED");
    },
  };
  const dependencies = {
    supabase,
    createRoomRecovery,
    useEffect: (fn) => effects.push(fn),
    useRef: (current) => ({ current }),
    useChannels: makeStore(channels),
    useNet: makeStore(net),
    useClub: { getState: () => ({}), subscribe: () => noop },
    useProfile: { getState: () => ({ profile: null, load: noop }) },
    useGame: { getState: () => ({ playerPos: [0, 0, 0], playerYaw: 0 }) },
    getLocalNetAnim: noop,
    missionSessionId: () => "",
    worldRoom: noop,
    resetTrafficSync: noop,
    startMobility: () => noop,
    startReactiveWorld: () => noop,
    startMissions: () => noop,
    refreshRemoteProfile: noop,
    maybePublishTraffic: noop,
    publishWorld: noop,
    publishMissions: noop,
    refreshLive: noop,
    handleMissionDrive: noop,
    handleMissionSnapshot: noop,
    handleMissionCommand: noop,
    handleMissionResult: noop,
    handleWorldSnapshot: noop,
    handleSocialAction: noop,
    handleTrafficSnap: noop,
    queueSocialHit: noop,
    renewChannel: async () => true,
  };
  const isolated = `let activeChannel=null,activeRoom=null,activeRecovery=null,joinedAt=0; const playerId='qa'; const remoteStates=new Map(); const getActiveChannel=()=>activeChannel?.state==='joined'&&useNet.getState().connected?activeChannel:null; ${code}`;
  const js = ts.transpileModule(isolated, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
  globalThis.window = { addEventListener: noop, removeEventListener: noop };
  new Function(...Object.keys(dependencies), "exports", js)(
    ...Object.values(dependencies),
    mod.exports,
  );
  mod.exports.useWorldChannel("CHANNEL-01", "QA", { id: "account" });
  const cleanups = effects.map((fn) => fn());
  const first = created[0];
  first.state = "joined";
  first.callback("SUBSCRIBED");
  assert(net.connected);
  first.state = "closed";
  cache.clear();
  first.callback("CLOSED");
  assert(!net.connected);
  assert.equal(timers.size, 1);
  let finishRemoval;
  removal = new Promise((r) => (finishRemoval = r));
  await tick();
  assert.equal(created.length, 1, "must wait for old channel removal");
  finishRemoval();
  await flush();
  removal = null;
  assert.equal(created.length, 2);
  const second = created[1];
  second.state = "joined";
  second.callback("SUBSCRIBED");
  assert(net.connected);
  assert.equal(timers.size, 0);
  first.callback("CLOSED");
  assert(net.connected, "late callback from old channel ignored");
  second.state = "closed";
  cache.clear();
  second.callback("CLOSED");
  cleanups.forEach((fn) => fn?.());
  assert.equal(timers.size, 0, "cleanup cancels reconnect");

  // Real channel store: overlapping periodic/recovery renewals share a request.
  let requests = [],
    authWait = null;
  const transport = {
    realtime: {
      setAuth: async () => {
        if (authWait) await authWait;
      },
    },
    removeAllChannels: async () => {},
  };
  const storeDeps = {
    zustand: require("zustand"),
    "@/lib/id": { createId: () => "qa" },
    "@/services/world/client": {
      worldRequest: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    },
    "./realtime": { realtime: transport },
    "./net-store": { useNet: makeStore(net) },
  };
  const storeSource = await readFile(
    new URL("../src/net/channel-store.ts", import.meta.url),
    "utf8",
  );
  const storeJs = ts.transpileModule(storeSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const storeMod = { exports: {} };
  new Function("require", "module", "exports", storeJs)(
    (name) => {
      assert(name in storeDeps, name);
      return storeDeps[name];
    },
    storeMod,
    storeMod.exports,
  );
  const s = storeMod.exports;
  const lease = {
    channel: "CHANNEL-01",
    expiresAt: "2099-01-01T00:00:00Z",
    realtimeToken: "test-only",
  };
  s.useChannels.setState({ lease });
  const a = s.renewChannel(),
    b = s.renewChannel();
  assert.equal(a, b);
  assert.equal(requests.length, 1);
  requests.shift().resolve({ ...lease });
  assert.equal(await a, true);
  let finishAuth;
  authWait = new Promise((r) => (finishAuth = r));
  const pending = s.renewChannel();
  requests.shift().resolve({ ...lease });
  await flush();
  s.beginChannelHandoff();
  s.useChannels.setState({ lease: { ...lease, channel: "DNG-next" } });
  finishAuth();
  assert.equal(await pending, false);
  assert.equal(
    s.useChannels.getState().lease.channel,
    "DNG-next",
    "old auth completion cannot restore previous room",
  );
  authWait = null;
  s.endChannelHandoff();
  const failed = s.renewChannel();
  requests.shift().reject(Error("network"));
  assert.equal(await failed, false);
  assert(s.useChannels.getState().lease, "valid lease survives transient network failure");
  console.log(
    "PASS: CLOSED reconnects in place, awaited channel removal, stale callbacks, backoff, offline/deduplication, SDK recovery, cleanup and lease handoff races.",
  );
} finally {
  globalThis.setTimeout = realTimeout;
  globalThis.clearTimeout = realClear;
}
