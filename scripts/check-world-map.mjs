/** Data, projection, realm filtering and real map callbacks; no browser/server required. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";

const require = createRequire(import.meta.url);
const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const store = (get) => Object.assign((select) => select(get()), { getState: get });
let club, game, dungeon, questTarget, values, updates, hookIndex, calls;
const remoteStates = new Map();
const roster = [
  { id: "self", name: "Aku" },
  { id: "bob", name: "Budi" },
  { id: "club", name: "DJ" },
];
const GameModal = () => null;
const GameButton = () => null;
const mocks = {
  "react/jsx-runtime": jsx,
  react: {
    useEffect: () => {},
    useRef: (current) => ({ current }),
    useState: (initial) => {
      const i = hookIndex++;
      return [i in values ? values[i] : initial, (v) => updates.push([i, v])];
    },
  },
  "@/game/engine/quality": { LOW_QUALITY: false },
  "@/game/npc/population": { populationForQuality: () => [] },
  "@/ui/game-ui/GamePanel": { GameModal, GameButton, GameIconButton: () => null },
  "@/state/hud-store": { useHud: store(() => ({ setSheet: (v) => calls.push(["sheet", v]) })) },
  "@/state/game-store": { useGame: store(() => game) },
  "@/game/club/store": { useClub: store(() => club) },
  "@/game/dungeon/store": { useDungeon: store(() => dungeon) },
  "@/net/net-store": { useNet: store(() => ({ roster })) },
  "@/net/useWorldChannel": { playerId: "self", remoteStates },
  "@/game/core/use-world-guidance": { useWorldGuidanceTarget: () => questTarget },
  "@/game/editor/resolve": { resolveObjective: (v) => v },
  "@/game/core/store": { useGameCore: store(() => ({ snapshot: null })) },
  "@/game/daily/store": { useDaily: store(() => ({ data: null, tracked: null })) },
  "./store": { useGameCore: store(() => ({ snapshot: null })) },
  "./Minimap": { Minimap: () => null },
};
const cache = new Map();
function load(file) {
  file = resolve(root, file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const output = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name.endsWith(".css")) return {};
      if (name in mocks) return mocks[name];
      if (name.startsWith("@/") || name.startsWith(".")) {
        const path = name.startsWith("@/")
          ? resolve(root, "src", name.slice(2))
          : resolve(dirname(file), name);
        return load([path, `${path}.ts`, `${path}.tsx`].find(existsSync));
      }
      return require(name);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}
const { MAP_DESTINATIONS, mapDestination } = load("src/game/navigation/map-destinations.ts");
const { projectMapPoint } = load("src/ui/minimap/map-layout.ts");
const guidance = load("src/game/core/use-world-guidance.ts");
const { WorldMap } = load("src/ui/minimap/WorldMap.tsx");
assert.equal(new Set(MAP_DESTINATIONS.map((p) => p.id)).size, MAP_DESTINATIONS.length);
for (const spot of MAP_DESTINATIONS) {
  assert(spot.position.every(Number.isFinite));
  assert.deepEqual(guidance.exploreWaypointTarget(spot.id).position, spot.position);
  assert.equal(mapDestination(spot.id), spot);
}
assert.equal(guidance.exploreWaypointTarget("missing-poi"), null);
assert.equal(guidance.exploreWaypointTarget(null), null);
for (const width of [568, 844, 1280]) {
  const view = { width, height: 360, x: 0, z: 8, range: 120 };
  assert.deepEqual(projectMapPoint(0, 8, view), { x: width / 2, y: 180 });
}
const reset = (selected = null) => {
  club = { inside: false, outdoor: false };
  dungeon = { data: null, tracked: false };
  game = {
    playerPos: [0, 0, 12],
    waypoint: null,
    setWaypoint: (v) => calls.push(["waypoint", v]),
    setGuidanceMuted: (v) => calls.push(["muted", v]),
    setToast: (v) => calls.push(["toast", v]),
  };
  questTarget = null;
  calls = [];
  updates = [];
  hookIndex = 0;
  values = [false, selected, { width: 844, height: 390 }, null];
  remoteStates.clear();
  remoteStates.set("bob", { x: 4, y: 0, z: 12 });
  remoteStates.set("club", { x: 4, y: -14, z: 12 });
};
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.footer)];
}
function render() {
  hookIndex = 0;
  return nodes(WorldMap());
}
reset();
let tree = render();
assert(tree.some((n) => n.props?.["aria-label"] === "Pemain: Budi"));
assert(!tree.some((n) => n.props?.["aria-label"] === "Pemain: DJ"));
assert(!tree.some((n) => ["world-map-tools", "world-map-leaders"].includes(n.props?.className)));
// Moving the map must translate every marker by the same amount as the terrain,
// even when destinations are near one another or beyond the viewport edge.
for (const center of [
  { x: 0, z: 8 },
  { x: 40, z: -20 },
  { x: -75, z: 75 },
]) {
  values[3] = center;
  const moved = render();
  for (const spot of MAP_DESTINATIONS.filter((p) => !p.interior)) {
    const pin = moved.find((n) => n.props?.["aria-label"] === `Lihat ${spot.label}`);
    const x = spot.marker?.[0] ?? spot.position[0];
    const z = spot.marker?.[1] ?? spot.position[2];
    assert.deepEqual(pin.props.style, {
      left: ((x - center.x) * 390) / 120 + 844 / 2,
      top: ((z - center.z) * 390) / 120 + 390 / 2,
    });
  }
}
values[3] = null;
const storePin = tree.find((n) => n.props?.["aria-label"] === "Lihat Toko Cung");
storePin.props.onClick();
assert.deepEqual(updates.at(-1), [1, "map-store"]);
assert.deepEqual(calls, [], "Opening a POI does not teleport, accept a quest or activate guidance");
reset("map-store");
tree = render();
assert(tree.some((n) => n.type === GameModal && n.props.title === "Toko Cung"));
tree.find((n) => n.props?.className === "world-map-navigate").props.onClick();
assert.deepEqual(
  calls.filter(([k]) => k !== "toast"),
  [
    ["waypoint", "map-store"],
    ["muted", false],
    ["sheet", null],
  ],
);
reset("map-store");
dungeon.data = { instance: { status: "ACTIVE" } };
tree = render();
const blocked = tree.find((n) => n.props?.className === "world-map-navigate");
assert.equal(blocked.props.disabled, true);
blocked.props.onClick();
assert.deepEqual(calls, []);
reset("active-quest");
questTarget = {
  realm: "WORLD",
  position: [5, 0, 12],
  objective: { label: "Temui warga", target: "npc", position: [5, 0, 12] },
};
tree = render();
assert(tree.some((n) => n.props?.["aria-label"] === "Lihat Temui warga"));
tree.find((n) => n.props?.className === "world-map-navigate").props.onClick();
assert.deepEqual(
  calls.filter(([k]) => k !== "toast"),
  [
    ["waypoint", null],
    ["muted", false],
    ["sheet", null],
  ],
);
for (const field of ["hidden", "secret"]) {
  questTarget.objective[field] = true;
  tree = render();
  assert(!tree.some((n) => n.props?.["aria-label"] === "Lihat Temui warga"));
  delete questTarget.objective[field];
}
reset();
club.inside = true;
tree = render();
assert(!tree.some((n) => n.props?.["aria-label"] === "Lihat Toko Cung"));
assert(!tree.some((n) => n.props?.["aria-label"] === "Pemain: Budi"));
assert(tree.some((n) => n.props?.["aria-label"] === "Pemain: DJ"));
assert.equal(guidance.useWorldGuidanceTarget(), null, "City guidance stays out of Underground");
console.log(
  "PASS: map registry, entrance guidance, projection, fixed pins, POI modal/actions, Principal priority, secret quests and player-area filtering",
);
