// Exercise the real HUD composition with state snapshots, without a world/backend connection.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const state = {
  talking: false,
  storeIntro: false,
  warung: { inside: null, serviceView: false },
  game: { overlay: "none", playerPos: [0, 0.83, 0], toast: null, setToast() {} },
  hud: { sheet: null, principalPanel: null, setSheet() {} },
  panels: 0,
  showroomWalk: null,
  showroomIntro: false,
};
const element = (type, props) => ({ type, props });
const dependencies = {
  react: {
    useEffect() {},
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, () => {}],
  },
  "react/jsx-runtime": { jsx: element, jsxs: element, Fragment: "Fragment" },
  "@/game/warung/store": { useWarung: (select) => select(state.warung) },
  "@/game/showroom/layout": { isShowroomRoom: () => false },
  "@/game/home/store": { useHome: (select) => select({ inside: false }) },
  "@/state/game-store": { useGame: (select) => select(state.game) },
  "@/state/game-ui-store": { useGameUi: (select) => select(state) },
  "@/state/hud-store": { useHud: (select) => select(state.hud) },
  "@/game/dungeon/store": { useDungeon: (select) => select({ data: null }) },
  "@/identity/profile-store": {
    useProfile: (select) => select({ profile: { id: "player" }, error: null, load() {} }),
  },
  "@/net/net-store": { useNet: (select) => select({ setChatOpen() {} }) },
  "@/game/mountain/store": { useMountain: (select) => select({}) },
  "@/game/mobility/store": { useMobility: (select) => select({ carries: [] }) },
  "@/game/vehicles/model": { vehicleFor: () => null },
  "@/game/missions/store": { useMissions: (select) => select({ session: {} }) },
  "@/game/fishing/store": { useFishing: (select) => select({}) },
  "@/game/fishing/use-fishing-phase": { useFishingPhase: () => ({}) },
  "@/game/player/touch-drive": { useTouchDrive: (select) => select({}) },
  "@/game/player/control-state": { useControls: (select) => select({ playerReady: true }) },
  "@/hooks/use-context-action": { useContextAction: () => null },
  "@/hooks/use-touch": { useTouchControls: () => true },
  "@/hooks/use-mobile-hud": { useMobileHudLayout: () => ({ touch: true }) },
  "@/hooks/use-npc-conversation": { useNpcConversation: () => state.talking },
  "./announcements": { mapAnnouncementSeen: () => true },
  "@/ui/hud/EventFeed": { useFeedSources() {} },
};

async function load(path) {
  const source = (await readFile(new URL(path, import.meta.url), "utf8")).replace(
    "import.meta.env.DEV",
    "true",
  );
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
    (id) => dependencies[id] ?? new Proxy({}, { get: (_, name) => name }),
    module,
    module.exports,
  );
  return module.exports;
}

function inspect(tree, hidden = false, nodes = []) {
  if (Array.isArray(tree)) {
    tree.forEach((node) => inspect(node, hidden, nodes));
  } else if (tree && typeof tree === "object") {
    const invisible = hidden || tree.props?.hidden || tree.props?.style?.display === "none";
    nodes.push({
      name: typeof tree.type === "function" ? tree.type.name : tree.type,
      hidden: invisible,
    });
    inspect(tree.props?.children, invisible, nodes);
  }
  return nodes;
}
const visible = (nodes, name) => nodes.some((node) => node.name === name && !node.hidden);
const mounted = (nodes, name) => nodes.some((node) => node.name === name);
const { Hud } = await load("../src/ui/hud/Hud.tsx");
const { GameUi } = await load("../src/ui/GameUi.tsx");
const { GameplayHudLayer } = await load("../src/ui/hud/GameplayHudLayer.tsx");
const { HudSheetHost } = await load("../src/ui/hud/HudSheet.tsx");

const { MobileControls } = await load("../src/ui/hud/MobileControls.tsx");

for (const scenario of [
  { name: "city", inside: null, serviceView: false },
  { name: "owner", inside: { id: 1 }, serviceView: true },
  { name: "visitor", inside: { id: 2 }, serviceView: false },
  { name: "worker", inside: { id: 2 }, serviceView: true },
  { name: "returned to city", inside: null, serviceView: false },
]) {
  state.warung = { inside: scenario.inside, serviceView: scenario.serviceView };
  for (const sheet of [null, "phone"]) {
    state.hud.sheet = sheet;
    const hud = inspect(Hud());
    const game = inspect(GameUi({ mobileControlsEnabled: true }));
    const inWarung = !!scenario.inside;
    assert.equal(
      MobileControls() !== null,
      !scenario.serviceView && sheet === null,
      `${scenario.name}/${sheet}: movement and look gestures`,
    );
    assert.equal(mounted(hud, "StoryTracker"), false, "guide hint belongs to the HUD shortcut");
    for (const name of ["PlayerStatus", "UtilityBar", "ActionDock"])
      assert.equal(visible(hud, name), !inWarung, `${scenario.name}/${sheet}: ${name}`);
    for (const name of [
      "Minimap",
      "ChatPreview",
      "MobilityHud",
      "VehicleHud",
      "OjekBidCard",
      "MinigamesHud",
    ])
      assert.equal(
        visible(hud, name),
        !inWarung && sheet === null,
        `${scenario.name}/${sheet}: ${name}`,
      );
    assert.equal(visible(hud, "ContextActionButton"), !inWarung);
    for (const name of ["MountainHud", "FishingHud", "TruckHud"]) {
      assert.equal(visible(hud, name), !inWarung, `${scenario.name}: ${name} visibility`);
      assert.ok(mounted(hud, name), `${scenario.name}: keep ${name} effects mounted`);
    }
    for (const name of [
      "MountainRuntime",
      "DailyRuntime",
      "StoryRuntime",
      "MissionNotifications",
      "AmbientMusic",
      "WarungHud",
      "WarungSfx",
      "HudSheetHost",
    ])
      assert.ok(visible(hud, name), `${scenario.name}: preserve ${name}`);
    for (const name of ["GameCoreRuntime", "DungeonRuntime", "WorldChat", "MobileControls"])
      assert.ok(mounted(game, name), `${scenario.name}: preserve ${name}`);
    assert.equal(visible(game, "SecretDebug"), !inWarung);
  }
}

state.warung = { inside: { id: 2 }, serviceView: false };
state.hud.sheet = null;
state.panels = 1;
assert.equal(MobileControls(), null, "shopping panel pauses visitor controls");
state.panels = 0;
assert.ok(MobileControls(), "visitor controls return after shopping");

state.warung = { inside: null, serviceView: false };
for (const scenario of [
  { name: "shopping", sheet: "grosir", talking: false, hidden: true },
  { name: "grosir arrival", sheet: null, talking: false, hidden: true, storeIntro: true },
  { name: "closed drawer", sheet: null, talking: false, hidden: false },
  { name: "conversation", sheet: null, talking: true, hidden: true },
]) {
  state.hud.sheet = scenario.sheet;
  state.talking = scenario.talking;
  state.storeIntro = scenario.storeIntro ?? false;
  const layer = GameplayHudLayer({
    children: [Hud(), element("MobileControls", {}), element("ConnectionStatus", {})],
    panels: element("AuxiliaryPanels", {}),
  });
  const nodes = inspect(layer);
  for (const name of ["PlayerStatus", "UtilityBar", "MobileControls", "ConnectionStatus"])
    assert.equal(visible(nodes, name), !scenario.hidden, `${scenario.name}: ${name}`);
  for (const name of ["AmbientMusic", "DailyRuntime", "WarungHud", "MountainRuntime"])
    assert.ok(mounted(nodes, name), `${scenario.name}: preserve ${name} runtime`);
  assert.equal(visible(nodes, "AuxiliaryPanels"), !scenario.hidden);
  const hudLayer = layer.props.children[0];
  assert.equal(hudLayer.props.inert, scenario.hidden, `${scenario.name}: keyboard isolation`);
  assert.equal(!!hudLayer.props["aria-hidden"], scenario.hidden);
  if (scenario.sheet === "grosir") {
    assert.ok(mounted(nodes, "HudSheetHost"), "keep the portal host mounted while shopping");
    assert.equal(HudSheetHost().type, "GrosirDrawer", "kiosk uses its focused drawer");
  }
}
console.log(
  "Warung HUD isolation: city, owner, visitor, worker, phone, kiosk focus, close, conversation, and runtime continuity passed.",
);
