import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import * as travel from "../src/ui/hud/travel-loader.ts";
afterEach(() => travel.stopTravelRuntime());
import { gangCoastContains } from "../src/game/gang/beach.ts";
const source = readFileSync(new URL("../src/game/gang/store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ""), {
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
  const useMobility = create(() => ({ vehicles: [] }));
  const exports = {};
  let id = 0,
    entered = 0;
  let now = Date.now();
  vm.runInNewContext(compiled, {
    exports,
    ...model,
    gangCoastContains,
    ...travel,
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
    useMobility,
    setTimeout,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    useBusRide: { getState: () => ({ riding: false }) },
    connectionId: "me",
    vehicleFor: (vs, id) => vs.find((v) => v.occupants.some((s) => s.connectionId === id)),
    miniParticipant: () => false,
    isMountainPosition: () => false,
    enterWarung: () => {
      entered++;
    },
    openWarungPanel: () => {},
    WARUNG_LOTS: [],
    lotFront: () => [],
  });
  return {
    ...exports,
    useAccount,
    useWarung,
    useGame,
    useMobility,
    entered: () => entered,
    advance: (ms) => {
      now += ms;
    },
  };
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
  assert.equal(s.isGangPosition(6110, 3060), false); // past the widened kampung (LAND_HALF 90)
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
test("a driver crosses both portals with an active passenger and preserves the seat", () => {
  const s = setup(async () => data);
  s.useGang.setState({ data: { ...data, home: { gang: 1 } } });
  const party = { occupants: [{ seat: 0, status: "active" }, { seat: 1, status: "active" }] };
  const pose = (x, z) => ({ x, y: 0, z, yaw: Math.PI, speed: 5 });
  assert.equal(s.driveThroughGate(party, pose(-36, 13)), null);
  assert.equal(s.driveThroughGate(party, pose(-26, 10)), null);
  const inGang = s.driveThroughGate(party, pose(-36, 10));
  assert.deepEqual({ ...inGang }, { x: 6000, y: 0, z: 2997, yaw: 0, speed: 0, gang: 1 });
  assert.equal(s.useGang.getState().inside, 1);
  assert.equal(s.useGame.getState().pendingTeleport, null, "no seat-cancelling teleport");
  const back = s.driveThroughGate(party, pose(6001, 2988));
  assert.deepEqual({ ...back }, { x: -34.4, y: 0, z: 18, yaw: 0, speed: 0, gang: null });
  assert.equal(s.useGang.getState().inside, null);
});

test("the portal loads the passenger pickup gang, even when the driver lives elsewhere", async () => {
  const calls = [];
  const s = setup(async (_, request) => { calls.push(request); return { ...data, gang: request.gang }; });
  s.useGang.setState({ data });
  const v = { occupants: [{ seat: 0, status: "active" }] };
  const p = { x: -36, y: 0, z: 10, yaw: Math.PI, speed: 5 };
  assert.equal(s.driveThroughGate(v, p, 7), null);
  assert.equal(p.speed, 0);
  await new Promise(setImmediate);
  assert.equal(calls[0].gang, 7);
  assert.equal(s.driveThroughGate(v, p, 7).gang, 7);
  assert.equal(s.useGang.getState().inside, 7);
});

test("passenger follows the bike gang and a late gang response cannot undo returning to city", async () => {
  let resolveGang;
  const s = setup(async () => new Promise((resolve) => { resolveGang = resolve; }));
  const v = { id: "bike", occupants: [{ connectionId: "me", seat: 1, status: "active" }] };
  s.useMobility.setState({ vehicles: [v] });
  s.useGang.setState({ data });
  await s.followVehicleGang(v, { gang: 1 });
  assert.equal(s.useGang.getState().inside, 1);
  assert.equal(s.useGame.getState().pendingTeleport, null);
  const pending = s.followVehicleGang(v, { gang: 7 });
  await s.followVehicleGang(v, { gang: null });
  resolveGang({ ...data, gang: 7 });
  await pending;
  assert.equal(s.useGang.getState().inside, null);
  assert.equal(s.useMobility.getState().vehicles[0], v, "passenger seat stays intact");
});

test("a late gang entry cannot pull the player back after leaving for the city", async () => {
  let resolve;
  const s = setup(() => new Promise((done) => { resolve = done; }));
  s.useGang.setState({ data, inside: 1 });
  const pending = s.enterGang(undefined, { gang: 2 });
  s.leaveGang();
  const city = s.useGame.getState().pendingTeleport;
  assert.ok(city);
  resolve(data);
  assert.equal(await pending, false);
  assert.equal(s.useGang.getState().inside, null);
  assert.equal(s.useGame.getState().pendingTeleport, city);
  assert.equal(travel.useLoader.getState().loader.art, "kota");
});

for (const kind of ["motorcycle", "car"]) {
  test(`${kind}: passenger retries a failed gang load without leaving the seat or flooding requests`, async () => {
    let calls = 0;
    const s = setup(async () => {
      if (++calls === 1) throw new WorldApiError(503);
      return data;
    });
    const v = {
      id: "ride",
      model: kind,
      occupants: [
        { connectionId: "driver", seat: 0, status: "active" },
        { connectionId: "me", seat: 1, status: "active" },
      ],
    };
    s.useMobility.setState({ vehicles: [v] });
    await s.followVehicleGang(v, { gang: 1 });
    assert.equal(s.useGang.getState().inside, null);
    for (let i = 0; i < 10; i++) await s.followVehicleGang(v, { gang: 1 });
    assert.equal(calls, 1);
    s.advance(1000);
    await s.followVehicleGang(v, { gang: 1 });
    assert.equal(calls, 2, "retry must actually request the gang again");
    assert.equal(s.useGang.getState().inside, 1);
    assert.equal(s.useGame.getState().pendingTeleport, null);
    assert.equal(s.useMobility.getState().vehicles[0], v);
    assert.equal(s.useGang.getState().retry, null);
  });
}
