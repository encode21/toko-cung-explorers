import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "three";

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
const { OBBY_BOUNDS, OBBY_PLATFORMS, platformPosition } = await metadata(
  "../src/game/obby/model.ts",
);
const { RESERVED, BUILDING_LOTS, buildingBounds, SPAWN_CLEARANCE, intersects, contains, rect } =
  await metadata("../src/game/world/outdoor-layout.ts");
const { NPC_CONFIG } = await metadata("../src/game/npc/population.ts");
const { ACTIVITY_PROPS, PROP_SIZES } = await metadata("../src/game/world/props/activity-props.ts");
const { TREE_SPOTS, BENCHES } = await metadata("../src/game/world/street-props.ts");
const { STAGED_VEHICLES, VEHICLE_SIZE } = await metadata("../src/game/assets/vehicles.ts");

const entryRamp = { minX: 27.48, maxX: 28.92, minZ: -18.7, maxZ: -16.3 };
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
for (const footprint of [OBBY_BOUNDS, entryRamp]) {
  for (const other of occupied)
    assert.equal(intersects(footprint, other), false, `Obby must leave ${other.id} clear`);
  assert(footprint.minX > -55.75 && footprint.maxX < 55.75, "Obby remains inside world walls");
  assert(footprint.minZ > -55.75 && footprint.maxZ < 55.75, "Obby remains inside world walls");
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
          `Obby must leave ${npc.id}'s route clear`,
        );
      }
    }
  }
}

const plaza = RESERVED.find((zone) => zone.id === "concert-plaza");
assert(plaza, "Existing Plaza must remain present");
assert(
  OBBY_BOUNDS.maxZ < plaza.minZ && plaza.minZ - OBBY_BOUNDS.maxZ < 14,
  "Course is adjacent to Plaza",
);
assert(entryRamp.minX > 27.2, "West Plaza sidewalk remains open to the entry ramp");
assert.equal(new Set(OBBY_PLATFORMS.map((p) => p.id)).size, OBBY_PLATFORMS.length);
assert.equal(OBBY_PLATFORMS[0].kind, "start");
assert.equal(OBBY_PLATFORMS.at(-1).kind, "finish");
assert.equal(OBBY_PLATFORMS.filter((p) => p.kind === "checkpoint").length, 14);
for (const platform of OBBY_PLATFORMS) {
  for (let sample = 0; sample <= 200; sample++) {
    const p = platformPosition(platform, ((sample / 200) * Math.PI * 2) / 0.8);
    assert(
      p.x - platform.width / 2 >= OBBY_BOUNDS.minX,
      `${platform.id} stays inside mat west edge`,
    );
    assert(
      p.x + platform.width / 2 <= OBBY_BOUNDS.maxX,
      `${platform.id} stays inside mat east edge`,
    );
    assert(
      p.z - platform.depth / 2 >= OBBY_BOUNDS.minZ,
      `${platform.id} stays inside mat north edge`,
    );
    assert(
      p.z + platform.depth / 2 <= OBBY_BOUNDS.maxZ,
      `${platform.id} stays inside mat south edge`,
    );
  }
}
console.log(
  "PASS Obby placement: Plaza access, roads, sidewalks, lots, NPC routes, spawn, props, world walls and moving sweep.",
);
console.log("Live Cloud-authored targets are outside this source-only check.");

const { SITE_PARTS, SITE_SOLIDS } = await metadata("../src/game/obby/construction.ts");
for (const part of [...SITE_PARTS, ...SITE_SOLIDS]) {
  assert(part.s.every((n) => Number.isFinite(n) && n > 0));
  const matrix = new Matrix4().compose(
    new Vector3(...part.p),
    new Quaternion().setFromEuler(new Euler(part.rx ?? 0, part.ry ?? 0, part.rz ?? 0)),
    new Vector3(...part.s),
  );
  const bounds = new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5)).applyMatrix4(
    matrix,
  );
  assert(
    bounds.min.x >= OBBY_BOUNDS.minX &&
      bounds.max.x <= OBBY_BOUNDS.maxX &&
      bounds.min.z >= OBBY_BOUNDS.minZ &&
      bounds.max.z <= OBBY_BOUNDS.maxZ,
    `Structure stays inside site: ${JSON.stringify(part.p)}`,
  );
}
assert(OBBY_PLATFORMS.at(-1).top >= 30, "Finish belongs on the upper construction roof");
console.log(
  "PASS construction bounds: crane, suspended container, scaffolding, building floors and barriers leave the Plaza and fishing path clear.",
);

assert(OBBY_PLATFORMS.length >= 50, "A long multi-storey course, not just tall scenery");
