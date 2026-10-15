/** Render the real tracker components and exercise UI commands without a browser or account. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import ts from "typescript";

async function load(path, dependencies = {}) {
  const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const imports = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "lucide-react": icons,
    "./quest-tracker.css": {},
    ...dependencies,
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name) => {
      assert(Object.hasOwn(imports, name), `${path}: unexpected dependency ${name}`);
      return imports[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

function store(initial) {
  let state = initial;
  const read = (selector = (value) => value) => selector(state);
  read.getState = () => state;
  read.setState = (patch) => {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  };
  return read;
}

// Only state/effect hooks are replaced; JSX, tracker presentation and callbacks remain real.
function hooks() {
  const values = [];
  let cursor = 0;
  return {
    react: {
      ...React,
      useEffect() {},
      useState(initial) {
        const key = cursor++;
        if (!(key in values)) values[key] = typeof initial === "function" ? initial() : initial;
        return [
          values[key],
          (value) => {
            values[key] = typeof value === "function" ? value(values[key]) : value;
          },
        ];
      },
      useRef(initial) {
        const key = cursor++;
        if (!(key in values)) values[key] = { current: initial };
        return values[key];
      },
    },
    render(Component, props = {}) {
      cursor = 0;
      return Component(props);
    },
  };
}

function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!React.isValidElement(element)) return [];
  if (typeof element.type === "function") return nodes(element.type(element.props));
  return [element, ...nodes(element.props.children)];
}
function text(element) {
  if (Array.isArray(element)) return element.map(text).join("");
  if (React.isValidElement(element)) return text(element.props.children);
  return typeof element === "string" || typeof element === "number" ? String(element) : "";
}
function button(tree, label) {
  const found = nodes(tree).find(
    (node) =>
      node.type === "button" && (node.props["aria-label"] === label || text(node) === label),
  );
  assert(found, `Missing button: ${label}`);
  return found;
}
function click(tree, label) {
  const found = button(tree, label);
  assert(!found.props.disabled, `Cannot click disabled button: ${label}`);
  found.props.onClick();
}

const shared = await load("ui/hud/QuestTrackerCard.tsx");
const { QuestTrackerCard, QuestTrackerButton } = shared;
const cardProps = {
  label: "Quest",
  title: "Kiriman yang Hilang",
  summary: "Cari surat jalan",
  count: "1 / 3",
  expanded: false,
  onToggle() {},
  progress: { value: 1, max: 3, label: "Progres quest", valueText: "1 dari 3" },
  children: React.createElement("p", null, "Petunjuk detail"),
  footer: React.createElement(QuestTrackerButton, null, "Lanjut"),
  error: "Koneksi terputus",
};
const collapsed = renderToStaticMarkup(React.createElement(QuestTrackerCard, cardProps));
assert.match(collapsed, /aria-expanded="false"/);
assert.match(collapsed, /Cari surat jalan/);
assert.doesNotMatch(collapsed, /Petunjuk detail/);
assert.match(collapsed, /Lanjut/);
assert.match(collapsed, /role="status"[^>]*>Koneksi terputus/);
assert.match(collapsed, /aria-valuetext="1 dari 3"/);
const expanded = renderToStaticMarkup(
  React.createElement(QuestTrackerCard, {
    ...cardProps,
    expanded: true,
    errorRole: "alert",
  }),
);
assert.match(expanded, /aria-expanded="true"/);
assert.match(expanded, /Petunjuk detail/);
assert.match(expanded, /role="alert"/);
for (const [value, max, expectedValue, expectedMax] of [
  [-3, 5, 0, 5],
  [9, 5, 5, 5],
  [NaN, 0, 0, 1],
  [Infinity, Infinity, 0, 1],
]) {
  const tree = QuestTrackerCard({ ...cardProps, progress: { value, max, label: "Progres" } });
  const progress = nodes(tree).find((node) => node.type === "progress");
  assert.equal(progress.props.value, expectedValue);
  assert.equal(progress.props.max, expectedMax);
}
let toggles = 0;
click(
  QuestTrackerCard({ ...cardProps, toggleLabel: "Buka detail", onToggle: () => toggles++ }),
  "Buka detail",
);
assert.equal(toggles, 1);
const disabled = QuestTrackerButton({
  children: "Tunggu",
  disabled: true,
  "aria-label": "Sedang mengirim",
});
assert.equal(disabled.props.disabled, true);
assert.equal(disabled.props.type, "button");
assert.equal(disabled.props["aria-label"], "Sedang mengirim");

const hud = store({
  tracker: null,
  sheet: null,
  principalPanel: null,
  toggleTracker: (tracker) =>
    hud.setState((state) => ({ tracker: state.tracker === tracker ? null : tracker })),
  setSheet: (sheet) => hud.setState({ sheet }),
});
const game = store({ playerPos: [0, 0.83, 0], overlay: "none" });
const sharedDependencies = {
  "./QuestTrackerCard": shared,
  "@/state/hud-store": { useHud: hud },
  "@/state/game-store": { useGame: game },
  "@/hooks/use-mobile-hud": { useMobileHudLayout: () => ({ mobile: false, touch: false }) },
  "@/game/player/touch-drive": { useTouchDrive: store({ active: false }) },
};

const missionModel = await load("game/missions/model.ts");
const mission = store({
  session: missionModel.emptySession(),
  available: [],
  pending: false,
  ready: true,
  error: null,
});
const missionCommands = [];
const missionHooks = hooks();
const { MissionTracker } = await load("ui/hud/MissionTracker.tsx", {
  ...sharedDependencies,
  react: missionHooks.react,
  "@/game/missions/store": { useMissions: mission },
  "@/game/missions/model": missionModel,
  "@/game/missions/runtime": { requestMission: (...args) => missionCommands.push(args) },
});
const renderMission = () => missionHooks.render(MissionTracker);
assert.equal(renderMission(), null, "No optional card without offers, active mission or error");
mission.setState({
  available: [{ type: "WAREHOUSE_RUSH_HELP_PACKING", sourceEventId: "offer-a" }],
});
assert.equal(renderMission().type, QuestTrackerCard);
assert.equal(
  renderMission().props.progress,
  undefined,
  "Available offers do not invent mission progress",
);
renderMission().props.onToggle();
assert.equal(hud.getState().tracker, "mission");
click(renderMission(), "Ambil Misi Bantu Gudang");
assert.deepEqual(missionCommands.pop(), ["accept", "offer-a"]);
mission.setState({ pending: true });
assert.equal(button(renderMission(), "Ambil Misi Bantu Gudang").props.disabled, true);
mission.setState({ pending: false, ready: false });
assert.equal(button(renderMission(), "Ambil Misi Bantu Gudang").props.disabled, true);
mission.setState({
  ready: true,
  session: {
    active: {
      type: "WAREHOUSE_RUSH_HELP_PACKING",
      progress: 2,
      carrying: true,
      sourceEndedAt: 5,
    },
  },
});
assert.equal(renderMission().props.progress.value, 2);
assert.equal(renderMission().props.progress.max, 3);
assert.match(text(renderMission().props.children), /Event selesai/);
click(renderMission(), "Batalkan Misi");
assert.equal(missionCommands.length, 0, "Opening cancel confirmation does not cancel the mission");
click(renderMission(), "Lanjutkan misi");
assert.equal(missionCommands.length, 0);
click(renderMission(), "Batalkan Misi");
mission.setState({ pending: true });
assert.equal(button(renderMission(), "Ya, batalkan").props.disabled, true);
mission.setState({ pending: false });
click(renderMission(), "Ya, batalkan");
assert.deepEqual(missionCommands.pop(), ["cancel"]);
hud.setState({ tracker: null });
mission.setState({ error: "Misi tidak tersedia" });
assert.match(renderToStaticMarkup(renderMission()), /Misi tidak tersedia/);

const dailyModel = await load("game/daily/types.ts");
const dungeon = store({
  data: null,
  busy: false,
  error: null,
  entranceOpen: false,
  transition: false,
  tracked: true,
});
const daily = store({ data: null, tracked: null, busy: false });
let nearDaily = false;
const dailyCommands = [];
const { DailyMissionTracker } = await load("ui/hud/DailyMissionTracker.tsx", {
  ...sharedDependencies,
  "@/game/dungeon/store": { useDungeon: dungeon },
  "@/game/daily/types": dailyModel,
  "@/game/daily/store": {
    useDaily: daily,
    nearDailyObjective: () => nearDaily,
    interactDaily: (quest) => dailyCommands.push(quest.id),
  },
});
assert.equal(DailyMissionTracker(), null);
const activeDaily = {
  id: "daily-active",
  status: "ACTIVE",
  progress: [0],
  definition: {
    title: "Antar paket",
    objectives: [{ targetId: "packing", label: "Taruh paket", required: 1 }],
  },
};
daily.setState({
  data: {
    completedCount: 1,
    quests: [
      activeDaily,
      {
        ...activeDaily,
        id: "daily-ready",
        status: "CLAIMABLE",
        progress: [1],
        definition: { ...activeDaily.definition, title: "Jelajah selesai" },
      },
    ],
  },
});
assert.equal(DailyMissionTracker().type, QuestTrackerCard);
DailyMissionTracker().props.onToggle();
assert.equal(hud.getState().tracker, "daily");
click(DailyMissionTracker(), "• Antar paket · 0/1");
assert.equal(daily.getState().tracked, "daily-active");
assert.equal(
  dungeon.getState().tracked,
  false,
  "Selecting a daily target releases Principal navigation",
);
assert.equal(DailyMissionTracker().props.title, "Antar paket");
assert.equal(DailyMissionTracker().props.summary, "Taruh paket");
assert(
  !nodes(DailyMissionTracker()).some(
    (node) => node.type === "button" && text(node) === "Taruh paket",
  ),
  "Daily interaction remains proximity-gated",
);
nearDaily = true;
click(DailyMissionTracker(), "Taruh paket");
assert.deepEqual(dailyCommands, ["daily-active"]);
daily.setState({ busy: true });
assert.equal(button(DailyMissionTracker(), "Taruh paket").props.disabled, true);
dungeon.setState({ tracked: true });
click(DailyMissionTracker(), "✓ Jelajah selesai · 1/1");
assert.equal(hud.getState().sheet, "daily-missions");
assert.equal(
  daily.getState().tracked,
  "daily-active",
  "Reward-ready missions open their sheet without replacing navigation",
);
assert.equal(
  dungeon.getState().tracked,
  true,
  "Opening daily rewards preserves Principal navigation",
);
hud.setState({ sheet: null });
click(DailyMissionTracker(), "Lihat Semua");
assert.equal(hud.getState().sheet, "daily-missions");
daily.setState({ data: { completedCount: 5, quests: [{ ...activeDaily, status: "CLAIMED" }] } });
assert.equal(DailyMissionTracker().props.title, "Misi harian");
assert.equal(DailyMissionTracker().props.progress.value, 5);

const dailyPanelHooks = hooks();
const { DailyMissionPanel } = await load("ui/hud/DailyMissionPanel.tsx", {
  ...sharedDependencies,
  react: dailyPanelHooks.react,
  "@/game/dungeon/store": { useDungeon: dungeon },
  "@/game/daily/types": dailyModel,
  "@/game/daily/store": {
    useDaily: daily,
    dailyCommand() {},
    dailyGiver: () => null,
    nearDailyGiver: () => null,
    nearDailyObjective: () => false,
    interactDaily() {},
  },
});
daily.setState({
  tracked: null,
  data: {
    completedCount: 0,
    quests: [
      {
        ...activeDaily,
        definition: { ...activeDaily.definition, reward: { xp: 10, cungPoint: 5 } },
      },
    ],
  },
});
const renderDailyPanel = () => dailyPanelHooks.render(DailyMissionPanel);
click(renderDailyPanel(), "Track");
assert.equal(daily.getState().tracked, activeDaily.id);
assert.equal(
  dungeon.getState().tracked,
  false,
  "Track in daily panel releases Principal navigation",
);
dungeon.setState({ tracked: true });
click(renderDailyPanel(), "Untrack");
assert.equal(daily.getState().tracked, null);
assert.equal(
  dungeon.getState().tracked,
  true,
  "Untracking a daily does not cancel Principal navigation",
);

const core = store({ snapshot: null, error: null });
const editorDependencies = {
  "@/game/editor/resolve": { resolveObjective: (objective) => objective },
  "@/game/editor/store": { useWorldEditor: store({ targets: [], saved: [], mode: "PLAYER" }) },
};
const questHooks = hooks();
const { QuestTracker } = await load("ui/hud/QuestTracker.tsx", {
  ...sharedDependencies,
  ...editorDependencies,
  react: questHooks.react,
  "@/game/core/store": { useGameCore: core },
});
const renderQuest = () => questHooks.render(QuestTracker);
assert.equal(renderQuest(), null);
const objective = {
  label: "Cari surat jalan",
  target: "document",
  type: "FIND",
  required: 1,
  position: [10, 0, 10],
  radius: 2,
  realm: "DUNGEON",
};
const quest = {
  id: "story",
  title: "Rahasia kota",
  category: "EASTER_EGG",
  objectives: [objective, { ...objective, label: "Baca petunjuk" }],
};
const active = { quest_id: quest.id, progress: [1, 0] };
core.setState({ snapshot: { active, quests: [quest] } });
assert.equal(renderQuest().type, QuestTrackerCard);
assert.equal(renderQuest().props.label, "Rahasia");
assert.equal(renderQuest().props.summary, "Baca petunjuk");
assert.equal(renderQuest().props.progress.value, 1);
active.progress = [1, 1];
assert.equal(renderQuest().props.summary, "Semua tujuan selesai");
assert.equal(renderQuest().props.progress.value, 2);
quest.category = "WORLD";
assert.equal(renderQuest().props.label, "Quest");

const boardHooks = hooks();
let completeAccept;
let closedOverlays = 0;
game.setState({
  closeOverlay: () => closedOverlays++,
  setToast() {},
});
const { QuestBoard } = await load("ui/quests/QuestBoard.tsx", {
  ...sharedDependencies,
  react: boardHooks.react,
  "@/game/dungeon/store": { useDungeon: dungeon },
  "@/game/core/store": {
    useGameCore: core,
    command: () =>
      new Promise((resolve) => {
        completeAccept = resolve;
      }),
  },
  "@/ui/game-ui/GamePrimitives": { GameDialog: ({ children }) => children },
  "@/ui/hud/GameProgress": { GameProgress: () => null },
  "@/ui/adventure/ActionButton": {
    ActionButton: ({ children, onClick, disabled, busy }) =>
      React.createElement("button", { onClick, disabled: disabled || busy }, children),
    AdventureSkeleton: () => null,
  },
});
const boardQuest = { ...quest, available: true, rewards: { xp: 10, point: 5 } };
const boardSnapshot = { active: null, quests: [boardQuest] };
core.setState({ snapshot: boardSnapshot, busy: false, syncing: false, error: null });
const renderBoard = () => boardHooks.render(QuestBoard);
click(renderBoard(), "Terima & lacak quest");
assert.equal(
  dungeon.getState().tracked,
  true,
  "Pending world acceptance preserves Principal navigation",
);
completeAccept({ ok: false });
await Promise.resolve();
assert.equal(
  dungeon.getState().tracked,
  true,
  "Failed world acceptance preserves Principal navigation",
);
assert.equal(closedOverlays, 0);
click(renderBoard(), "Terima & lacak quest");
completeAccept({ ok: true, snapshot: { active: { quest_id: "different-quest" } } });
await Promise.resolve();
assert.equal(
  dungeon.getState().tracked,
  true,
  "Unconfirmed world acceptance preserves Principal navigation",
);
click(renderBoard(), "Terima & lacak quest");
completeAccept({ ok: true, snapshot: { active: { quest_id: boardQuest.id } } });
await Promise.resolve();
assert.equal(
  dungeon.getState().tracked,
  false,
  "Confirmed world acceptance releases Principal navigation",
);
assert.equal(closedOverlays, 1);
dungeon.setState({ tracked: true });
core.setState({
  snapshot: { ...boardSnapshot, active: { quest_id: boardQuest.id, progress: [0, 0] } },
});
click(renderBoard(), "Lanjutkan petualangan");
assert.equal(
  dungeon.getState().tracked,
  false,
  "Continuing an existing world quest releases Principal navigation",
);
assert.equal(closedOverlays, 2);
boardQuest.category = "DUNGEON";
click(renderBoard(), "Lacak pintu dungeon");
assert.equal(
  dungeon.getState().tracked,
  true,
  "Principal entrance tracking remains an explicit selection",
);
assert.equal(closedOverlays, 3);

const dungeonCommands = [];
const portals = [];
const host = {};
let talking = false;
const dungeonHooks = hooks();
const { DungeonHud } = await load("ui/hud/DungeonHud.tsx", {
  ...sharedDependencies,
  ...editorDependencies,
  react: dungeonHooks.react,
  "react-dom": {
    createPortal: (child, container) => {
      portals.push({ child, container });
      return child;
    },
  },
  "./PrincipalBoard": {
    PrincipalBoard: () => React.createElement("aside", { "data-principal-board": true }),
  },
  "./WorldActionAnchor": {
    WorldActionAnchor: ({ children }) =>
      React.createElement("aside", { "data-world-action": true }, children),
  },
  "./NpcQuestionIcon": { NpcQuestionIcon: () => null },
  "@/game/dungeon/store": {
    useDungeon: dungeon,
    dungeonCommand: (...args) => dungeonCommands.push(args),
  },
  "@/game/dungeon/announce-complete": { announceDungeonComplete() {} },
  "@/game/dungeon/staff": { DUNGEON_STAFF: [] },
  "@/game/dungeon/dialogue": { resolveDungeonDialogue: () => null },
  "@/game/dungeon/dialogue-store": { useDungeonDialogue: store({ script: null, open() {} }) },
  "@/game/world/landmarks": { worldLandmarkFor: (_id, position) => position },
  "@/net/channel-store": { useChannels: store({ playing: true }) },
  "@/hooks/use-npc-conversation": { useNpcConversation: () => talking },
});
const renderDungeon = (trackerHost = host) => {
  portals.length = 0;
  return dungeonHooks.render(DungeonHud, { trackerHost });
};
assert.equal(renderDungeon(), null);
const config = {
  version: 2,
  questId: "principal",
  questTitle: "Kiriman yang Hilang",
  requiredLevel: 3,
  objectives: [objective],
  easterEggs: [],
  entrance: [0, 0, 0],
  spawn: [0, 0, 0],
  reward: { xp: 20 },
};
dungeon.setState({ data: { config, instance: null, status: "AVAILABLE" } });
click(renderDungeon(), "Mission Board");
assert.equal(hud.getState().principalPanel, "missions");
assert.deepEqual(dungeonCommands.pop(), ["read"]);
assert.equal(portals[0].container, host);
assert.equal(
  portals[0].child.type,
  QuestTrackerCard,
  "Principal uses the same presentation component",
);
assert(
  !nodes(portals[0].child).some((node) => node.props["data-principal-board"]),
  "Principal modal stays outside the scroll host",
);
config.version = 1;
click(renderDungeon(), "Lihat dungeon");
assert.equal(dungeon.getState().entranceOpen, true);
assert.deepEqual(dungeonCommands.pop(), ["read"]);
click(renderDungeon(), "Masuk");
assert.deepEqual(dungeonCommands.pop(), ["enter"]);
config.version = 2;
hud.setState({ principalPanel: null });
const instance = {
  id: "run",
  status: "ACTIVE",
  realm: "DUNGEON",
  progress: [0],
  found: [],
  carrying: false,
};
dungeon.setState({ data: { config, instance, status: "AVAILABLE" } });
game.setState({ playerPos: [10, 0.83, 10] });
let dungeonTree = renderDungeon();
assert(nodes(dungeonTree).some((node) => node.props["data-world-action"]));
assert(
  !nodes(portals[0].child).some((node) => node.props["data-world-action"]),
  "Projected action never enters the tracker scroll area",
);
assert(
  nodes(renderDungeon(null)).some((node) => node.props["data-world-action"]),
  "Missing tracker host must not remove world interactions",
);
renderDungeon();
portals[0].child.props.onToggle();
click(renderDungeon(), "Keluar Dungeon");
assert.equal(dungeonCommands.length, 0, "Exit requires confirmation while mission is active");
dungeon.setState({ busy: true });
assert.equal(button(renderDungeon(), "Ya, keluar").props.disabled, true);
dungeon.setState({ busy: false });
click(renderDungeon(), "Lanjut");
assert.equal(dungeonCommands.length, 0);
click(renderDungeon(), "Keluar Dungeon");
click(renderDungeon(), "Ya, keluar");
assert.deepEqual(dungeonCommands.pop(), ["exit"]);
click(renderDungeon(), "Lanjut");
instance.status = "COMPLETED";
instance.progress = [1];
renderDungeon();
portals[0].child.props.onToggle();
click(renderDungeon(), "Kembali ke World");
assert.deepEqual(
  dungeonCommands.pop(),
  ["exit"],
  "Completed return stays reachable when collapsed",
);
dungeon.setState({ transition: true });
assert.equal(renderDungeon().props.role, "status");
assert.equal(portals.length, 0, "Transition overlay is separate from the tracker host");
talking = true;
assert.equal(renderDungeon(), null, "NPC dialogue hides the dungeon HUD");

console.log(
  "PASS common quest tracker rendering, bounded progress, mission/daily commands, navigation selection lifecycle, regular quest progression, Principal entry/exit confirmation and portal isolation",
);
