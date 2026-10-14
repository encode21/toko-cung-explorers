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
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-explorer-qa";
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

const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:4221/explorer.html");
  await page.waitForFunction(() => window.qaStats?.calls > 10);
  await page.waitForTimeout(1500);
  for (const [label, angle] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    await page.evaluate((angle) => window.qa.setAngle(angle), angle);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/explorer-${label}.png` });
  }
  const original = await page.evaluate(() => window.qaStats);
  await page.evaluate(() => {
    window.qa.setAngle(0);
    window.qa.setSpeed(4.2);
    window.qa.setCount(2);
    window.qa.setAppearance({
      version: 1,
      headwear: "none",
      eyewear: "round-glasses",
      audio: "headphones",
      back: "urban-pack",
      colors: {
        skin: "#c88a5f",
        hair: "#302720",
        jacket: "#3f86c9",
        trim: "#c0a062",
        pants: "#384947",
        shoes: "#42352d",
        backpack: "#687b61",
      },
    });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/explorer-two-players.png` });
  for (const pose of ["Sit", "CarryBox", "Jump", "Wave", "Fall", "GetUp", "UsePhone", "Hit"]) {
    await page.evaluate((pose) => window.qa.setPose(pose), pose);
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => {
    window.qa.setPose(undefined);
    window.qa.setCount(1);
    window.qa.setSpeed(0);
    window.qa.setAppearance({
      version: 1,
      headwear: "none",
      eyewear: "none",
      audio: "none",
      back: "none",
    });
  });
  await page.waitForTimeout(400);
  for (const [label, angle] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    await page.evaluate((angle) => window.qa.setAngle(angle), angle);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/no-equipment-${label}.png` });
  }
  await page.evaluate(() =>
    window.qa.setAppearance({
      version: 1,
      headwear: "baseball-cap",
      eyewear: "sunglasses",
      audio: "none",
      back: "urban-pack",
    }),
  );
  for (const [label, angle] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    await page.evaluate((angle) => window.qa.setAngle(angle), angle);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/urban-${label}.png` });
  }
  await page.evaluate(() =>
    window.qa.setAppearance({
      version: 1,
      headwear: "none",
      eyewear: "none",
      audio: "none",
      back: "none",
    }),
  );
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.qa.setCount(0));
    await page.waitForTimeout(60);
    await page.evaluate(() => window.qa.setCount(2));
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => {
    window.qa.setCount(1);
    window.qaFrames = [];
  });
  await page.waitForTimeout(1000);
  console.log("Isolated renderer", {
    original,
    afterRemount: await page.evaluate(() => window.qaStats),
    frameMs: await page.evaluate(() => {
      const v = window.qaFrames.slice().sort((a, b) => a - b);
      return { median: v[Math.floor(v.length / 2)], p95: v[Math.floor(v.length * 0.95)] };
    }),
  });
  await page.close();
  // Wardrobe UI flow is exercised in check-wardrobe-browser.mjs.
  assert.deepEqual(errors, []);
  console.log(
    "PASS Explorer rendering, poses and repeated mounts. Wardrobe UI has a separate flow suite.",
  );
} finally {
  await browser.close();
  await server.close();
}
