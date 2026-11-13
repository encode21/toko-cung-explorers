import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Load the production metadata without a browser or generated build artifacts.
const cache = new Map();
async function moduleUrl(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  let { outputText } = ts.transpileModule(await readFile(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const match of [...outputText.matchAll(/from ["']([^"']+)["']/g)]) {
    const specifier = match[1];
    const dependency = specifier.startsWith(".")
      ? await moduleUrl(new URL(`${specifier}.ts`, url))
      : import.meta.resolve(specifier);
    outputText = outputText.replace(match[0], `from "${dependency}"`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  cache.set(url.href, result);
  return result;
}
const load = (path) =>
  moduleUrl(new URL(`../src/game/${path}.ts`, import.meta.url)).then((url) => import(url));
const plan = await load("world/outdoor-layout");
const {
  BUILDING_LOTS,
  validateLots,
  buildingBounds,
  rect,
  intersects,
  ROADS,
  DRIVEWAYS,
  PARKING,
  SPAWN_CLEARANCE,
} = plan;
const { waterAt } = await load("swimming/model");
const { TREE_SPOTS } = await load("world/street-props");
const { NATURAL_TREE_TRUNK_RADIUS } = await load("world/vegetation");
const { CITY_AD_SLOTS, CITY_AD_POLE, CITY_AD_PANEL_HALF } = await load("world/city-advertising");
const { CITY_LAMP_POSITIONS, CITY_LAMP_BASE_HALF } = await load("world/city-street-fixtures");
const { NPC_CONFIG } = await load("npc/population");
const { WORLD_POINTS } = await load("world/building/plan");
const { SUPPLIER_TEMP_POST, WORLD_WAREHOUSE_DOCK } = await load("world/landmarks");
const { TRUCK_START, TRUCK_PARCELS, TRUCK_DOCK, TRUCK_WAREHOUSE } =
  await load("missions/truck-model");
const { ANCHORS } = await load("missions/model");
const { CITY_HELIPAD } = await load("mountain/model");
const { VENUE_ENTRANCE } = await load("club/venue-layout");
const { OBBY_BOUNDS } = await load("obby/model");
const { cityArchitecture } = await load("world/city-architecture");
const errors = [...validateLots()];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const lotBounds = BUILDING_LOTS.map((lot) => ({ ...buildingBounds(lot), id: lot.id }));
const infill = BUILDING_LOTS.filter((lot) => lot.id.startsWith("infill-"));
check(infill.length > 0, "City density work must include additional occupied parcels");
check(
  new Set(BUILDING_LOTS.map((lot) => lot.id)).size === BUILDING_LOTS.length,
  "Lot IDs must be unique",
);
const anchors = [
  ...WORLD_POINTS,
  ...Object.values(ANCHORS),
  { id: "supplier", position: SUPPLIER_TEMP_POST },
  { id: "warehouse", position: WORLD_WAREHOUSE_DOCK },
  { id: "truck-start", position: [TRUCK_START.x, 0, TRUCK_START.z] },
  { id: "truck-parcels", position: TRUCK_PARCELS },
  { id: "truck-dock", position: TRUCK_DOCK },
  { id: "truck-warehouse", position: TRUCK_WAREHOUSE },
  { id: "city-boarding", position: CITY_HELIPAD.boarding },
  { id: "underground-entrance", position: VENUE_ENTRANCE },
];
// Sample at less than the avatar radius: a narrow trunk cannot fall between route samples.
const npcSamples = NPC_CONFIG.flatMap((npc) => {
  const result = npc.points.map((p) => ({ id: npc.id, x: p[0], z: p[2] }));
  for (let i = 1; i < npc.points.length; i++) {
    const a = npc.points[i - 1],
      b = npc.points[i];
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.2);
    for (let step = 1; step < count; step++) {
      const t = step / count;
      result.push({ id: npc.id, x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t });
    }
  }
  return result;
});
function clearsPoint(bounds, x, z, radius = 0.38) {
  return (
    Math.hypot(
      Math.max(bounds.minX - x, 0, x - bounds.maxX),
      Math.max(bounds.minZ - z, 0, z - bounds.maxZ),
    ) >= radius
  );
}
for (const lot of infill) {
  const b = buildingBounds(lot);
  for (const x of [b.minX, lot.x, b.maxX])
    for (const z of [b.minZ, lot.z, b.maxZ])
      check(waterAt(x, z) === null, `${lot.id} has a submerged parcel at ${x},${z}`);
  check(!intersects(b, OBBY_BOUNDS, 0.4), `${lot.id} obstructs the Obby approach`);
  check(
    clearsPoint(b, CITY_HELIPAD.position[0], CITY_HELIPAD.position[2], 7),
    `${lot.id} obstructs the helipad`,
  );
  for (const anchor of anchors)
    check(
      clearsPoint(b, anchor.position[0], anchor.position[2], 0.7),
      `${lot.id} obstructs ${anchor.id}`,
    );
}
// Ordinary lots are solid; the protected store and venue buildings have their own interior collision.
for (const lot of BUILDING_LOTS.filter(
  (lot) => !["toko-cung", "partner-3", "partner-4"].includes(lot.id),
)) {
  const b = buildingBounds(lot);
  for (const point of npcSamples)
    check(
      clearsPoint(b, point.x, point.z),
      `${lot.id} obstructs ${point.id} at ${point.x},${point.z}`,
    );
  const architecture = cityArchitecture(lot);
  for (const part of [...architecture.masonry, ...architecture.trim, ...architecture.glazing]) {
    check(
      part.s.every((n) => Number.isFinite(n) && n > 0),
      `${lot.id} has invalid geometry dimensions`,
    );
    const halfZ =
      (Math.abs(Math.cos(part.rx ?? 0)) * part.s[2] +
        Math.abs(Math.sin(part.rx ?? 0)) * part.s[1]) /
      2;
    check(
      Math.abs(part.p[0]) + part.s[0] / 2 <= lot.width / 2 + 1.001 &&
        Math.abs(part.p[2]) + halfZ <= lot.depth / 2 + 1.001,
      `${lot.id} detail escapes the reserved parcel envelope`,
    );
  }
}
const fixtures = [
  ...TREE_SPOTS.map((tree, i) => ({
    id: `tree-${i}`,
    bounds: rect(
      tree.x,
      tree.z,
      2 * NATURAL_TREE_TRUNK_RADIUS * tree.scale,
      2 * NATURAL_TREE_TRUNK_RADIUS * tree.scale,
    ),
  })),
  ...CITY_LAMP_POSITIONS.map(([x, , z], i) => ({
    id: `lamp-${i}`,
    bounds: rect(x, z, CITY_LAMP_BASE_HALF * 2, CITY_LAMP_BASE_HALF * 2),
  })),
  ...CITY_AD_SLOTS.map((slot) => ({
    id: `ad-pole-${slot.id}`,
    bounds: rect(
      slot.position[0] + Math.cos(slot.yaw) * CITY_AD_POLE.x,
      slot.position[2] - Math.sin(slot.yaw) * CITY_AD_POLE.x,
      CITY_AD_POLE.half * 2,
      CITY_AD_POLE.half * 2,
    ),
  })),
];
for (const fixture of fixtures) {
  const b = fixture.bounds;
  const x = (b.minX + b.maxX) / 2,
    z = (b.minZ + b.maxZ) / 2;
  for (const zone of [...ROADS, ...DRIVEWAYS, ...PARKING, ...lotBounds])
    check(!intersects(b, zone), `${fixture.id} at ${x},${z} obstructs ${zone.id}`);
  check(!intersects(b, SPAWN_CLEARANCE), `${fixture.id} blocks spawn`);
  for (const point of npcSamples)
    check(
      clearsPoint(b, point.x, point.z),
      `${fixture.id} at ${x},${z} obstructs ${point.id} at ${point.x},${point.z}`,
    );
  for (const anchor of anchors)
    check(
      clearsPoint(b, anchor.position[0], anchor.position[2]),
      `${fixture.id} obstructs ${anchor.id}`,
    );
}
// The elevated panel must also clear vehicles and facades, despite its narrow ground-level pole.
for (const slot of CITY_AD_SLOTS) {
  const [halfX, , halfZ] = CITY_AD_PANEL_HALF;
  const width = 2 * (Math.abs(Math.cos(slot.yaw)) * halfX + Math.abs(Math.sin(slot.yaw)) * halfZ);
  const depth = 2 * (Math.abs(Math.sin(slot.yaw)) * halfX + Math.abs(Math.cos(slot.yaw)) * halfZ);
  const b = rect(slot.position[0], slot.position[2], width, depth);
  for (const zone of [...ROADS, ...DRIVEWAYS, ...lotBounds])
    check(!intersects(b, zone), `ad-panel-${slot.id} overlaps ${zone.id}`);
}
assert.deepEqual([...new Set(errors)], [], "City layout clearance regression");
console.log(
  `PASS city layout: ${BUILDING_LOTS.length} lots (${infill.length} dry infill), ${TREE_SPOTS.length} trees, ${CITY_LAMP_POSITIONS.length} lamps, ${CITY_AD_SLOTS.length} ad slots; clear NPC/mission access and facade envelopes.`,
);
