import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = readFileSync(new URL("../src/game/gang/model.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const model = {};
vm.runInNewContext(compiled, { exports: model });
const architecture = {};
const city = {};
function compile(path, exports, context = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  vm.runInNewContext(
    ts.transpileModule(source.replace(/^import .*;$/gm, ""), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, ...context },
  );
}
compile("../src/game/world/city-architecture.ts", city);
compile("../src/game/gang/architecture.ts", architecture, city);
const style = Object.fromEntries(
  ["paint", "roof", "fence", "plants", "lamp"].map((k) => [
    k,
    { id: "none", color: "#fff", name: k },
  ]),
);
const house = { number: 1, ownerId: "a", style, warung: null };
const layout = {
  origin: [6000, 0, 3000],
  house_spacing: 24,
  house_offset: 18,
  render_distance: 52,
};

test("five shop levels have distinct geometry; a city shop keeps only its home shell", () => {
  const shapes = [1, 2, 3, 4, 5].map((level) =>
    JSON.stringify(architecture.gangArchitecture({ ...house, warung: { level, lot: null } })),
  );
  assert.equal(new Set(shapes).size, 5);
  const city = [1, 2, 3, 4, 5].map((level) =>
    JSON.stringify(architecture.gangArchitecture({ ...house, warung: { level, lot: 0 } })),
  );
  assert.equal(new Set(city).size, 1);
});
test("full gang has stable paired addresses and mounts only nearby houses", () => {
  const houses = Array.from({ length: 10 }, (_, i) => ({ ...house, number: i + 1 }));
  assert.equal(
    new Set(houses.map((h) => JSON.stringify(model.housePose(h.number, layout)))).size,
    10,
  );
  const near = model.visibleHouses({ layout, houses }, 6000, 2995).map((h) => h.number);
  assert.deepEqual([...near], [1, 2, 3, 4]);
  assert.equal(model.visibleHouses({ layout, houses }, 6000, 3058).length, 10);
  const front = model.houseFront(1, layout);
  assert.equal(front[0], 5990);
  assert.equal(front[2], 3010);
});
test("same coordinates cannot reveal occupants from another gang", () => {
  assert.equal(model.sameGang(1, 2), false);
  assert.equal(model.sameGang(1, null), false);
  assert.equal(model.sameGang(1, 1), true);
  assert.equal(model.sameGang(null, undefined), true);
});

const ambient = {};
compile("../src/game/gang/ambient.ts", ambient);
test("ambient residents honor the mobile cap and cull distant actors", () => {
  const residents = Array.from({ length: 7 }, (_, i) => ({
    id: String(i),
    from: [i, 0],
    to: [i, 0],
    speed: 0,
    yaw: 0,
    offset: 0,
    pause: 0,
  }));
  const a = { residents, mobile_limit: 5, desktop_limit: 7, render_distance: 38 };
  assert.equal(ambient.nearbyResidents(a, 0, 0, 10, true).length, 5);
  assert.equal(ambient.nearbyResidents(a, 0, 0, 10, false).length, 7);
  assert.equal(ambient.nearbyResidents(a, 0, 100, 10, true).length, 0);
  const walker = { ...residents[0], to: [0, 10], speed: 1, pause: 2 };
  assert.equal(ambient.residentPose(walker, 5).z, 5);
  assert.equal(ambient.residentPose(walker, 11).moving, false);
  assert.equal(ambient.residentPose(walker, 17).z, 5);
});

test("chat freezes a resident route clock, visibility and resume position", () => {
  const r = { id: "sayur", from: [0, 0], to: [0, 20], speed: 1, pause: 2, offset: 0, yaw: 0 };
  const times = new Map([[r.id, 5]]);
  const before = ambient.residentPose(r, times.get(r.id));
  for (let i = 0; i < 1200; i++)
    ambient.advanceResidentTimes(times, [r], 1 / 60, "gang-sayur", 200);
  assert.deepEqual(ambient.residentPose(r, times.get(r.id)), before);
  const area = { residents: [r], render_distance: 2, mobile_limit: 1, desktop_limit: 1 };
  assert.equal(ambient.nearbyResidents(area, 0, 5, 200, false, times)[0], r.id);
  ambient.advanceResidentTimes(times, [r], 1 / 60, null, 200);
  const after = ambient.residentPose(r, times.get(r.id));
  assert(Math.abs(after.z - before.z) <= r.speed / 60 + 0.00001);
});
