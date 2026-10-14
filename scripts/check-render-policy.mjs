import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
let source = await readFile(
  new URL("../src/game/engine/AdaptiveQuality.tsx", import.meta.url),
  "utf8",
);
let { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
outputText = outputText
  .replace(/^import .*?;\n/gm, "")
  .replace(/^export \{ useRenderBudget \}.*?;\n/gm, "");
const hooks = [],
  effects = [];
let cursor = 0,
  frame,
  now = 0,
  settings = "AUTO",
  needsRender = false;
const listeners = new Map(),
  budget = { tier: "MEDIUM" };
let dpr = 0;
const camera = { far: 0, updateProjectionMatrix() {} };
const three = {
  setDpr: (v) => {
    dpr = v;
  },
  camera,
};
const window = {
  devicePixelRatio: 3,
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: (name) => listeners.delete(name),
};
const document = {
  hidden: false,
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: (name) => listeners.delete(name),
};
function useRenderBudget(selector) {
  return selector(budget);
}
useRenderBudget.setState = (patch) => {
  if (patch.tier && patch.tier !== budget.tier) needsRender = true;
  Object.assign(budget, patch);
};
globalThis.renderPolicyQA = {
  useRef(value) {
    const i = cursor++;
    return hooks[i] ?? (hooks[i] = { current: value });
  },
  useEffect(fn, deps) {
    const i = cursor++;
    const old = hooks[i];
    if (!old || deps.some((d, n) => d !== old.deps[n]))
      effects.push(() => {
        old?.cleanup?.();
        hooks[i] = { deps, cleanup: fn() };
      });
  },
  useFrame(fn) {
    frame = fn;
  },
  useThree: (fn) => fn(three),
  useGameSettings: (fn) => fn({ graphics: settings }),
  INITIAL_TIER: "MEDIUM",
  RENDER_LIMITS: {
    LOW: { dpr: 1, far: 260 },
    MEDIUM: { dpr: 1.25, far: 340 },
    HIGH: { dpr: 1.5, far: 420 },
  },
  useRenderBudget,
  window,
  document,
  performance: { now: () => now },
};
const prelude =
  "const {useRef,useEffect,useFrame,useThree,useGameSettings,INITIAL_TIER,RENDER_LIMITS,useRenderBudget,window,document,performance}=globalThis.renderPolicyQA;\n";
const { AdaptiveQuality } = await import(
  "data:text/javascript;base64," + Buffer.from(prelude + outputText).toString("base64")
);
function render() {
  cursor = 0;
  needsRender = false;
  AdaptiveQuality();
  while (effects.length) effects.shift()();
}
const gl = {
  info: { render: { calls: 50, triangles: 1000 }, memory: { geometries: 10, textures: 2 } },
};
function advance(seconds, fps = 60) {
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    now += 1000 / fps;
    frame({ gl }, 1 / fps);
    if (needsRender) render();
  }
}
render();
assert.equal(dpr, 1.25);
advance(19, 20);
assert.equal(budget.tier, "MEDIUM", "short slowdown does not drop the tier");
advance(12, 20);
assert.equal(budget.tier, "LOW");
assert.equal(dpr, 1);
advance(30, 60);
assert.equal(budget.tier, "LOW", "short recovery does not oscillate");
advance(30, 60);
assert.equal(budget.tier, "MEDIUM");
listeners.get("resize")();
advance(16, 20);
assert.equal(budget.tier, "MEDIUM", "resize resets the sampling window");
settings = "HIGH";
render();
advance(90, 15);
assert.equal(budget.tier, "HIGH", "manual choice remains fixed");
assert.equal(dpr, 1.5);
settings = "AUTO";
render();
document.hidden = true;
advance(40, 10);
assert.equal(budget.tier, "MEDIUM");
document.hidden = false;
listeners.get("visibilitychange")();
advance(10, 60);
assert.equal(budget.tier, "MEDIUM");
console.log(
  "PASS mobile initial DPR, sustained slowdown/recovery, cooldown, resize/visibility reset, manual tier",
);
