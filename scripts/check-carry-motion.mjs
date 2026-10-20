// Motion invariants: frame-rate independence, shared attachment sample, and a smooth mount.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/game/mobility/render-pose.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { remoteRenderPose, pruneRenderPoses, createCarryBlend, blendCarryMount } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const zero = { x: 0, y: 0, z: 0, ry: Math.PI - 0.1 };
const target = { x: 3, y: 1, z: 1, ry: -Math.PI + 0.1 };
const results = [30, 60, 120].map((fps) => {
  const id = `fps-${fps}`;
  remoteRenderPose(id, zero, 0, 0);
  let sample;
  for (let frame = 1; frame <= fps / 2; frame++) {
    sample = remoteRenderPose(id, target, frame / fps, 1 / fps);
    const first = { ...sample };
    // Carrier and rider must see the exact same frame even when both request it.
    assert.deepEqual(remoteRenderPose(id, target, frame / fps, 1 / fps), first);
  }
  assert(Math.abs(sample.ry - Math.PI) < 0.11, "turn crosses the short arc at ±pi");
  return { ...sample };
});
for (const sample of results)
  assert(Math.abs(sample.x - results[0].x) < 1e-10, "motion is frame-rate independent");
const blend = createCarryBlend();
let prev = zero,
  firstStep;
for (let frame = 0; frame < 60; frame++) {
  const next = blendCarryMount(blend, "pair", prev, target, 1 / 60);
  if (frame === 0) firstStep = next.x;
  assert(next.x >= prev.x && next.x <= target.x, "mount converges without overshoot");
  prev = next;
}
assert(firstStep > 0 && firstStep < 1, "mount does not snap to destination");
assert(Math.abs(prev.x - target.x) < 0.001, "mount settles promptly");
const moved = blendCarryMount(blend, "pair", prev, { ...target, x: 8 }, 1 / 60);
assert(Math.abs(moved.x - 8) < 0.001, "settled passenger follows moving carrier without extra lag");
pruneRenderPoses([]);
assert.deepEqual(
  remoteRenderPose("fps-60", target, 1, 1 / 60),
  target,
  "disconnect removes old interpolation",
);
console.log(
  "Carry motion: shared frame, short turns, 30/60/120fps, smooth mount, no follow lag, disconnect reset passed",
);
