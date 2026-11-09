import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.QA_OUTPUT || root + "/docs/qa/reference-vehicles/gallery";
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
  await page.goto("http://127.0.0.1:4245/");
  await page.waitForFunction(() => window.qa?.kind);
  await page.waitForTimeout(2200);
  for (const kind of ["car", "mpv", "pickup", "angkot", "motorcycle", "scooter", "van", "truck", "convertible", "bajaj", "jeepney"]) {
    await page.evaluate((kind) => window.qa.kind(kind), kind);
    await page.waitForTimeout(600);
    for (const side of ["three-quarter", "front", "side", "rear"]) {
      await page.evaluate((side) => window.qa.view(side), side);
      await page.waitForTimeout(200);
      await page.screenshot({ path: output + "/" + kind + "-" + side + ".png" });
    }
  }
  const npcCost = [];
  await page.evaluate(() => window.qa.occupants(false));
  for (const kind of ["car", "mpv", "pickup", "angkot", "motorcycle", "scooter", "van", "truck", "convertible", "bajaj", "jeepney"]) {
    await page.evaluate((kind) => { window.qa.npc(false); window.qa.kind(kind); window.qa.view("three-quarter"); }, kind);
    await page.waitForTimeout(650);
    const before = await page.evaluate(() => window.qa.renderer.info.render.calls);
    await page.evaluate(() => window.qa.npc(true));
    await page.waitForTimeout(650);
    const after = await page.evaluate(() => window.qa.renderer.info.render.calls);
    npcCost.push({kind, twoVehiclesWithoutNpc:before, twoVehiclesWithNpc:after, extraCalls:after-before});
    assert(after-before <= 8, `${kind}: NPC remains within four main/shadow calls per car`);
    assert(await page.evaluate(() => { let found=false; window.qa.scene.traverse(o=>{if(o.userData.trafficDriver)found=true;}); return found; }));
    await page.screenshot({ path: output + "/npc-" + kind + ".png" });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    output + "/gallery.json",
    JSON.stringify({ errors, models: 11, rigs: ["Base", "Explorer"], views: 4, npcModels: 11, npcCost }, null, 2),
  );
} finally {
  await browser.close();
  await server.close();
}
