import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// Keep both libraries in the same module format: mixing ESM Three with CJS R3F
// bypasses R3F's ShaderMaterial instanceof check and hides this regression.
const require = createRequire(import.meta.url);
const THREE = require("three");
const { applyProps } = require("@react-three/fiber");

function evaluate(source, filename, dependencies = {}) {
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      assert(Object.hasOwn(dependencies, id), `Unexpected component dependency: ${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
  );
  return module.exports;
}

const sourceUrl = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL("../src/game/core/QuestGuidance.tsx", import.meta.url);
const availability = evaluate(
  await readFile(new URL("../src/game/dungeon/availability.ts", import.meta.url), "utf8"),
  "availability.ts",
);
const [componentSource, guidanceTarget, guidanceMotion, guidanceTrail, dailyTypes] =
  await Promise.all([
    readFile(sourceUrl, "utf8"),
    ...["quest-guidance.ts", "guidance-motion.ts", "guidance-trail.ts"].map(async (filename) => {
      const url = new URL(`../src/game/core/${filename}`, import.meta.url);
      return evaluate(await readFile(url, "utf8"), filename, {
        "@/game/dungeon/availability": availability,
      });
    }),
    readFile(new URL("../src/game/daily/types.ts", import.meta.url), "utf8").then((source) =>
      evaluate(source, "daily/types.ts"),
    ),
  ]);

const objective = { target: "test-destination", position: [0, 0, 15], required: 1 };
const snapshot = {
  active: { quest_id: "test-quest", status: "ACTIVE", progress: [0] },
  quests: [{ id: "test-quest", objectives: [objective] }],
};
let state;
const effects = [];
const cleanups = [];
const objects = [];
let frame;
const jsx = (type, props) => ({ type, props });
const { QuestGuidance } = evaluate(componentSource, fileURLToPath(sourceUrl), {
  react: {
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
    useEffect: (effect) => effects.push(effect),
  },
  "@/game/jsx/jsx-runtime": { jsx, jsxs: jsx },
  "@react-three/fiber": {
    useFrame: (callback) => {
      frame = callback;
    },
  },
  three: THREE,
  "@/game/swimming/model": { beachApproach: () => { throw new Error("Unexpected beach route"); } },
  "@/game/fishing/model": { fishingApproach: () => { throw new Error("Unexpected fishing route"); } },
  "@/game/avatar/grounding": { avatarSurfaceY: () => 0.05 },
  "@/game/world/road-surfaces": { ROAD_STYLE: { sidewalkY: 0.085 } },
  "@/game/world/street-props": { PLAYER_VISUAL_DROP: 0.83 },
  "@/state/game-store": {
    useGame: Object.assign((selector) => selector({ guidanceMuted: false }), {
      getState: () => ({ playerPos: [0, 0.83, 0] }),
    }),
  },
  "./use-world-guidance": {
    useWorldGuidanceTarget: () =>
      guidanceTarget.questGuidanceTarget(
        state.snapshot,
        state.dungeon,
        null,
        state.trackedDungeonEntrance,
      ),
  },
  "@/game/dungeon/store": {
    useDungeon: (selector) =>
      selector({ data: state.dungeon, tracked: state.trackedDungeonEntrance }),
  },
  "@/game/daily/store": { useDaily: (selector) => selector({ data: null, tracked: null }) },
  "@/game/daily/types": dailyTypes,
  "@/game/editor/resolve": { resolveObjective: (value) => value },
  "@/game/world/landmarks": { worldLandmarkFor: (_, position) => position },
  "./store": { useGameCore: (selector) => selector({ snapshot: state.snapshot }) },
  "./quest-guidance": guidanceTarget,
  "./guidance-motion": guidanceMotion,
  "./guidance-trail": guidanceTrail,
});

const constructors = {
  group: THREE.Group,
  mesh: THREE.Mesh,
  instancedMesh: THREE.InstancedMesh,
  planeGeometry: THREE.PlaneGeometry,
  shaderMaterial: THREE.ShaderMaterial,
};

// Mount the component's real JSX properties through installed R3F applyProps,
// including its copying of supplied uniforms. No WebGL/browser is required.
function mount(element, parent) {
  if (!element) return;
  const Constructor = constructors[element.type];
  assert(Constructor, `Unexpected scene element: ${element.type}`);
  const { args = [], children, ref, ...props } = element.props;
  const object = new Constructor(...args);
  objects.push(object);
  applyProps(object, props);
  if (ref) ref.current = object;
  if (object.isMaterial) parent.material = object;
  else if (object.isBufferGeometry) parent.geometry = object;
  else parent.add(object);
  for (const child of Array.isArray(children) ? children : [children]) mount(child, object);
}

function checkScenario(nextState, verify) {
  state = { snapshot: null, dungeon: null, trackedDungeonEntrance: false, ...nextState };
  frame = undefined;
  const scene = new THREE.Scene();
  const player = new THREE.Group();
  player.name = "Player";
  player.position.set(0, 0.83, 0);
  scene.add(player);
  try {
    mount(QuestGuidance(), scene);
    for (const effect of effects) {
      const cleanup = effect();
      if (cleanup) cleanups.push(cleanup);
    }
    assert.equal(typeof frame, "function", "guidance registers a frame callback");
    verify({ scene, player });
  } finally {
    for (const cleanup of cleanups.reverse()) cleanup();
    for (const object of objects.reverse()) object.dispose?.();
    cleanups.length = effects.length = objects.length = 0;
  }
}

function advance(scene, start = 0) {
  for (let index = 1; index <= 60; index++) {
    frame({ scene, clock: { elapsedTime: start + index / 60 } }, 1 / 60);
  }
}

function visibleTrail(scene, context) {
  const trail = scene.getObjectByName("quest-arrow-trail");
  assert(trail?.isInstancedMesh, "the component mounts the instanced arrow trail");
  assert(
    trail.geometry.getAttribute("trailOpacity").array.some((alpha) => alpha > 0.5),
    `${context} has visible arrow instances`,
  );
  assert(trail.parent.visible, "the direction group is visible away from the target");
  assert(
    trail.material.uniforms.strength.value > 0.9,
    `rendered trail strength must leave zero; got ${trail.material.uniforms.strength.value}`,
  );
  return trail;
}

const previousWindow = globalThis.window;
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
try {
  checkScenario({ snapshot }, ({ scene }) => {
    advance(scene);
    visibleTrail(scene, "the active 15m quest");

    const halo = scene.getObjectByName("quest-objective-halo");
    const firstStrength = halo.children[0].material.uniforms.strength.value;
    frame({ scene, clock: { elapsedTime: 2 } }, 1 / 60);
    assert.notEqual(
      halo.children[0].material.uniforms.strength.value,
      firstStrength,
      "the mounted halo material receives its animated uniform",
    );

    objective.position[0] = NaN;
    frame({ scene, clock: { elapsedTime: 3 } }, 1 / 60);
    assert.equal(scene.getObjectByName("quest-foot-guidance").visible, false);
    assert.equal(halo.visible, false, "invalid target coordinates hide guidance");
    objective.position[0] = 0;
  });

  // Stale tracking must not resurrect the retired Principal entrance.
  const entrance = [-12, 0, 18];
  const dungeon = { instance: null, config: { entrance, objectives: [] } };
  checkScenario({ dungeon }, ({ scene }) => {
    advance(scene);
    assert.equal(
      scene.getObjectByName("quest-arrow-trail"),
      undefined,
      "an untracked Principal entrance does not create directional guidance",
    );
    assert.equal(scene.getObjectByName("quest-objective-halo"), undefined);
  });
  for (const activeSnapshot of [null, snapshot]) {
    checkScenario(
      { dungeon, snapshot: activeSnapshot, trackedDungeonEntrance: true },
      ({ scene, player }) => {
        advance(scene);
        if (!activeSnapshot) {
          assert.equal(scene.getObjectByName("quest-arrow-trail"), undefined);
          assert.equal(scene.getObjectByName("quest-objective-halo"), undefined);
          return;
        }
        const trail = visibleTrail(scene, "the current world quest");
        const halo = scene.getObjectByName("quest-objective-halo");
        assert(halo.visible, "the quest has a visible destination halo");
        assert.equal(halo.position.x, objective.position[0]);
        assert.equal(halo.position.z, objective.position[2]);
        assert.equal(
          trail.parent.rotation.y,
          Math.atan2(objective.position[0], objective.position[2]),
          "the arrow follows the world quest despite stale dungeon tracking",
        );

        player.position.set(objective.position[0], 0.83, objective.position[2]);
        advance(scene, 1);
        assert.equal(trail.parent.visible, false, "arriving at the objective hides direction");
        assert(
          trail.material.uniforms.strength.value < 0.01,
          "the mounted arrow material fades out after arrival",
        );
        assert(halo.visible, "the quest marker remains visible at arrival");
      },
    );
  }
  console.log(
    "PASS guidance material: visible trail, animated halo, invalid-target hiding, retired Principal stays hidden and arrival",
  );
} finally {
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}
