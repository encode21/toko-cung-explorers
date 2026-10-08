import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function moduleUrl(url) {
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const match of [...outputText.matchAll(/from ["'](\.[^"']+)["']/g)])
    outputText = outputText.replace(
      match[0],
      `from "${await moduleUrl(new URL(`${match[1]}.ts`, url))}"`,
    );
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const load = async (path) => import(await moduleUrl(new URL(path, import.meta.url)));
const p = await load("../src/game/traffic/traffic-protocol.ts");
const { newerRevision, profileFromRow } = await load("../src/identity/profile-data.ts");
const snap = {
  host: "a",
  epoch: "session-a",
  seq: 10,
  at: 1000,
  truck: "away",
  vehicles: p.VEHICLE_IDS.map((id, i) => ({
    id,
    routeId: p.ROUTE_IDS[i],
    active: true,
    state: "MOVING",
    distance: 20,
    speed: 3,
  })),
};
assert.ok(p.validTrafficSnapshot(snap));
for (const bad of [
  null,
  { ...snap, seq: 0 },
  { ...snap, vehicles: [null] },
  { ...snap, vehicles: snap.vehicles.slice(1) },
  { ...snap, vehicles: snap.vehicles.map(() => snap.vehicles[0]) },
  { ...snap, vehicles: snap.vehicles.map((v) => ({ ...v, distance: NaN })) },
  { ...snap, vehicles: snap.vehicles.map((v) => ({ ...v, routeId: "unknown" })) },
])
  assert.equal(p.validTrafficSnapshot(bad), false);
assert.equal(
  p.reconcileProgress(600, 2, 700, 0.016),
  2,
  "respawn progress must not wrap to the old endpoint",
);
assert.equal(p.reconcileProgress(0, 800, 700, 0.016), 700);
assert.ok(
  p.reconcileProgress(20, 22, 700, 0.016) > 20 && p.reconcileProgress(20, 22, 700, 0.016) < 22,
);
assert.ok(newerRevision("2026-10-08T08:00:00.123456Z", "2026-10-08T08:00:00.123455Z"));
assert.equal(newerRevision("2026-10-08T08:00:00.123455Z", "2026-10-08T08:00:00.123456Z"), false);
assert.equal(newerRevision("invalid", "2026-10-08T08:00:00Z"), false);
const avatar = {
  hair: "hijab",
  hairColor: "#1f1a17",
  skin: "#eac09a",
  expression: "calm",
  outfit: "casual",
  outfitColor: "#4fb39a",
  accessory: "glasses",
  pantsColor: "#384355",
  shoesColor: "#344452",
};
assert.deepEqual(
  profileFromRow({ avatar }).avatar,
  avatar,
  "acknowledged appearance must survive rehydration",
);
console.log(
  "PASS snapshot validation, respawn correction, microsecond revision ordering, appearance rehydration",
);
