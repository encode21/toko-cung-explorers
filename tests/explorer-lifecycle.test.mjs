import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import * as explorerRig from "../src/game/avatar/explorer-rig.ts";
import { explorerClips } from "../src/game/avatar/explorer-clips.ts";
import { DEFAULT_EXPLORER } from "../src/identity/explorer.ts";
import { isJumpAnimation, jumpBlendSeconds } from "../src/game/avatar/jump-clips.ts";

const bytes = await readFile(new URL("../public" + explorerRig.EXPLORER_URL, import.meta.url));
const asset = await new GLTFLoader()
  .setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const source = await readFile(
  new URL("../src/game/avatar/ExplorerAvatar.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

// Run the actual component's effects and animation frame against the real GLB
// and Three mixer; control only React lifecycle and unrelated world services.
function harness() {
  const effects = [],
    frames = [];
  const animation = { current: undefined },
    speed = { current: 0 };
  let rig,
    cleanups = [];
  const pose = () => ({ restore() {}, apply() {} });
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useRef: (current) => ({ current }),
      useMemo: (factory) => factory(),
      useEffect: (effect) => effects.push(effect),
    },
    three: T,
    "@react-three/drei": { useGLTF: () => asset },
    "@react-three/fiber": { useFrame: (frame) => frames.push(frame) },
    "./explorer-clips": { explorerClips },
    "./explorer-rig": {
      ...explorerRig,
      createExplorerRig: (...args) => (rig = explorerRig.createExplorerRig(...args)),
    },
    "@/identity/explorer": { DEFAULT_EXPLORER },
    "@/game/mountain/outfit-meshes": { attachMountainOutfit: () => undefined },
    "@/game/garasi/rider-gear": {
      useRiderGear: () => null,
      attachRiderGear: () => undefined,
    },
    "./ride-pose": { createRidePose: pose },
    "../vehicles/runtime": { driverSeat: () => undefined },
    "./ride-clips": { isRideAnimation: () => false },
    "./flight-clips": { isFlightAnimation: () => false },
    "./swim-clips": { isSwimAnimation: () => false },
    "@/game/photo/selfie-pose": { createSelfiePose: pose },
    "@/game/photo/photo-store": { usePhoto: { getState: () => ({}) } },
    "@/state/hud-store": { useHud: { getState: () => ({}) } },
    "./grounding": { avatarSurfaceY: () => 0 },
    "../club/store": { clubNow: () => 0, danceFor: () => null },
    "./jump-clips": { isJumpAnimation, jumpBlendSeconds },
  };
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    if (name.endsWith("jsx-runtime")) return { jsx, jsxs: jsx, Fragment: "fragment" };
    assert.ok(modules[name], `Unmocked module: ${name}`);
    return modules[name];
  }, exports);
  exports.ExplorerAvatar({ animation, speed });
  return {
    rig,
    animation,
    speed,
    mount: () => {
      cleanups = effects.map((effect) => effect());
    },
    cleanup: () => {
      for (const cleanup of cleanups) cleanup?.();
    },
    tick: () => {
      for (const frame of frames) frame({}, 1 / 60);
    },
  };
}

for (const initialFrames of [0, 12]) {
  test(`ExplorerAvatar survives effect cleanup/replay after ${initialFrames} frames`, () => {
    const h = harness();
    h.mount();
    for (let i = 0; i < initialFrames; i++) h.tick();

    for (let replay = 0; replay < 3; replay++) {
      h.cleanup();
      assert.equal(h.rig.mixer.stats.actions.total, 0, "cleanup releases cached actions");
      assert.equal(h.rig.mixer.stats.bindings.total, 0, "cleanup releases property bindings");
      h.mount();
      for (const name of [undefined, "Walk", "Drink", "Laugh", "Jump", "Idle"]) {
        h.animation.current = name;
        h.speed.current = name === "Walk" ? 1.4 : 0;
        for (let frame = 0; frame < 30; frame++) h.tick();
        h.rig.scene.updateMatrixWorld(true);
        h.rig.scene.traverse((node) => {
          assert.ok(node.matrixWorld.elements.every(Number.isFinite), `${name}: finite transforms`);
        });
      }
      assert.ok(h.rig.mixer.stats.actions.inUse > 0, "avatar continues animating after replay");
    }

    h.cleanup();
    assert.equal(h.rig.mixer.stats.actions.total, 0);
    assert.equal(h.rig.mixer.stats.bindings.total, 0);
  });
}
