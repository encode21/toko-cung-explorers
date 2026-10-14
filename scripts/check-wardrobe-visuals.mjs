// Isolated real HUD components, mocked transport; no live account required.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/hud";
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-wardrobe-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/aiApi/npc.functions", replacement: qa + "/npc-api.ts" },
      { find: "@tanstack/react-start", replacement: qa + "/server-fn.ts" },
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: qa + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4221, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });

const { readFile } = await import("node:fs/promises");
const catalog = JSON.parse(await readFile(root + "/src/identity/wardrobe-catalog.json", "utf8"));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4221/explorer.html");
  await page.waitForFunction(() => window.qaStats?.calls > 10);
  const variants = catalog
    .filter((i) => i.preset)
    .map((i) => ({ version: 2, ...i.preset, colors: i.colors }));
  variants.push({
    version: 2,
    top: "tshirt",
    bottom: "skirt-leggings",
    footwear: "slip-on",
    headwear: "rabbit-band",
    hairDecoration: "flower-clip",
    eyewear: "heart-glasses",
    audio: "earrings",
    neck: "neck-scarf",
    back: "small-wings",
  });
  await page.evaluate((variants) => {
    window.qa.setCount(variants.length);
    window.qa.setVariants(variants);
    window.qaCamera.position.set(0, 1.1, 7.5);
    window.qaCamera.lookAt(0, 0, 0);
  }, variants);
  for (const pose of [
    "Idle",
    "Walk",
    "Run",
    "Talk",
    "Wave",
    "Sit",
    "Jump",
    "CarryBox",
    "UsePhone",
    "PickItem",
    "Checkout",
    "Hit",
    "Fall",
    "GetUp",
  ]) {
    await page.evaluate((pose) => {
      window.qa.setPose(pose);
      window.qa.setSpeed(["Walk", "Run", "CarryBox"].includes(pose) ? 4.2 : 0);
    }, pose);
    await page.waitForTimeout(pose === "Hit" ? 120 : 350);
    await page.screenshot({ path: `${output}/pose-${pose}.png` });
  }
  await page.evaluate(() => {
    window.qa.setPose(undefined);
    window.qa.setSpeed(4.2);
    window.qa.setAngle(Math.PI);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/outfits-back.png` });
  await page.evaluate(() => {
    window.qa.setCount(1);
    window.qa.setVariants([]);
    window.qa.setAppearance({ version: 2 });
    window.qa.setAngle(0);
    window.qaCamera.position.set(0, 1.1, 4.4);
    window.qaCamera.lookAt(0, 0, 0);
    window.qaFrames = [];
  });
  await page.waitForTimeout(1500);
  console.log(
    "Default wardrobe",
    await page.evaluate(() => ({
      stats: window.qaStats,
      median: [...window.qaFrames].sort((a, b) => a - b)[Math.floor(window.qaFrames.length * 0.5)],
      p95: [...window.qaFrames].sort((a, b) => a - b)[Math.floor(window.qaFrames.length * 0.95)],
    })),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS rendered 14 existing pose states with five outfits; inspect screenshots for artistic fit.",
  );
} finally {
  await browser.close();
  await server.close();
}
