// Fixed-camera stills of the club, mosque and mountain waterfall for visual QA.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = root + "/tests/fixtures/landmarks";
const output = process.env.LANDMARKS_QA_OUTPUT || root + "/docs/qa/landmarks";
await mkdir(output, { recursive: true });
const mosqueFront = "106,12,104,106,5.8,132";
const SHOTS = {
  "club-night": ["22,2.6,19,22,4,35", "21:00"],
  "club-day": ["16,3,21,22,3.5,35", "12:00"],
  "mosque-front": [mosqueFront, "12:00"],
  "mosque-corner": ["123,13,112,106,6.5,132", "15:00"],
  "mosque-night": [mosqueFront, "21:00"],
  "mosque-mobile": [mosqueFront, "12:00"],
  "street-night": ["28.5,5,10,28.5,4,35", "21:00"],
  "waterfall-day": ["355,13,42,355,17,10", "12:00"],
  "waterfall-close": ["349,10,27,355,13,12", "16:30"],
  "trees-day": ["372,24,30,385,24,10", "12:00"],
};
const only = (process.env.LANDMARKS_SHOTS || "").split(",").filter(Boolean);
const server = await createServer({
  configFile: false,
  root: fixture,
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  resolve: {
    alias: [
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/mountain/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4275, strictPort: true, hmr: false, fs: { allow: [root] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const errors = [];
  for (const [name, [cam, time]] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(name)) continue;
    const page = await browser.newPage({
      hasTouch: name === "mosque-mobile",
      viewport:
        name === "mosque-mobile" ? { width: 740, height: 360 } : { width: 1100, height: 700 },
    });
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(`http://127.0.0.1:4275/?cam=${cam}&worldTime=${time}`);
    await page.waitForFunction(() => window.landmarksReady, null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    if (name.startsWith("mosque-")) {
      await page.waitForFunction(
        () => window.mosqueQA?.floor !== null && window.mosqueQA?.floor !== undefined,
      );
      const qa = await page.evaluate(() => window.mosqueQA);
      assert.equal(qa.retiredDungeon, false);
      assert(qa.courtyardToHall > 3.9 && qa.courtyardToHall < 4.8, JSON.stringify(qa));
      assert(Math.abs(qa.floor - 1.76) < 0.01, JSON.stringify(qa));
      assert(Math.abs(qa.dome - 7.9) < 0.01, JSON.stringify(qa));
      assert(qa.minaret > 0.5 && qa.minaret < 1.5, JSON.stringify(qa));
      assert(Math.abs(qa.portico - 5.3) < 0.01, JSON.stringify(qa));
      assert(Math.abs(qa.colonnade - 1.85) < 0.01, JSON.stringify(qa));
      assert(Math.abs(qa.terrace - 1.94) < 0.01, JSON.stringify(qa));
      assert(qa.meshes < 25 && qa.instances < 200, JSON.stringify(qa));
      console.log("PASS mosque geometry, approach, colliders and render budget", name, qa);
    }
    await page.screenshot({ path: `${output}/${name}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS landmark stills: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
