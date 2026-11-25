// Render the real generators through Web Audio; no accounts, audio devices or API calls.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import ts from "typescript";

const source = await readFile(
  new URL("../src/game/audio/street-sounds.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const results = await page.evaluate(async (url) => {
    const { createStreetSounds } = await import(url);
    const results = [];
    for (const cue of ["carPass", "horn", "chatter"]) {
      for (const stopped of [false, true]) {
        const ctx = new OfflineAudioContext(2, 24000 * 7, 24000);
        const noise = ctx.createBuffer(1, 24000 * 7, 24000);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const sounds = createStreetSounds(ctx, ctx.destination, noise);
        sounds[cue]();
        if (stopped) sounds.stop();
        const rendered = await ctx.startRendering();
        let peak = 0,
          energy = 0,
          tail = 0,
          stereo = 0;
        const left = rendered.getChannelData(0),
          right = rendered.getChannelData(1);
        for (let i = 0; i < left.length; i++) {
          peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
          energy += left[i] ** 2 + right[i] ** 2;
          stereo += (left[i] - right[i]) ** 2;
          if (i > 24000 * 6) tail += left[i] ** 2 + right[i] ** 2;
        }
        sounds.stop();
        results.push({ cue, stopped, peak, energy, tail, stereo });
      }
    }
    return results;
  }, moduleUrl);
  for (const result of results) {
    assert(Number.isFinite(result.peak), `${result.cue}: finite waveform`);
    if (result.stopped)
      assert.equal(result.energy, 0, `${result.cue}: area switch cancels queued voices`);
    else {
      assert(result.energy > 0.01, `${result.cue}: audible output`);
      assert(result.peak < 0.6, `${result.cue}: headroom for the ambience mix`);
      assert(result.tail < 0.00001, `${result.cue}: voice ends without a stuck source`);
      if (result.cue !== "horn") assert(result.stereo > 0.001, `${result.cue}: spatial separation`);
    }
  }
  console.log(
    "PASS: cars, horns and chatter produce finite stereo audio, keep mix headroom, end cleanly, and cancel on area changes (6 renders).",
  );
} finally {
  await browser.close();
}
