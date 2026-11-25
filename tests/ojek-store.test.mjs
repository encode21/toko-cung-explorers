import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { create } from 'zustand';

const compiled = ts.transpileModule(readFileSync(new URL('../src/game/ojek/store.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const payment = { gross: 20000, setoran: 10000, setoranPercent: 50, net: 10000 };
const snapshot = (hasWarung = true) => ({ motors: [], spots: [], payment,
  ojek: { hasWarung, cash: hasWarung ? 60000 : null, savings: hasWarung ? 0 : 10000,
    order: null, job: null, ride: null, offer: null } });
function setup(request) {
  const useWarung = create(() => ({ data: { warung: { id: 1, cash: 50000 }, savings: 0 } }));
  const useUsaha = create(() => ({ data: { kas: 50000 } }));
  const useGang = create(() => ({ inside: null, data: { layout: { gate: { x: -30, z: -60 }, origin: [6000, 0, 3000] } } }));
  const useGame = create((set) => ({ playerPos: [6004, .83, 3020], waypoint: null,
    setWaypoint: (waypoint) => set({ waypoint }), setToast: (toast) => set({ toast }) }));
  const useMobility = create(() => ({ vehicles: [] }));
  const dependencies = {
    zustand: { create },
    '@/game/energy/store': { takeEnergy: () => {} },
    '@/services/world/client': { worldRequest: request },
    '@/lib/id': { createId: () => 'receipt' },
    '@/state/game-store': { useGame },
    '@/game/vehicles/model': { bikeModel: () => true, vehicleFor: () => null },
    '@/game/vehicles/runtime': { ownVehicle: () => null, vehicleHeartbeat: () => null, leaveVehicle: async () => {} },
    '@/game/gang/store': { useGang },
    '@/game/home/store': { useHome: create(() => ({ inside: false })) },
    '@/game/warung/store': { useWarung },
    '@/game/usaha/store': { useUsaha },
    '@/game/mobility/store': { useMobility, mobilityCommand: async () => {} },
    '@/net/channel-store': { connectionId: 'me', useChannels: create(() => ({})) },
    './passenger': {},
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    assert.ok(dependencies[name], name); return dependencies[name];
  }, Date, setTimeout });
  return { ...exports, useGame, useWarung, useUsaha, useGang, runtime: dependencies["@/game/vehicles/runtime"] };
}

test('completion immediately updates both shared cash displays from the response', async () => {
  const s = setup(async () => snapshot());
  await s.ojekCommand('complete', { orderId: 1 });
  assert.equal(s.useWarung.getState().data.warung.cash, 60000);
  assert.equal(s.useUsaha.getState().data.kas, 60000);
  assert.equal(s.useOjek.getState().data.payment.net, 10000);
  assert.equal(s.paymentText(payment), 'Ongkos Rp20.000 − setoran 50% (Rp10.000) = +Rp10.000');
});

test('pre-warung earnings update savings, and late polls cannot undo completion', async () => {
  let resolvePoll;
  const s = setup(async (_, body) => body.action === 'read'
    ? new Promise((resolve) => { resolvePoll = resolve; }) : snapshot(false));
  s.useWarung.setState({ data: { warung: null, savings: 0 } });
  const poll = s.ojekCommand('read');
  await s.ojekCommand('complete', { orderId: 1 });
  resolvePoll({ ...snapshot(false), ojek: { ...snapshot(false).ojek, savings: 0 } });
  await poll;
  assert.equal(s.useWarung.getState().data.savings, 10000);
  assert.equal(s.useWarung.getState().data.warung, null);
  assert.equal(s.useOjek.getState().data.ojek.savings, 10000);
});

test('ordering in a gang keeps the passenger there and guides the driver through the portal', async () => {
  const pickup = { id: 'passenger', name: 'Budi', x: 6004, z: 3020, gang: 7 };
  const ride = { id: 1, pickup, dropoff: { x: 106, z: 115.8 }, status: 'open' };
  const s = setup(async () => ({ ...snapshot(), ojek: { ...snapshot().ojek, ride } }));
  s.useGang.setState({ inside: 7 });
  await s.orderRide('taman');
  assert.equal(s.useGang.getState().inside, 7);
  assert.equal(s.useGame.getState().pendingTeleport, undefined);
  s.useGang.setState({ inside: null });
  assert.equal(s.ojekWaypoint(pickup).x, -30);
  assert.equal(s.ojekWaypoint(pickup).z, -62);
  s.useGang.setState({ inside: 7 });
  assert.equal(s.ojekWaypoint(pickup), pickup);
  s.useGang.setState({ inside: 1 });
  assert.equal(s.ojekWaypoint(pickup).z, 2988, 'exit wrong gang before entering the target gang');
});

test('a city NPC trip cannot finish at the gang exit waypoint', () => {
  const calls = [];
  const s = setup(async (_, body) => { calls.push(body); return snapshot(); });
  s.useGang.setState({ inside: 1 });
  s.runtime.ownVehicle = () => ({ model: 'motorcycle' });
  s.runtime.vehicleHeartbeat = () => ({ x: 6000, z: 2988, yaw: 0, speed: 0 });
  const order = { id: 4, pickup: { x: 6, z: 12 }, dropoff: { x: 104, z: 24.2 },
    expiresAt: new Date(Date.now() + 60000).toISOString(), acceptedAt: new Date(0).toISOString(), minSeconds: 6 };
  s.useOjek.setState({ data: { ...snapshot(), ojek: { ...snapshot().ojek, order } }, picked: 4 });
  s.ojekTick();
  assert.equal(calls.length, 0);
});
