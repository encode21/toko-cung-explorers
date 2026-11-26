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
let gang = { data: null, inside: null };
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
  "@/game/missions/runtime": { missionInteraction: () => null },
  "@/game/missions/store": { useMissions: store(() => ({ session: { active: null } })) },
  "@/state/mission-focus": { useMissionFocus: store(() => ({ source: null })) },
  "@/game/daily/use-daily-target": { useDailyTarget: () => null },
  "@/game/prolog/guidance": { prologDestination: () => undefined },
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
  "@/ui/dialogue/npc-appearance": { npcAppearance: () => ({}) },
  "@/ui/profile/AvatarPortrait": { AvatarPortrait: () => null },
  "@/identity/profile-store": { useProfile: store(() => ({ profile: null })) },
  "@/ui/game-ui/GamePanel": { GameModal, GameButton, GameIconButton: () => null },
  "@/state/hud-store": { useHud: store(() => ({ setSheet: (v) => calls.push(["sheet", v]) })) },
  "@/state/game-store": { useGame: store(() => game) },
  "@/game/club/store": { useClub: store(() => club) },
  "@/game/dungeon/store": { useDungeon: store(() => dungeon) },
  "@/game/gang/store": {
    useGang: store(() => gang),
    useGangMap: () => gang.inside !== null,
    gangCommand: () => Promise.resolve(null),
  },
  "@/game/home/store": { useHome: store(() => ({ inside: false })) },
  "@/game/gang/GangMap": { GangMap: () => null },
  "@/game/ojek/store": {
    useOjek: store(() => ({ data: null, picked: false })),
    ojekTarget: () => null,
  },
  "@/game/town-events/store": {
    useTownEvents: store(() => ({ events: [] })),
    useTownEventTarget: () => null,
  },
  "@/game/town-events/focus": { useActivityFocus: store(() => ({ selected: null })) },
  "@/game/easyjobs/store": { useEasyJobs: store(() => ({ kuli: null })) },
  "@/game/warung/store": {
    useWarung: store(() => ({ data: null, lots: [], busy: false })),
    openWarungPanel: () => {},
    warungCommand: () => Promise.resolve(null),
  },
  "@/net/net-store": { useNet: store(() => ({ roster })) },
  "@/net/useWorldChannel": { playerId: "self", remoteStates },
  "@/game/core/use-world-guidance": { useWorldGuidanceTarget: () => questTarget },
  "@/game/editor/resolve": { resolveObjective: (v) => v },
  "@/game/core/store": { useGameCore: store(() => ({ snapshot: null })) },
  "@/game/daily/store": { useDaily: store(() => ({ data: null, tracked: null })) },
  "./store": { useGameCore: store(() => ({ snapshot: null })) },
  "./Minimap": { Minimap: () => null },
  "@/game/mountain/store": { useMountain: store(() => ({ checkpoint: 0, completed: false })) },
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
const { MOUNTAIN_HELIPAD } = load("src/game/mountain/model.ts");
const { projectMapPoint } = load("src/ui/minimap/map-layout.ts");
const guidance = load("src/game/core/use-world-guidance.ts");
const { CityMap: WorldMap } = load("src/ui/minimap/CityMap.tsx");
assert.equal(new Set(MAP_DESTINATIONS.map((p) => p.id)).size, MAP_DESTINATIONS.length);
assert.equal(MAP_DESTINATIONS.filter((p) => p.label === "Pasar Cung").length, 1);
assert.deepEqual(
  Object.fromEntries(
    MAP_DESTINATIONS.filter((p) =>
      [
        "venue-helicopter",
        "venue-market",
        "venue-square",
        "venue-park",
        "garasi-parkir",
        "venue-fishing",
        "venue-beach",
      ].includes(p.id),
    ).map((p) => [p.id, p.icon]),
  ),
  {
    "venue-helicopter": "helipad",
    "venue-market": "market",
    "venue-square": "plaza",
    "venue-park": "park",
    "garasi-parkir": "parking",
    "venue-fishing": "fishing",
    "venue-beach": "beach",
  },
);
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
  gang = { data: null, inside: null };
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
  const rendered = typeof tree.type === "function" ? tree.type(tree.props ?? {}) : null;
  return [tree, ...nodes(rendered), ...nodes(tree.props?.children), ...nodes(tree.props?.footer)];
}
function render() {
  hookIndex = 0;
  return nodes(WorldMap());
}
reset();
let tree = render();
assert(tree.some((n) => n.props?.["aria-label"] === "Pemain: Budi"));
assert(!tree.some((n) => n.props?.["aria-label"] === "Pemain: DJ"));
assert(tree.some((n) => n.props?.className === "world-map-tools"));
assert(!tree.some((n) => n.props?.className === "world-map-leaders"));
// Moving the map must translate every marker by the same amount as the terrain,
// even when destinations are near one another or beyond the viewport edge.
for (const center of [
  { x: 0, z: 8 },
  { x: 40, z: -20 },
  { x: -75, z: 75 },
  { x: 104, z: 88 },
]) {
  values[3] = center;
  const moved = render();
  for (const spot of MAP_DESTINATIONS.filter((p) => !p.interior)) {
    const pin = moved.find((n) => n.type === "button" && n.key === spot.id);
    const x = spot.marker?.[0] ?? spot.position[0];
    const z = spot.marker?.[1] ?? spot.position[2];
    assert(pin, `Map pin exists: ${spot.id}`);
    assert(Math.abs(pin.props.style.left - (((x - center.x) * 390) / 240 + 844 / 2)) < 1e-8);
    assert(Math.abs(pin.props.style.top - (((z - center.z) * 390) / 240 + 390 / 2)) < 1e-8);
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

// The world overview separates travel regions from city POIs and never teleports.
const { WorldMap: WorldLocations } = load("src/ui/minimap/WorldMap.tsx");
function renderLocations(view = null) {
  hookIndex = 0;
  values = [view];
  return nodes(WorldLocations());
}
reset();
tree = renderLocations();
const destinations = tree.filter((n) => n.props?.["data-world-location"]);
assert.deepEqual(
  destinations.map((n) => n.props["data-world-location"]),
  ["city", "kampung", "mountain"],
);
assert(
  tree.some(
    (n) => n.props?.className === "location-map-destination location-map-destination--city",
  ),
);
for (const button of destinations) button.props.onClick();
assert.deepEqual(updates, [
  [0, "city"],
  [0, "kampung"],
  [0, "mountain"],
]);
assert.deepEqual(calls, [], "Selecting a world region only opens detail; no teleport or guidance");
// JSX splits the label into array entries, so use the footer's single action.
const footer = tree.find((n) => n.props?.className === "location-map-footer");
const guideButton = nodes(footer).find((n) => n.type === "button");
assert(guideButton);
guideButton.props.onClick();
assert.deepEqual(
  calls.filter(([k]) => k !== "toast"),
  [
    ["waypoint", "venue-helicopter"],
    ["sheet", null],
  ],
);
reset();
dungeon.data = { instance: { status: "ACTIVE" } };
tree = renderLocations();
const unavailable = nodes(tree.find((n) => n.props?.className === "location-map-footer")).find(
  (n) => n.type === "button",
);
assert.equal(unavailable.props.disabled, true);
unavailable.props.onClick();
assert.deepEqual(calls, [], "World guidance respects an active Principal run");
reset();
game.playerPos = [...MOUNTAIN_HELIPAD.spawn];
tree = renderLocations();
const returnDetail = nodes(tree.find((n) => n.props?.className === "location-map-footer")).find(
  (n) => n.type === "button",
);
returnDetail.props.onClick();
assert.deepEqual(updates, [[0, "mountain"]]);
assert.deepEqual(
  calls,
  [],
  "Mountain players see the local route, never walking directions across the sea",
);
assert(
  renderLocations("city").some((n) => n.type === WorldMap),
  "City detail preserves its POIs",
);
assert(
  renderLocations("kampung").some((n) => n.props?.["data-kampung-map-detail"]),
  "Kampung has a dedicated regional detail",
);
reset();
gang = {
  inside: 1,
  data: { gang: 1, houses: [], text: { gang: "Kampung :gang" } },
};
tree = renderLocations();
const kampungCurrent = tree.find((n) => n.props?.["data-world-location"] === "kampung");
const cityCurrent = tree.find((n) => n.props?.["data-world-location"] === "city");
assert(
  nodes(kampungCurrent).some((n) => n.type === "em"),
  "Kampung is marked as current",
);
assert(!nodes(cityCurrent).some((n) => n.type === "em"), "City is not marked inside Kampung");
console.log(
  "PASS: three world locations, correct current region, local details, physical guidance, no map teleport",
);

reset("map-store");
game.playerPos = [...MOUNTAIN_HELIPAD.spawn];
tree = render();
const cityFromMountain = tree.find((n) => n.props?.className === "world-map-navigate");
assert.equal(cityFromMountain.props.disabled, true);
cityFromMountain.props.onClick();
assert.deepEqual(
  calls,
  [],
  "City POIs cannot set a walking route across the sea from the mountain",
);
