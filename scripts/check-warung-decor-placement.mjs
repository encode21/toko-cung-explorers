import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Exercise the actual geometry, validators and isolated fixture transport together.
// No browser, account, network, live world operation, or elapsed timer is involved.
async function loadLocal(file, dependencies = {}) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "setTimeout", compiled)(
    (id) => {
      assert.ok(id in dependencies, `No live or unexpected dependency: ${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
    (callback) => callback(),
  );
  return module.exports;
}

const placement = await loadLocal("src/game/warung/decor-placement.ts");
const decor = await loadLocal("src/game/warung/decor.ts", { "./decor-placement": placement });
const model = await loadLocal("src/game/warung/model.ts");
const merchandise = await loadLocal("src/game/warung/merchandise.ts");
const { roomParts } = await loadLocal("src/game/warung/room-parts.ts", {
  "./model": model,
  "./decor": decor,
  "./merchandise": merchandise,
});
const data = await loadLocal("tests/fixtures/warung/data.ts");
const { worldRequest, resetTransport } = await loadLocal("tests/fixtures/warung/client.ts", {
  "./data": data,
  "@/game/warung/decor-placement": placement,
});
const { getDecorInstances, getDecorPlacement, validateDecorPlacement, constrainDecorPlacement } =
  placement;
const action = (action, payload = {}) => worldRequest("warung", { action, ...payload });
const move = (decorId, instanceId, next, payload = {}) =>
  action("decor_place", { decorId, instanceId, placement: next, ...payload });
const plant = { surface: "floor", x: -3.3, y: 0.03, z: 3.5, rotation: 0 };
const poster = { surface: "left-wall", x: -5.76, y: 2.5, z: -2.5, rotation: Math.PI / 2 };
const table = { surface: "floor", x: -2.8, y: 0.03, z: 3.45, rotation: 0 };

resetTransport("decor-placement");
let initial = await action("read");
let style = initial.warung.style;
assert.equal(initial.decorPlacementSupported, true);
assert.equal(initial.warung.level, 2);
assert.deepEqual(new Set(style.extras), new Set(["poster", "tanaman", "meja-makan"]));
assert.equal(style.placements, undefined, "Old styles do not need a placement migration");
assert.equal(getDecorInstances(style).length, 6, "Three posters, two plants and one table");
assert.deepEqual(getDecorPlacement(style, "tanaman:0"), {
  surface: "floor",
  x: -5.2,
  y: 0,
  z: 4.25,
  rotation: 0,
});
assert.deepEqual(decor.extraInstanceParts("poster:0")[0].p, [-5.8, 2.1, 1.6]);
assert.deepEqual(decor.extraInstanceParts("tanaman:1")[0].p, [5.2, 0.35, 4.25]);
assert.deepEqual(decor.extraInstanceParts("meja-makan:0")[0].p, [3.6, 0.78, 3.3]);
for (const instance of placement.DECOR_DEFAULT_INSTANCES) {
  const parts = decor.extraInstanceParts(instance.id);
  assert.ok(parts.length > 0, `Missing model for ${instance.id}`);
  assert.ok(
    parts.every(
      (item) => item.p.every(Number.isFinite) && item.s.every((v) => Number.isFinite(v) && v > 0),
    ),
  );
}
assert.deepEqual(
  decor.extraParts(style),
  getDecorInstances(style).flatMap((instance) =>
    decor.extraInstanceParts(instance.id, instance.placement),
  ),
  "The shop shows exactly the models selected and positioned in the placement editor",
);
assert.ok(validateDecorPlacement("tanaman:0", plant, style));
assert.ok(validateDecorPlacement("poster:0", poster, style));
assert.ok(validateDecorPlacement("meja-makan:0", table, style));

// Invalid coordinates must never be normalized into an accepted server-side save.
for (const value of [NaN, Infinity, -Infinity, "0", undefined]) {
  for (const coordinate of ["x", "y", "z", "rotation"]) {
    const invalid = { ...plant, [coordinate]: value };
    assert.equal(validateDecorPlacement("tanaman:0", invalid, style), false);
    await assert.rejects(move("tanaman", "tanaman:0", invalid), /tidak sesuai/);
  }
}
for (const invalid of [null, [], false, "floor"]) {
  await assert.rejects(move("tanaman", "tanaman:0", invalid), /posisi hiasan yang valid/);
}
for (const invalid of [
  { ...plant, x: -50 },
  { ...plant, x: 50 },
  { ...plant, z: -50 },
  { ...plant, z: 50 },
  { ...plant, y: 0.8 },
  { ...plant, rotation: 0.2 },
  { ...plant, surface: "ceiling" },
  { ...plant, surface: "left-wall" },
  { ...plant, surface: "roof" },
  { ...plant, x: 0 }, // Customer walking lane.
  { ...plant, x: -3, z: -1 }, // Cashier counter.
  { ...plant, x: -3.95, z: 1.8 }, // Side stock racks.
  { ...plant, x: 3.6, z: 3.3 }, // Active dining table.
]) {
  assert.equal(validateDecorPlacement("tanaman:0", invalid, style), false);
  await assert.rejects(move("tanaman", "tanaman:0", invalid), /tidak sesuai/);
}
assert.equal(validateDecorPlacement("poster:0", { ...plant }, style), false);
assert.equal(validateDecorPlacement("poster:0", { ...poster, x: -2 }, style), false);
assert.equal(validateDecorPlacement("poster:0", { ...poster, y: 3.4 }, style), false);
assert.equal(validateDecorPlacement("missing:0", plant, style), false);
assert.equal(constrainDecorPlacement("tanaman:0", { ...plant, x: 0 }, style), null);
const constrainedWall = constrainDecorPlacement("poster:0", { ...poster, y: 99 }, style);
assert.ok(constrainedWall && constrainedWall.y <= 2.85, "Wall drag clamps below ceiling");
assert.equal(validateDecorPlacement("poster:0", constrainedWall, style), true);
const ceiling = { surface: "ceiling", x: -3, y: 3.5, z: 3.4, rotation: 0 };
assert.ok(validateDecorPlacement("lampu-gantung:0", ceiling, { extras: ["lampu-gantung"] }));
assert.equal(
  validateDecorPlacement("lampu-gantung:0", { ...ceiling, surface: "floor" }, style),
  false,
);
assert.deepEqual(await action("read"), initial, "All rejected placements are atomic");

await assert.rejects(move("unknown", "unknown:0", plant), /tidak ditemukan/);
await assert.rejects(move("tanaman", "tanaman:99", plant), /tidak ditemukan/);
await assert.rejects(move("poster", "tanaman:0", plant), /tidak ditemukan/);
await assert.rejects(move("wall-mint", "poster:0", poster), /tidak ditemukan/);
await assert.rejects(move("kipas", "kipas:0", poster), /Beli dekorasi/);
await action("decor_apply", { decorId: "tanaman", on: false });
const inactive = await action("read");
await assert.rejects(move("tanaman", "tanaman:0", plant), /Pasang hiasan/);
assert.deepEqual(await action("read"), inactive);
await action("decor_apply", { decorId: "tanaman", on: true });

// Saves preserve other placements, the ownership list, selected finishes and cash.
let current = await move("tanaman", "tanaman:0", plant, { requestId: "move-plant" });
assert.deepEqual(current.warung.style.placements, { "tanaman:0": plant });
assert.equal(current.warung.cash, initial.warung.cash);
assert.deepEqual(current.warung.style.owned, initial.warung.style.owned);
assert.equal(current.warung.style.wall, initial.warung.style.wall);
assert.equal(current.warung.style.floor, initial.warung.style.floor);
assert.equal(current.warung.style.awning, initial.warung.style.awning);
assert.deepEqual(await move("tanaman", "tanaman:0", plant, { requestId: "move-plant" }), current);
current = await move("poster", "poster:0", poster);
assert.deepEqual(current.warung.style.placements, { "tanaman:0": plant, "poster:0": poster });
assert.deepEqual(
  getDecorPlacement(current.warung.style, "poster:1"),
  getDecorPlacement(style, "poster:1"),
);
const movedParts = decor.extraInstanceParts("tanaman:0", plant);
assert.deepEqual(movedParts[0].p, [-3.3, 0.38, 3.5], "Saved position feeds the live mesh");

// Independent read snapshots and visiting the owner reconstruct saved server state.
current.warung.style.placements["tanaman:0"].x = 99;
let reloaded = await action("read");
assert.deepEqual(reloaded.warung.style.placements["tanaman:0"], plant);
await action("visit", { warungId: data.OWNER_ID });
const secondPoster = { ...poster, y: 2.4, z: -0.2 };
await move("poster", "poster:0", secondPoster);
let visiting = await action("visit", { warungId: data.OWNER_ID });
assert.deepEqual(
  visiting.visit.style.placements["poster:0"],
  secondPoster,
  "Revisit refreshes old cached visit",
);
await action("visit", { warungId: data.VISITOR_ID });
visiting = await action("visit", { warungId: data.OWNER_ID });
assert.deepEqual(visiting.visit.style.placements["tanaman:0"], plant);
await action("decor_apply", { decorId: "tanaman", on: false });
await action("decor_apply", { decorId: "tanaman", on: true });
reloaded = await action("read");
assert.deepEqual(
  getDecorPlacement(reloaded.warung.style, "tanaman:0"),
  plant,
  "Removing and reapplying remembers layout",
);

resetTransport("decor-place-retry");
initial = await action("read");
await assert.rejects(move("tanaman", "tanaman:0", { ...plant, x: 0 }), /tidak sesuai/);
await assert.rejects(
  move("tanaman", "tanaman:0", plant, { requestId: "retry-move" }),
  /belum tersimpan/,
);
assert.deepEqual(await action("read"), initial, "Failed save keeps the complete previous layout");
current = await move("tanaman", "tanaman:0", plant, { requestId: "retry-move" });
assert.deepEqual(current.warung.style.placements, { "tanaman:0": plant });
assert.deepEqual(await move("tanaman", "tanaman:0", plant, { requestId: "retry-move" }), current);
assert.equal(current.warung.cash, initial.warung.cash, "Moving is free");

// Category previews use the same shop shell and finishes; the floor stays readable.
style = {
  ...initial.warung.style,
  wall: "wall-mint",
  awning: "awning-tosca",
  floor: "floor-catur",
};
const full = roomParts(2, style);
const emptyFloor = roomParts(2, style, {
  furnishings: false,
  surroundings: false,
  extras: false,
  fixtures: false,
});
const tiles = emptyFloor.filter((part) => part.s[0] === 0.98 && part.s[2] === 0.98);
assert.equal(tiles.length, 120);
assert.deepEqual(
  new Set(tiles.map((part) => part.color)),
  new Set(decor.FLOOR_TILES["floor-catur"]),
);
assert.equal(
  emptyFloor.filter((part) => part.color === decor.WALL_COLOR["wall-mint"] && part.s[1] === 3.5)
    .length,
  3,
);
assert.equal(
  emptyFloor.filter((part) => part.finish === "fabric" && part.p[2] === 5.45).length,
  12,
);
const interiorObjects = (parts) =>
  parts.filter(
    (part) => Math.abs(part.p[0]) < 5.4 && Math.abs(part.p[2]) < 4.7 && part.p[1] > 0.05,
  );
assert.ok(interiorObjects(full).length > 20, "The normal shop retains its furnishings");
assert.equal(
  interiorObjects(emptyFloor).length,
  0,
  "Floor preview removes furniture, fixtures and extras",
);
assert.deepEqual(
  roomParts(2, style, { furnishings: true, surroundings: true, extras: true, fixtures: true }),
  full,
);

console.log(
  "Warung decor placement passed: legacy geometry, floor preview, surface/bounds/finite-number rules, fixtures/access/collision guards, ownership and active-instance checks, atomic failure/retry, idempotency, read/revisit persistence, and saved live mesh positions.",
);
