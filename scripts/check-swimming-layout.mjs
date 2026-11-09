import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Reuse the repository's pure-metadata checks without requiring a browser or a cloud session.
const compiled = new Map();
async function moduleUrl(url) {
  if (compiled.has(url.href)) return compiled.get(url.href);
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const match of [...outputText.matchAll(/from ["'](\.[^"']+)["']/g)]) {
    const dependency = await moduleUrl(
      new URL(match[1].endsWith(".ts") ? match[1] : `${match[1]}.ts`, url),
    );
    outputText = outputText.replace(match[0], `from "${dependency}"`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  compiled.set(url.href, result);
  return result;
}
const metadata = async (path) => import(await moduleUrl(new URL(path, import.meta.url)));
const { coastDistance, FISHING_WATER_BOUNDS } = await metadata("../src/game/swimming/model.ts");
const { RESERVED, BUILDING_LOTS, buildingBounds, SPAWN_CLEARANCE, intersects, contains, rect } =
  await metadata("../src/game/world/outdoor-layout.ts");
const { NPC_CONFIG } = await metadata("../src/game/npc/population.ts");
const { ACTIVITY_PROPS, PROP_SIZES } = await metadata("../src/game/world/props/activity-props.ts");
const { TREE_SPOTS, BENCHES } = await metadata("../src/game/world/street-props.ts");
const { STAGED_VEHICLES, VEHICLE_SIZE } = await metadata("../src/game/assets/vehicles.ts");

const occupied = [
  ...RESERVED,
  ...BUILDING_LOTS.map((lot) => ({ id: lot.id, ...buildingBounds(lot) })),
  { id: "player-spawn", ...SPAWN_CLEARANCE },
  ...ACTIVITY_PROPS.map((prop) => ({
    id: prop.id,
    ...rect(prop.position[0], prop.position[2], PROP_SIZES[prop.kind][0], PROP_SIZES[prop.kind][2]),
  })),
  ...TREE_SPOTS.map((tree, index) => ({
    id: `tree-${index}`,
    ...rect(tree.x, tree.z, tree.scale * 2.5, tree.scale * 2.5),
  })),
  ...BENCHES.filter((bench) => bench.position[1] >= 0).map((bench) => ({
    id: bench.id,
    ...rect(bench.position[0], bench.position[2], 2.5, 1),
  })),
  ...STAGED_VEHICLES.map((vehicle) => ({
    id: vehicle.id,
    ...rect(
      vehicle.p[0],
      vehicle.p[2],
      VEHICLE_SIZE[vehicle.kind][0],
      VEHICLE_SIZE[vehicle.kind][2],
    ),
  })),
];
for (const footprint of [FISHING_WATER_BOUNDS]) {
  for (const other of occupied)
    assert.equal(intersects(footprint, other), false, `Beach must leave ${other.id} clear`);
  assert(footprint.minX > -55.75 && footprint.maxX < 55.75, "Beach remains inside world walls");
  assert(footprint.minZ > -55.75 && footprint.maxZ < 55.75, "Beach remains inside world walls");
  for (const npc of NPC_CONFIG) {
    for (let index = 0; index < npc.points.length; index++) {
      const from = npc.points[index];
      const to = npc.points[(index + 1) % npc.points.length];
      for (let sample = 0; sample <= 100; sample++) {
        const t = sample / 100;
        const point = { x: from[0] + (to[0] - from[0]) * t, z: from[2] + (to[2] - from[2]) * t };
        assert.equal(
          contains(footprint, point, -0.6),
          false,
          `Beach must leave ${npc.id}'s route clear`,
        );
      }
    }
  }
}

for (const other of occupied) {
  // Roads/sidewalks have their own physical deck, including extensions over sea.
  if (other.kind === "road" || other.kind === "sidewalk") continue;
  const x = (other.minX + other.maxX) / 2,
    z = (other.minZ + other.maxZ) / 2;
  assert(coastDistance(x, z) <= 0, `Open coast leaves ${other.id} on land`);
}
for (const npc of NPC_CONFIG)
  for (let index = 0; index < npc.points.length; index++) {
    const a = npc.points[index],
      b = npc.points[(index + 1) % npc.points.length];
    for (let i = 0; i <= 100; i++)
      assert(
        coastDistance(a[0] + ((b[0] - a[0]) * i) / 100, a[2] + ((b[2] - a[2]) * i) / 100) <= 0,
        `Coast leaves ${npc.id}'s route dry`,
      );
  }
console.log(
  "PASS coastal town: occupied lot centres and NPC routes remain dry; fishing parcel remains clear.",
);

const {emitSplash,takeSplashes,clearSplashes,tireWaterContact}=await metadata("../src/game/swimming/splash-pool.ts");
const {waterAt}=await metadata("../src/game/swimming/model.ts");
clearSplashes();
assert.equal(emitSplash(0,0,1),false,"Dry shop/road must not emit water particles");
assert.equal(tireWaterContact(-39,2,-30),false,"Elevated wheels do not touch water");
assert.equal(tireWaterContact(-50,-3,-42),false,"No deep-water tyre spray");
const shallow=waterAt(-39,-30);
assert(shallow && shallow.depth>0 && shallow.depth<.5);
assert(tireWaterContact(-39,shallow.floor,-30),"A tyre on the shallow bed contacts the surface");
for(let i=0;i<100;i++)emitSplash(-39,-30,1);
assert.equal(takeSplashes().length,16,"All emitters share one bounded burst queue");
assert.equal(takeSplashes().length,0,"Each queued splash is consumed once");
console.log("PASS: dry/elevated/deep tyre contacts, shallow contact, capped shared pool");
