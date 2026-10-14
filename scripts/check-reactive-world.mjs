import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const m = await load("../src/game/reactive-world/model.ts");
const { stepPickup } = await load("../src/game/reactive-world/pickup.ts");
const now = 1_800_000_000_000;
const event = (type, i = 1) => ({
  id: `event-${i}`,
  type,
  status: "ACTIVE",
  intensity: 0.7,
  startedAt: now - 1000,
  expiresAt: now + 120_000,
  revision: i,
  payload: {},
});
const snapshot = {
  revision: 3,
  generatedAt: now,
  events: m.EVENT_TYPES.map((type, i) => event(type, i + 1)),
};
assert.deepEqual(m.parseSnapshot(snapshot), snapshot);
for (const malformed of [
  null,
  {},
  { ...snapshot, events: [...snapshot.events, snapshot.events[0]] },
  { ...snapshot, events: [event("QUEST")] },
  { ...snapshot, events: [{ ...event("STORE_RUSH"), intensity: NaN }] },
  { ...snapshot, events: [{ ...event("STORE_RUSH"), expiresAt: now - 2000 }] },
  { ...snapshot, events: [{ ...event("STORE_RUSH"), payload: { courier: "unknown" } }] },
])
  assert.equal(m.parseSnapshot(malformed), null);
assert.deepEqual(
  m.parseSnapshot({
    ...snapshot,
    customer: { phone: "private" },
    events: [{ ...event("STORE_RUSH"), payload: { orderId: "private", courier: "JNE" } }],
  }).events[0].payload,
  { courier: "JNE" },
);
assert.equal(m.acceptSnapshot(snapshot, { ...snapshot, revision: 2 }, now), false);
assert.equal(m.acceptSnapshot(snapshot, { ...snapshot, events: [] }, now), false);
assert.equal(
  m.acceptSnapshot(snapshot, { ...snapshot, generatedAt: now + 1000 }, now + 1000),
  true,
  "same revision heartbeat renews lease without replay",
);
assert.equal(
  m.acceptSnapshot(
    snapshot,
    { ...snapshot, revision: 4, events: [{ ...snapshot.events[0], intensity: 1 }] },
    now,
  ),
  false,
  "cannot mutate an event without its revision increasing",
);
assert.equal(m.acceptSnapshot(null, { ...snapshot, generatedAt: now - 90_001 }, now), false);
assert.equal(m.acceptSnapshot(null, { ...snapshot, generatedAt: now + 30_001 }, now), false);
assert.equal(m.activeEvents(snapshot, now, now + 89_999).length, 3);
assert.equal(
  m.activeEvents(snapshot, now, now + 90_001).length,
  0,
  "source failure returns NORMAL",
);
assert.equal(
  m.activeEvents(snapshot, now + 100_000, now + 120_000).length,
  0,
  "TTL cannot be renewed by heartbeat",
);
assert.equal(
  m.activeEvents({ ...snapshot, events: [{ ...event("STORE_RUSH"), status: "ENDING" }] }, now, now)
    .length,
  0,
);
for (let i = 0; i <= 1; i += 0.05) {
  assert.ok(m.customerCount(i, true) <= 2);
  assert.ok(m.customerCount(i, false) + 1 <= 5);
}
const courier = event("COURIER_PICKUP");
assert.equal(stepPickup(null, courier, "loading", false, "", now).run, null);
assert.equal(stepPickup(null, courier, "away", true, "", now).run, null);
let result = stepPickup(null, courier, "away", false, "", now);
assert.equal(result.truck, "incoming");
let run = result.run;
assert.equal(
  stepPickup(run, undefined, "incoming", false, "", now + 5000).run,
  run,
  "cancellation does not teleport incoming vehicle",
);
run = stepPickup(run, undefined, "loading", false, "", now + 20_000).run;
assert.equal(run.stage, "pickup");
assert.equal(
  stepPickup(run, courier, "loading", false, "", now + 60_000).run,
  run,
  "vehicle waits for actual courier arrival / dialogue",
);
run = stepPickup(run, courier, "loading", false, "pickup", now + 60_000).run;
assert.equal(run.stage, "returning");
result = stepPickup(
  JSON.parse(JSON.stringify(run)),
  undefined,
  "loading",
  false,
  "returning",
  now + 70_000,
);
assert.equal(result.truck, "leaving", "handoff resumes the same pickup");
run = stepPickup(result.run, undefined, "away", false, "", now + 90_000).run;
assert.equal(run.stage, "done");
assert.equal(
  stepPickup(run, { ...courier, revision: 100, intensity: 1 }, "away", false, "", now + 100_000)
    .run,
  run,
  "updated event cannot trigger a second trip",
);
assert.equal(
  stepPickup(run, { ...courier, id: "new-activation" }, "away", false, "", now + 100_000).truck,
  "incoming",
);
assert.equal(m.validPickup(run), true);
assert.equal(m.validPickup({ ...run, stageAt: Infinity }), false);
console.log(
  "PASS reactive schemas, sanitization, revisions, lease/expiry, budgets, busy delivery, cancellation, courier wait, handoff and pickup idempotence",
);

// Exercise the actual Zustand reducer and dev source controller with an injected clock/authority.
const modules = new Map();
async function runtimeUrl(path) {
  if (modules.has(path)) return modules.get(path);
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source.replaceAll(
    "import.meta.env",
    '({ DEV: true, VITE_REACTIVE_WORLD_SOURCE: "MOCK" })',
  );
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const name of ["model", "store"]) {
    if (outputText.includes(`from "./${name}"`))
      outputText = outputText.replaceAll(
        `from "./${name}"`,
        `from "${await runtimeUrl(`../src/game/reactive-world/${name}.ts`)}"`,
      );
  }
  if (outputText.includes('from "@/lib/id"'))
    outputText = outputText.replaceAll(
      'from "@/lib/id"',
      `from "${await runtimeUrl("../src/lib/id.ts")}"`,
    );
  outputText = outputText.replaceAll('from "zustand"', `from "${import.meta.resolve("zustand")}"`);
  outputText = outputText.replace(
    'import { isTrafficHost } from "@/game/traffic/traffic-sync";',
    "const isTrafficHost = () => globalThis.reactiveTestHost;",
  );
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  modules.set(path, url);
  return url;
}
const state = await import(await runtimeUrl("../src/game/reactive-world/store.ts"));
const mock = await import(await runtimeUrl("../src/game/reactive-world/mock.ts"));
const realNow = Date.now;
let clock = now;
Date.now = () => clock;
globalThis.reactiveTestHost = true;
try {
  mock.activate("STORE_RUSH", 1);
  const id = state.useReactiveWorld.getState().snapshot.events[0].id;
  mock.deactivate("STORE_RUSH");
  assert.equal(state.useReactiveWorld.getState().snapshot.events[0].expiresAt, now + 60_000);
  clock += 30_000;
  state.receiveWorldSnapshot(mock.tickMock(clock));
  state.advanceWorld(clock, 2500);
  assert.equal(state.useReactiveWorld.getState().store, 1);
  assert.equal(state.useReactiveWorld.getState().events[0].id, id);
  clock += 30_001;
  state.receiveWorldSnapshot(mock.tickMock(clock));
  state.advanceWorld(clock, 2500);
  assert.equal(state.useReactiveWorld.getState().store, 0);
  assert.equal(state.useReactiveWorld.getState().snapshot.events[0].status, "ENDING");
  mock.activate("STORE_RUSH", 1);
  assert.equal(
    state.useReactiveWorld.getState().snapshot.events[0].id,
    id,
    "cooldown prevents reactivation",
  );
  clock += 30_000;
  mock.activate("STORE_RUSH", 0.5);
  assert.notEqual(state.useReactiveWorld.getState().snapshot.events[0].id, id);
  const retained = structuredClone(state.useReactiveWorld.getState().snapshot);
  state.advanceWorld(clock + 90_001, 2500);
  assert.equal(state.useReactiveWorld.getState().events.length, 0);
  assert.equal(
    state.receiveWorldSnapshot({
      ...retained,
      revision: retained.revision - 1,
      generatedAt: clock,
    }),
    false,
    "failure does not drop revision watermark",
  );
  globalThis.reactiveTestHost = false;
  mock.reset();
  assert.deepEqual(state.useReactiveWorld.getState().snapshot, retained);
  globalThis.reactiveTestHost = true;
  mock.startDemo();
  const origin = clock;
  for (const [seconds, count] of [
    [0, 0],
    [30, 1],
    [90, 2],
    [150, 3],
    [240, 0],
  ]) {
    clock = origin + seconds * 1000;
    state.receiveWorldSnapshot(mock.tickMock(clock));
    state.advanceWorld(clock, 2500);
    assert.equal(state.useReactiveWorld.getState().events.length, count, `demo at ${seconds}s`);
  }
  console.log(
    "PASS actual store/mock: minimum duration, fade, cooldown, lease, preserved watermark, host-only reset, four-minute demo",
  );
} finally {
  Date.now = realNow;
  delete globalThis.reactiveTestHost;
}

// Authenticated Laravel adapter sanitizes public event state; failures never invent events.
const gatewaySource = await readFile(
  new URL("../src/services/tokoCungApi/world-state.functions.ts", import.meta.url),
  "utf8",
);
let { outputText: gatewayCode } = ts.transpileModule(gatewaySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
gatewayCode = gatewayCode
  .replace(
    'import { worldRequest } from "@/services/world/client";',
    "const worldRequest = (...args) => globalThis.testWorldRequest(...args);",
  )
  .replace(
    'from "@/game/reactive-world/model"',
    `from "${await runtimeUrl("../src/game/reactive-world/model.ts")}"`,
  );
const gateway = await import(
  `data:text/javascript;base64,${Buffer.from(gatewayCode).toString("base64")}`
);
try {
  globalThis.testWorldRequest = async (operation) => {
    assert.equal(operation, "state");
    return { ...snapshot, rawOrders: [{ phone: "private" }] };
  };
  assert.deepEqual(await gateway.getWorldState(), snapshot);
  globalThis.testWorldRequest = async () => ({ events: [{ rawOrder: "private" }] });
  await assert.rejects(gateway.getWorldState(), /invalid/);
  globalThis.testWorldRequest = async () => {
    throw new Error("backend unavailable");
  };
  await assert.rejects(gateway.getWorldState(), /unavailable/);
  console.log(
    "PASS authenticated Laravel event gateway: operation, whitelist, malformed data and failure propagation",
  );
} finally {
  delete globalThis.testWorldRequest;
}
