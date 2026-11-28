import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = readFileSync(new URL("../src/game/gang/model.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import[\s\S]*?;\n/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const model = {};
const showroom = {};
compile("../src/game/showroom/layout.ts", showroom);
vm.runInNewContext(compiled, { exports: model, ...showroom });
const architecture = {};
const city = {};
function compile(path, exports, context = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  vm.runInNewContext(
    ts.transpileModule(source.replace(/^import[\s\S]*?;\n/gm, ""), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, ...context },
  );
}
compile("../src/game/world/city-architecture.ts", city);
const storefront = {};
compile("../src/game/warung/storefront.ts", storefront);
compile("../src/game/gang/architecture.ts", architecture, { ...city, ...storefront });
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
test("the prolog starter house shares the current facade before a shop is opened", () => {
  const starter = { ...house, mine: true };
  const prolog = { version: 2, completedAt: null };
  const data = { gang: 1, home: { gang: 1, number: 1 }, houses: [starter] };
  assert.equal(model.usesPrologHomeFacade(data, prolog), true);
  assert.equal(model.ownPorchWarung(data), null, "the starter facade has no shop access");
  assert.equal(model.usesPrologHomeFacade({ ...data, gang: 2 }, prolog), false);
  assert.equal(model.usesPrologHomeFacade(data, { ...prolog, completedAt: "done" }), false);

  const preview = architecture.gangArchitecture(starter, undefined, true);
  const shop = architecture.gangArchitecture({ ...starter, warung: { level: 1, lot: null } });
  assert.equal(JSON.stringify(preview), JSON.stringify(shop));
  assert.notEqual(JSON.stringify(preview), JSON.stringify(architecture.gangArchitecture(starter)));
});
test("shopfront is taller than a house and the doorway stays clear on gang and city plots", () => {
  assert.ok(storefront.warungBuildingHeight(1) > storefront.warungBuildingHeight(0));
  for (const fit of [undefined, storefront.lotFit(10.5, 6)]) {
    const front = storefront.warungDoorFront(fit);
    for (const level of [1, 2, 3, 4, 5]) {
      const parts = architecture.gangArchitecture({ ...house, warung: { level, lot: null } }, fit);
      const blocking = [...parts.masonry, ...parts.trim, ...parts.glazing].filter(
        ({ p, s }) =>
          Math.abs(p[0]) < s[0] / 2 + 0.38 &&
          p[1] + s[1] / 2 > 0.2 &&
          p[1] - s[1] / 2 < 1.85 &&
          p[2] + s[2] / 2 > front - 0.65 &&
          p[2] - s[2] / 2 < front + 1.7,
      );
      assert.equal(
        blocking.length,
        0,
        `level ${level}, ${fit ? "city" : "gang"} entrance clearance`,
      );
    }
  }
});
test("the shared entrance has closed side walls and a canopy joined to the house", () => {
  for (const fit of [undefined, storefront.lotFit(10.5, 6)]) {
    for (const level of [1, 2, 3, 4, 5]) {
      const width = fit ? Math.min(fit.width, level === 5 ? 14 : 10) : level === 5 ? 14 : 10;
      const e = storefront.warungEnvelope(width, level, fit);
      const parts = architecture.gangArchitecture({ ...house, warung: { level, lot: null } }, fit);
      for (const side of [-1, 1]) {
        const wall = parts.masonry.find(
          ({ p, s }) => Math.abs(p[0] - side * e.half) < 0.001 && Math.abs(s[1] - 3.78) < 0.001,
        );
        assert.ok(wall, `level ${level} has both solid side walls`);
        assert.ok(wall.p[2] - wall.s[2] / 2 <= e.back && wall.p[2] + wall.s[2] / 2 >= e.front);
      }
      const stripes = parts.trim.filter(
        ({ color, rx }) => ["#c5a580", "#fff2d7"].includes(color) && rx === e.slope,
      );
      assert.equal(stripes.length, 12);
      for (const { p, s, rx } of stripes) {
        assert.ok(p[2] - (s[2] / 2) * Math.cos(rx) <= e.back, "canopy meets the existing house");
        assert.ok(p[2] + (s[2] / 2) * Math.cos(rx) > e.front, "canopy covers the full entrance");
      }
    }
  }
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
test("only the home owner gets the shared-home destination, even while their shop is inactive", () => {
  const shop = { id: 7, level: 1, lot: null };
  const ownHouse = { ...house, mine: true, inactive: true, warung: shop };
  const data = { gang: 1, home: { gang: 1, number: 1 }, houses: [ownHouse] };
  assert.equal(model.ownPorchWarung(data)?.id, shop.id);
  assert.equal(model.ownPorchWarung({ ...data, gang: 2 }), null, "visiting a different gang");
  assert.equal(
    model.ownPorchWarung({ ...data, houses: [{ ...ownHouse, mine: false }] }),
    null,
    "another player's house",
  );
  assert.equal(
    model.ownPorchWarung({ ...data, houses: [{ ...ownHouse, warung: { ...shop, lot: 0 } }] }),
    null,
    "relocated shops keep the separate home entrance",
  );
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

test("in the kampung a city waypoint guides to the halte; debtor and showroom routes resume in the city", () => {
  const halte = model.gangHalte(layout);
  const guide = model.gangExitGuide(true, layout);
  assert.deepEqual([...guide.position], [halte[0], 0, halte[2]]);
  assert.equal(guide.realm, "WORLD");
  assert.equal(model.gangExitGuide(false, layout), null, "no waypoint: town events keep the arrow");
  assert.equal(model.gangExitGuide(true, undefined), null);
  assert.equal(model.waypointAfterGang("warung-debt-7"), "warung-debt-7");
  assert.equal(model.waypointAfterGang("venue-showroom"), "venue-showroom");
  assert.equal(model.waypointAfterGang("map-store"), null);
  assert.equal(model.waypointAfterGang(null), null);
});
