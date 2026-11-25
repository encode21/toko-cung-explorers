import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { chromium } from "playwright";
const source = await readFile(new URL("../src/game/audio/bus-sound.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (url) => {
    const { createBusSound } = await import(url);
    const results = [];
    for (const mode of ["idle", "driving", "doors", "stopped", "far", "nearby"]) {
      const ctx = new OfflineAudioContext(1, 24000 * 2, 24000);
      const noise = ctx.createBuffer(1, 24000, 24000);
      const input = noise.getChannelData(0);
      for (let i = 0; i < input.length; i++) input[i] = Math.random() * 2 - 1;
      const sound = createBusSound(ctx, ctx.destination, noise);
      sound.update(
        ["driving", "far", "nearby"].includes(mode) ? 7 : 0,
        mode === "doors" ? 1 : 0,
        mode === "far" ? 0 : mode === "nearby" ? 0.25 : 1,
      );
      if (mode === "stopped") sound.stop();
      const rendered = await ctx.startRendering();
      let energy = 0,
        peak = 0;
      for (const v of rendered.getChannelData(0)) {
        energy += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      if (mode !== "stopped") sound.stop();
      results.push({ mode, energy, peak });
    }
    return results;
  }, url);
  const [idle, driving, doors, stopped, far, nearby] = result;
  assert(idle.energy > 0);
  assert(driving.energy > idle.energy * 3, "traction and tires follow road speed");
  assert(doors.energy > idle.energy * 1.2, "pneumatic door release is audible");
  assert.equal(stopped.energy, 0, "unmount/mute cleanup is silent");
  assert.equal(far.energy, 0, "distant bus is silent to pedestrians");
  assert(
    nearby.energy > 0 && nearby.energy < driving.energy * 0.1,
    "passing bus attenuates with distance",
  );
  assert(
    result.every((r) => Number.isFinite(r.peak) && r.peak < 0.8),
    "finite waveform with mix headroom",
  );
  console.log(
    "PASS: electric bus idle, traction/tires, pneumatic doors and cleanup and pedestrian distance (6 offline renders).",
  );
} finally {
  await browser.close();
}
