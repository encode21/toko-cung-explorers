import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.QA_OUTPUT || root + "/docs/qa/motorcycles";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/motorcycles",
  publicDir: root + "/public",
  cacheDir: "/tmp/tokocung-motorcycles-vite-cache",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  resolve: {
    alias: [
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/hud/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 0, hmr: false, watch: null, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [],
  images = [];
const thumbnails = root + "/public/assets/vehicles/dealer";
await mkdir(thumbnails, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.motorsQA?.model);
  const catalog = await page.evaluate(() => window.motorsQA.catalog);
  for (const [model, motor] of Object.entries(catalog)) {
    await page.evaluate((model) => {
      window.motorsQA.model(model);
      window.motorsQA.view(false);
    }, model);
    await page.waitForFunction(
      (model) => window.motorsQA.current === model && window.motorsQA.ready(),
      model,
    );
    await page.waitForTimeout(300);
    const buffer = await page.screenshot({ path: `${thumbnails}/${motor.id}.png` });
    images.push({ ...motor, data: buffer.toString("base64") });
    await page.evaluate(() => window.motorsQA.view(true));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${output}/${motor.id}-rear.png` });
  }
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 1440, height: 540 });
  await page.setContent(`<html lang="id"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:28px;background:#132831;color:#f4f1e8;font:16px Arial}h1{margin:0 0 20px;font-size:28px}.grid{display:flex;gap:20px}article{flex:1;background:#e8edf0;border-radius:16px;overflow:hidden;color:#213b43}img{width:100%;display:block}h2{margin:0;padding:10px 20px 18px;font-size:22px}p{margin:18px 0 0;color:#abc5cb}</style>
    <h1>Skupi · PCX · Sport</h1><div class="grid">${images.map((v) => `<article><img src="data:image/png;base64,${v.data}"><h2>${v.name}</h2></article>`).join("")}</div><p>Thumbnail dealer dirender dari model yang sama dengan kendaraan di game.</p></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  await page.screenshot({ path: output + "/preview.png", fullPage: true });
  await writeFile(
    output + "/render.json",
    JSON.stringify({ models: Object.keys(catalog), errors }, null, 2),
  );
  console.log("PASS: three production motorcycle models rendered as dealer thumbnails");
} finally {
  await browser.close();
  await server.close();
}
