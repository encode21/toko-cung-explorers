import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const THREE = require("three");

async function load(path, dependencies) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      assert(Object.hasOwn(dependencies, id), `Unexpected dependency ${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  return module.exports;
}

const projection = await load("../src/game/interactions/action-projection.ts", { three: THREE });
const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);
let at = [0, 0, 0];
let calls = 0;
const element = { style: {} };
const dispose = projection.registerActionAnchor(element, () => {
  calls++;
  return at;
});
projection.projectActionAnchors(camera, 800, 600);
assert.equal(element.style.visibility, "visible");
assert.equal(element.style.transform, "translate3d(400px, 300px, 0)");
const originTransform = element.style.transform;
at = [2, 0, 0];
projection.projectActionAnchors(camera, 800, 600);
assert.notEqual(element.style.transform, originTransform, "prompt follows a moving actor");
const movedTransform = element.style.transform;
camera.position.x = 4;
camera.lookAt(4, 0, 0);
projection.projectActionAnchors(camera, 800, 600);
assert.notEqual(element.style.transform, movedTransform, "prompt follows camera motion");
for (const invalid of [null, [NaN, 0, 0], [0, 0, 20], [100, 0, 0], [0, 100, 0]]) {
  at = invalid;
  projection.projectActionAnchors(camera, 800, 600);
  assert.equal(element.style.visibility, "hidden", `invisible target ${invalid}`);
}
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);
camera.aspect = 667 / 375;
camera.updateProjectionMatrix();
at = [0, 0, 0];
projection.projectActionAnchors(camera, 667, 375);
assert.equal(element.style.transform, "translate3d(333.5px, 187.5px, 0)");
projection.hideActionAnchors();
assert.equal(element.style.visibility, "hidden", "renderer unmount hides stale prompts");
projection.projectActionAnchors(camera, 667, 375);
assert.equal(element.style.visibility, "visible");
dispose();
const previousCalls = calls;
projection.projectActionAnchors(camera, 667, 375);
assert.equal(calls, previousCalls, "unmounted HUD does not leave projection callbacks");
assert.equal(element.style.visibility, "hidden");

// Preserve hook slots and commit layout effects without mounting a browser DOM.
const slots = [];
let cursor = 0;
let pendingEffects = [];
let anchorElement = null;
let anchorRef = null;
const hooks = {
  useRef(initial) {
    const index = cursor++;
    return (slots[index] ??= { current: initial });
  },
  useLayoutEffect(effect, dependencies) {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
      pendingEffects.push({ index, effect, dependencies });
    }
  },
};
const ui = { portrait: false, panels: 0 };
const { WorldActionAnchor } = await load("../src/ui/hud/WorldActionAnchor.tsx", {
  react: hooks,
  "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
  "@/game/interactions/action-projection": projection,
  "@/state/game-ui-store": { useGameUi: (select) => select(ui) },
  "@/state/hud-store": { useHud: (select) => select({ sheet: null, principalPanel: null }) },
  "@/state/game-store": { useGame: (select) => select({ overlay: "none" }) },
  "@/game/player/control-state": { useControls: (select) => select({ playerReady: true }) },
  "@/game/editor/store": { useWorldEditor: (select) => select({ mode: "PLAYER" }) },
  "./world-actions.css": {},
});
function renderAnchor(position) {
  cursor = 0;
  pendingEffects = [];
  const tree = WorldActionAnchor({ position, children: "Interact" });
  return () => {
    if (tree) {
      anchorElement ??= { style: {} };
      anchorRef = tree.props.ref;
      anchorRef.current = anchorElement;
    } else {
      anchorRef.current = null;
      anchorElement = null;
    }
    for (const { index } of pendingEffects) slots[index]?.cleanup?.();
    for (const { index, effect, dependencies } of pendingEffects) {
      slots[index] = { dependencies, cleanup: effect() };
    }
    pendingEffects = [];
    return anchorElement;
  };
}
let firstResolverCalls = 0;
const mountedAnchor = renderAnchor(() => {
  firstResolverCalls++;
  return [0, 0, 0];
})();
projection.projectActionAnchors(camera, 667, 375);
assert.equal(mountedAnchor.style.visibility, "visible");
const mountedTransform = mountedAnchor.style.transform;
let latestResolverCalls = 0;
const commitRerender = renderAnchor(() => {
  latestResolverCalls++;
  return [2, 0, 0];
});
assert.equal(commitRerender(), mountedAnchor, "rerender retains the same DOM element");
assert.equal(
  mountedAnchor.style.visibility,
  "visible",
  "committing a new inline resolver must not hide an already projected prompt",
);
assert.equal(mountedAnchor.style.transform, mountedTransform, "position waits for the next frame");
assert.equal(latestResolverCalls, 0, "rendering does not perform an extra projection");
projection.projectActionAnchors(camera, 667, 375);
assert.notEqual(
  mountedAnchor.style.transform,
  mountedTransform,
  "next frame uses the latest resolver",
);
assert.equal(firstResolverCalls, 1, "the replaced resolver is no longer called");
assert.equal(latestResolverCalls, 1, "the rerender leaves exactly one registered anchor");
ui.panels = 1;
assert.equal(renderAnchor(() => [0, 0, 0])(), null, "a blocking panel removes the prompt");
assert.equal(mountedAnchor.style.visibility, "hidden", "visibility cleanup hides the old element");
projection.projectActionAnchors(camera, 667, 375);
assert.equal(latestResolverCalls, 1, "hidden prompts no longer receive projection updates");
ui.panels = 0;
let reopenedCalls = 0;
const reopenedAnchor = renderAnchor(() => {
  reopenedCalls++;
  return [0, 0, 0];
})();
assert.notEqual(reopenedAnchor, mountedAnchor, "reopening mounts a fresh DOM element");
projection.projectActionAnchors(camera, 667, 375);
assert.equal(reopenedAnchor.style.visibility, "visible", "reopening registers projection again");
assert.equal(reopenedAnchor.style.transform, mountedTransform);
assert.equal(reopenedCalls, 1);
anchorRef.current = null;
for (const slot of slots) slot.cleanup?.();
assert.equal(reopenedAnchor.style.visibility, "hidden", "component unmount hides its prompt");
projection.projectActionAnchors(camera, 667, 375);
assert.equal(reopenedCalls, 1, "component unmount removes its projection callback");

const npc = { position: [1, 0, 2] };
const remotes = new Map([["peer", { x: 3, y: 0.83, z: 4 }]]);
let mission = { id: "parcel", position: [7, 0, 9] };
const positions = await load("../src/game/interactions/action-position.ts", {
  "@/state/game-store": { useGame: { getState: () => ({ playerPos: [0, 0.83, 0] }) } },
  "./interactables": { interactableById: (id) => (id === "npc" ? npc : null) },
  "@/net/useWorldChannel": { remoteStates: remotes },
  "@/game/missions/runtime": { missionInteraction: () => mission },
  "@/game/editor/store": {
    useWorldEditor: {
      getState: () => ({
        targets: [{ id: "door", active: true, position: { x: 5, y: -14, z: 7 } }],
      }),
    },
  },
  "@/game/world/street-props": { BENCHES: [{ id: "seat", position: [2, -14, 3] }] },
});
const position = (id, kind) => positions.nearbyActionPosition({ id, kind, label: id });
assert.deepEqual(position("npc", "npc"), [1, 2.25, 2]);
npc.position = [6, 4, 8];
assert.deepEqual(
  position("npc", "npc"),
  [6, 6.25, 8],
  "moving NPC is not frozen at initial position",
);
assert.deepEqual(
  position("seat", "bench"),
  [2, -12.8, 3],
  "seat anchor respects underground floor",
);
assert.deepEqual(position("door", "door"), [5, -12, 7]);
assert.deepEqual(position("peer", "player"), [3, 2.33, 4]);
assert.deepEqual(position("parcel", "mission"), [7, 1.6, 9]);
mission = { id: "next-parcel", position: [0, 0, 0] };
assert.equal(position("parcel", "mission"), null, "completed parcel target disappears");
remotes.delete("peer");
assert.equal(position("peer", "player"), null, "departed player prompt disappears");
assert.equal(position("missing", "npc"), null);

// Conversation controls reuse the command resolver and one overhead anchor.
const store = (value) =>
  Object.assign((select) => select(value), {
    getState: () => value,
    setState: (patch) => Object.assign(value, patch),
  });
const game = {
  overlay: "none",
  playerPos: [0, 0.83, 0],
  nearby: { id: "npc", kind: "npc", label: "Ko Asu" },
  socialAct: (kind) => {
    invoked = kind;
  },
  interact: () => {
    invoked = "talk";
  },
};
const hud = { sheet: null };
let invoked = null,
  quest = null;
const daily = { data: null, tracked: null };
let dailyInRange = true;
const core = { busy: false };
const mocks = {
  zustand: require("zustand"),
  "@/game/missions/truck-model": {},
  "@/game/missions/truck-state": { useTruckRoom: store({}) },
  "@/game/mobility/store": { useMobility: store({ carries: [] }) },
  "@/net/useWorldChannel": { playerId: "local" },
  "@/game/daily/talk": {
    startDailyTalk: () => {
      invoked = "daily-talk";
    },
  },
  "@/state/mission-focus": { useMissionFocus: store({ source: null }) },
  "@/net/channel-store": { useChannels: store({ playing: true }) },
  "@/state/game-store": { useGame: store(game) },
  "@/state/hud-store": { useHud: store(hud) },
  "@/state/game-ui-store": { gameUiBlocked: () => false },
  "@/game/player/control-state": { useControls: store({ playerReady: true }) },
  "@/game/editor/store": { useWorldEditor: store({ mode: "PLAYER" }) },
  "@/game/core/store": { useGameCore: store(core) },
  "@/game/core/quest-interaction": {
    nearbyQuestAction: () => quest,
    interactWithQuest: () => {
      invoked = "quest";
    },
  },
  "@/game/daily/store": {
    useDaily: store(daily),
    dailyCommand: () => {},
    trackDaily: () => {},
    dailyTargets: () => [],
    resolveDailyObjective: (o) => o,
    nearDailyObjective: () => dailyInRange,
  },
  "@/game/daily/types": { dailyStep: () => ({ index: 0 }), dailyActionLabel: () => "Bicara" },
  "@/game/daily/quest-giver-dialogue": { useQuestGiverDialogue: store({}) },
  "@/game/dungeon/store": { useDungeon: store({}) },
  "@/game/dungeon/dialogue-store": { useDungeonDialogue: store({}) },
  "@/game/dungeon/dialogue": {},
  "@/game/dungeon/staff": {},
  "@/game/editor/resolve": {},
  "@/game/world/landmarks": {},
  "@/game/secret/store": { useSecretQuest: store({}) },
  "@/game/club/store": { useClub: store({}) },
  "@/game/fishing/store": { useFishing: store({}) },
  "@/game/missions/store": { useMissions: store({ session: {}, available: [] }) },
  "@/game/missions/runtime": { missionInteraction: () => null },
  "@/game/missions/model": {},
  "./action-position": {
    nearbyActionPosition: positions.nearbyActionPosition,
    nearbyActionAvailable: () => true,
  },
};
const resolver = await load("../src/game/interactions/context-action.ts", mocks);
assert.deepEqual(resolver.currentContextAction().anchor(), [6, 6.25, 8]);
const Anchor = () => null,
  Extras = () => null;
const { ContextActionButton } = await load("../src/ui/hud/ContextActionButton.tsx", {
  "react/jsx-runtime": {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  },
  "lucide-react": { Hand: "Hand", LoaderCircle: "Spinner" },
  "@/hooks/use-context-action": { useContextActions: resolver.contextActions },
  "@/game/interactions/context-action": {
    ...resolver,
    useContextActionState: store({ busy: false }),
  },
  "./WorldActionAnchor": { WorldActionAnchor: Anchor },
  "./ContextPanel": { ContextPanel: Extras },
  "./NpcQuestionIcon": { NpcQuestionIcon: "NpcIcon" },
  "@/hooks/use-touch": { useTouchControls: () => true },
  "./context-actions.css": {},
});
const expand = (node) =>
  typeof node?.type === "function" && node.type !== Anchor && node.type !== Extras
    ? expand(node.type(node.props))
    : node;
const flatten = (raw) => {
  const node = expand(raw);
  return node && typeof node === "object"
    ? [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)]
    : [];
};
const npcControl = expand(ContextActionButton());
assert.equal(npcControl.type, Anchor);
await resolver.performContextAction("world:npc:npc");
assert.equal(invoked, "talk");
game.nearby = { id: "peer", kind: "player", label: "Teman" };
remotes.set("peer", { x: 1, y: 0.83, z: 1 });
const greeting = expand(ContextActionButton());
assert.equal(greeting.type, Anchor);
assert.equal(npcControl.props.position(), null, "old target hides after selection changes");
assert(
  flatten(greeting).some((n) => n.type === Extras),
  "greeting and extra social actions share one anchor",
);
assert.deepEqual(greeting.props.position(), [1, 2.33, 1]);
remotes.get("peer").x = 2;
assert.deepEqual(greeting.props.position(), [2, 2.33, 1], "greeting follows live player position");
await resolver.performContextAction("world:npc:npc");
assert.equal(invoked, "talk", "stale button cannot act on replacement target");
await resolver.performContextAction("world:player:peer");
assert.equal(invoked, "wave");
quest = {
  run: { id: "run" },
  index: 0,
  title: "Quest NPC",
  objective: { type: "TALK", position: [1, 0, 1] },
};
assert.equal(resolver.currentContextAction().id, "quest:run:0");
assert.equal(
  resolver.currentContextAction().anchor,
  undefined,
  "quest talk keeps the reachable control slot",
);
const questView = flatten(ContextActionButton());
assert(questView.some((n) => n.props?.className === "context-action"));
assert(questView.some((n) => n.props?.["aria-label"] === "Lanjut Quest · Quest NPC"));
assert.equal(
  questView.filter((n) => n.props?.["data-context-action"]).length,
  1,
  "only one keyboard-primary prompt",
);
assert(
  questView.some((n) => n.type === Anchor),
  "ambient greeting remains above the player beside quest control",
);
invoked = null;
await resolver.performContextAction();
assert.equal(invoked, "quest", "keyboard F advances the primary quest");
await resolver.performContextAction("world:player:peer");
assert.equal(invoked, "wave", "secondary greeting stays clickable during quest");
core.busy = true;
assert(
  flatten(ContextActionButton()).find((n) => n.props?.className === "context-action-button").props
    .disabled,
);
await resolver.performContextAction("quest:run:0");
assert.equal(invoked, "wave", "busy quest cannot execute");
core.busy = false;
for (const [type, label] of [
  ["COLLECT", "Ambil"],
  ["DELIVER", "Serahkan"],
]) {
  quest.objective.type = type;
  assert.equal(resolver.currentContextAction().label, label);
  assert(
    flatten(ContextActionButton()).some((n) => n.props?.["aria-label"] === `${label} · Quest NPC`),
  );
}
quest = null;
game.nearby = { id: "npc", kind: "npc", label: "Staf Gudang" };
daily.data = {
  quests: [
    {
      id: "talk-daily",
      status: "ACTIVE",
      progress: [0],
      definition: {
        ordered: true,
        objectives: [{ type: "TALK", required: 1, position: [2, 0, 1] }],
      },
    },
  ],
};
assert.equal(
  resolver.currentContextAction().anchor,
  undefined,
  "daily quest talk keeps its control slot",
);
assert(flatten(ContextActionButton()).some((n) => n.props?.className === "context-action"));
assert(
  flatten(ContextActionButton()).some((n) => n.props?.["aria-label"] === "Bicara · Staf Gudang"),
  "NPC conversation remains available during daily quest",
);
await resolver.performContextAction();
assert.equal(invoked, "daily-talk");
dailyInRange = false;
assert(
  !flatten(ContextActionButton()).some((n) => n.props?.className === "context-action"),
  "quest control disappears outside objective range",
);
await resolver.performContextAction("daily:talk-daily:0");
assert.equal(invoked, "daily-talk", "stale daily control cannot run outside range");
dailyInRange = true;
daily.data.quests[0].progress[0] = 1;
assert.equal(
  resolver.currentContextAction().id,
  "world:npc:npc",
  "completed objective leaves only NPC talk",
);
daily.data = null;
game.nearby = { id: "seat", kind: "bench", label: "Bangku" };
assert(
  flatten(ContextActionButton()).some((n) => n.props?.className === "context-action"),
  "object action retains control slot",
);
await resolver.performContextAction("quest:run:0");
assert.equal(
  invoked,
  "daily-talk",
  "completed or out-of-range quest cannot execute from stale button",
);
hud.sheet = "phone";
assert.equal(ContextActionButton(), null, "opening a sheet hides every prompt");
console.log(
  "Action anchors: camera/actor motion, resolver rerenders, visibility, resize, cleanup and target resolution passed.",
);
