import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../src/game/story/guide-action.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;

function setup() {
  const calls = [];
  const state = {
    club: { inside: false, outdoor: false },
    dungeon: { data: null },
    gang: { inside: null },
    usaha: { inside: null },
    warung: { data: { warung: { id: 7 } }, inside: null },
    ojek: { data: { ojek: { job: null, order: null } }, target: null },
  };
  const destinations = new Set([
    "map-store",
    "usaha-warung",
    "usaha-warteg",
    "usaha-kos",
    "ojek-pickup",
    "ojek-dropoff",
  ]);
  const stores = Object.fromEntries(
    Object.entries(state).map(([key, value]) => [key, { getState: () => value }]),
  );
  const modules = {
    "@/game/club/store": { useClub: stores.club },
    "@/game/dungeon/store": { useDungeon: stores.dungeon },
    "@/game/gang/store": { useGang: stores.gang },
    "@/game/usaha/store": { useUsaha: stores.usaha },
    "@/game/warung/store": { useWarung: stores.warung },
    "@/game/ojek/store": { useOjek: stores.ojek, ojekTarget: () => state.ojek.target },
    "@/game/navigation/map-destinations": {
      mapDestination: (id) => (destinations.has(id) ? { id } : undefined),
    },
    "@/state/game-store": {
      useGame: { getState: () => ({ setWaypoint: (id) => calls.push(["waypoint", id]) }) },
    },
    "@/state/hud-store": {
      useHud: { getState: () => ({ setSheet: (id) => calls.push(["sheet", id]) }) },
    },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(modules[name], `Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  return { ...exports, state, calls, destinations };
}

function section(id, type, page = 0, extra = {}) {
  return { id, page, current: { progress: { type, done: false }, ...extra } };
}

test("card selection does not navigate; only finishing the explanation starts the route", () => {
  const h = setup();
  const action = h.resolveGuideAction(section("dapur", "owns"));
  assert.equal(action.waypoint, "usaha-warteg");
  assert.deepEqual(h.calls, []);
  h.startGuideAction(action);
  assert.deepEqual(h.calls, [
    ["sheet", null],
    ["waypoint", "usaha-warteg"],
  ]);
});

test("same goal types route by story section and known page, without inventing unknown targets", () => {
  const h = setup();
  assert.equal(h.resolveGuideAction(section("jalanan", "owns")).sheet, "ojek");
  assert.equal(h.resolveGuideAction(section("kos", "owns")).waypoint, "usaha-kos");
  assert.equal(h.resolveGuideAction(section("dapur", "journal", 1)).waypoint, "map-store");
  assert.equal(h.resolveGuideAction(section("dapur", "journal", 2)).waypoint, "usaha-warteg");
  assert.equal(h.resolveGuideAction(section("dagang", "journal")).sheet, "warung-community");
  assert.equal(h.resolveGuideAction(section("kos", "new_server_goal")), null);
  assert.equal(h.resolveGuideAction({ id: "dagang", current: null }), null);
});

test("warung prerequisites and underlying chapter claims open Warungku instead of claiming remotely", () => {
  const h = setup();
  const missing = h.resolveGuideAction(section("dapur", "owns", 0, { needsWarung: true }));
  assert.equal(missing.sheet, "warung");
  assert.equal(missing.waypoint, undefined);
  const claim = h.resolveGuideAction(
    section("dagang", "warung_story", 0, {
      progress: { type: "warung_story", claimInWarung: true },
    }),
  );
  assert.equal(claim.sheet, "warung");
  assert.equal(claim.waypoint, undefined);
  h.state.warung.inside = { id: 7 };
  assert.equal(h.resolveGuideAction(section("dagang", "employees")).waypoint, undefined);
});

test("missing or disappeared owned-warung destinations fall back to the app", () => {
  const h = setup();
  const action = h.resolveGuideAction(section("dagang", "warung_story"));
  assert.equal(action.waypoint, "usaha-warung");
  h.destinations.delete("usaha-warung");
  assert.equal(h.resolveGuideAction(section("dagang", "warung_story")).waypoint, undefined);
  h.startGuideAction(action);
  assert.deepEqual(h.calls, [["sheet", "warung"]]);
});

test("ojek explanation follows the live order phase, or opens the app when the order ends", () => {
  const h = setup();
  const task = section("jalanan", "ojek_trips");
  assert.equal(h.resolveGuideAction(task).sheet, "ojek");
  const job = { pickup: { id: "start" }, dropoff: { id: "end" } };
  h.state.ojek.data.ojek.job = job;
  h.state.ojek.target = job.pickup;
  const action = h.resolveGuideAction(task);
  assert.equal(action.waypoint, "ojek-pickup");
  h.state.ojek.target = job.dropoff;
  h.startGuideAction(action);
  assert.deepEqual(h.calls, [
    ["sheet", null],
    ["waypoint", "ojek-dropoff"],
  ]);
  h.calls.length = 0;
  h.state.ojek.data.ojek.job = null;
  h.state.ojek.target = null;
  h.startGuideAction(action);
  assert.deepEqual(h.calls, [["sheet", "ojek"]]);
});

test("interiors and dungeon instances keep current guidance and explain the exit requirement", () => {
  for (const activate of [
    (s) => (s.dungeon.data = { instance: {} }),
    (s) => (s.club.inside = true),
    (s) => (s.gang.inside = 9),
    (s) => (s.warung.inside = { id: 20 }),
    (s) => (s.usaha.inside = "kos"),
  ]) {
    const h = setup();
    const task = section("dapur", "owns");
    const before = h.resolveGuideAction(task);
    activate(h.state);
    const after = h.resolveGuideAction(task);
    assert.equal(after.waypoint, undefined);
    assert.match(after.help, /Keluar|Kembali ke kota/);
    h.startGuideAction(before);
    assert.deepEqual(h.calls, [["sheet", "usaha"]]);
  }
});
