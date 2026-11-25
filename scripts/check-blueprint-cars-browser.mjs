import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.QA_OUTPUT || root + "/docs/qa/blueprint-vehicles";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/blueprint-cars",
  publicDir: root + "/public",
  cacheDir: "/tmp/tokocung-blueprint-vite-cache",
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
  images = [],
  doors = [];
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 520 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.carsQA?.model);
  const names = await page.evaluate(() => window.carsQA.names);
  for (const [model, name] of Object.entries(names)) {
    await page.evaluate((model) => {
      window.carsQA.model(model);
      window.carsQA.view(false);
    }, model);
    await page.waitForFunction(
      (model) => window.carsQA.current === model && window.carsQA.ready(),
      model,
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const buffer = await page.screenshot({ path: `${output}/${model}.png` });
    images.push({ model, name, data: buffer.toString("base64") });
    await page.evaluate(() => window.carsQA.view(true));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${output}/${model}-rear.png` });
    await page.evaluate((model) => {
      window.carsQA.view(false);
      window.carsQA.door(["city-car", "sedan"].includes(model) ? 2 : 0);
    }, model);
    await page.waitForTimeout(200);
    const angle = await page.evaluate(() => window.carsQA.doorAngle());
    assert(
      angle > 1 && angle < 1.1,
      `${model}: boarding opens the physical door, including a rear passenger's shared front door`,
    );
    doors.push({ model, angle });
  }
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 1600, height: 970 });
  await page.setContent(`<html lang="id"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#101d29;color:#eef4f7;font-family:Arial,sans-serif;padding:42px 48px}
    .tag{font-size:12px;letter-spacing:3px;color:#77c9e2;margin:0 0 12px}h1{font-size:38px;font-weight:600;margin:0 0 10px}
    .intro{font-size:17px;color:#b5c6d2;margin:0 0 30px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
    article{border:1px solid #354756;border-radius:16px;overflow:hidden;background:#1c2c39}img{display:block;width:100%;aspect-ratio:800/520}
    .label{padding:18px 20px 21px}.num{font-size:11px;color:#77c9e2;margin-bottom:8px;letter-spacing:2px}h2{font-size:19px;margin:0;font-weight:500}
    footer{margin-top:27px;display:flex;justify-content:space-between;color:#91a8b9;font-size:13px}
  </style><p class="tag">TOKO CUNG WORLD · VEHICLE DESIGN</p><h1>Delapan karakter. Satu keluarga desain.</h1>
  <p class="intro">Proporsi mengikuti referensi • Panel membulat • Kaca gelap • Detail lampu dan pelek</p><div class="grid">${images.map((v, i) => `<article><img src="data:image/png;base64,${v.data}"><div class="label"><div class="num">${String(i + 1).padStart(2, "0")} / 08</div><h2>${v.name}</h2></div></article>`).join("")}</div><footer><span>Render model 3D yang dipakai di dalam game</span><span>25 November 2026</span></footer></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  await page.screenshot({ path: output + "/preview.png", fullPage: true });
  await writeFile(
    output + "/render.json",
    JSON.stringify({ errors, models: images.map((v) => v.model), doors }, null, 2),
  );
  console.log("PASS: eight actual vehicle renders and door animations; preview saved to " + output);
} finally {
  await browser.close();
  await server.close();
}
