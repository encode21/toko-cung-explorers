import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = root + "/docs/qa/cartoon-world/effects";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/cartoon-world",
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/hud/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4245, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4245/?nature");
  await page.waitForFunction(() => window.qa?.move);
  await page.waitForTimeout(2000);
  const counts = () =>
    page.evaluate(() => {
      const p = window.qa.scene.getObjectByName("WaterContactPool");
      return p.children.map((m) => m.count);
    });
  for (const actor of [0, 1]) {
    await page.evaluate((i) => window.qa.move(i, true), actor);
    await page.waitForTimeout(170);
    const wet = await counts();
    assert(wet[0] > 0 && wet[0] <= 64 && wet[1] > 0);
    await page.screenshot({ path: output + "/splash-" + actor + ".png" });
    await page.evaluate((i) => window.qa.move(i, false), actor);
    await page.waitForTimeout(1100);
    assert.deepEqual(await counts(), [0, 0], "Effects stop on dry land");
  }
  const wind = () =>
    page.evaluate(() => {
      const values = [];
      window.qa.scene.traverse((o) => {
        if (o.material?.userData.wind) values.push(o.material.userData.wind.value);
      });
      return values;
    });
  assert((await wind()).some((n) => n > 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(150);
  assert((await wind()).every((n) => n === 0));
  await page.evaluate(() => window.qa.move(0, true));
  await page.waitForTimeout(150);
  const reduced = await counts();
  assert.equal(reduced[0], 0);
  assert(reduced[1] > 0);
  await page.evaluate(async () => {
    await window.qa.audio.unlock();
    window.qa.audio.gain();
    window.qa.audio.settings.getState().setVolume("sfx", 0);
  });
  await page.waitForTimeout(900);
  assert(await page.evaluate(() => window.qa.audio.gain() < 0.001));
  await page.evaluate(() => window.qa.audio.settings.getState().toggleMuted());
  assert.equal(await page.evaluate(() => window.qa.audio.audible()), false);
  await page.screenshot({ path: output + "/nature-reduced-motion.png" });
  assert.deepEqual(errors, []);
  await writeFile(
    output + "/effects.json",
    JSON.stringify(
      {
        localAndRemoteContacts: true,
        dryStop: true,
        boundedPool: true,
        reducedMotion: true,
        muted: true,
        sfxVolumeZero: true,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
