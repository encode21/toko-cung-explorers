import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.QA_OUTPUT || root + "/docs/qa/map-expansion";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/map-expansion",
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
  server: { hmr: false, watch: null, host: "127.0.0.1", port: 4245, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4245/");
  await page.waitForFunction(() => window.qa?.colliders?.() > 20, null, { timeout: 90000 });
  for (const [name, x, z] of [
    ["store", 0, 12],
    ["market", 104, 36],
    ["park", 106, 92],
    ["return", 0, 12],
  ]) {
    await page.evaluate(([x, z]) => window.qa.view(x, z), [x, z]);
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      window.qa.frames = [];
      window.qa.calls = [];
      window.qa.triangles = [];
    });
    await page.waitForTimeout(4000);
    const result = await page.evaluate(() => {
      const q = window.qa,
        f = [...q.frames].sort((a, b) => a - b);
      return {
        fps: +(1000 / (f.reduce((a, b) => a + b, 0) / f.length)).toFixed(1),
        p95ms: +f[Math.floor(f.length * 0.95)].toFixed(1),
        drawCalls: Math.max(...q.calls),
        triangles: Math.max(...q.triangles),
        colliders: q.colliders(),
        marketGround: q.groundAt(104, 36),
        parkRoad: q.groundAt(136, 100),
        districts: ["market", "park"].filter((id) => q.scene.getObjectByName("district-" + id)),
      };
    });
    results.push({ name, ...result });
    await page.screenshot({
      path: output + "/" + (process.env.QA_PHASE || "after") + "-" + name + ".png",
    });
  }
  assert.deepEqual(errors, []);
  if (process.env.QA_PHASE !== "before") {
    assert.deepEqual(results[0].districts, []);
    assert(results[1].districts.includes("market"));
    assert(Math.abs(results[1].marketGround + 0.04) < 0.01);
    assert(Math.abs(results[2].parkRoad - 0.042) < 0.01);
    assert(results[0].parkRoad < -3);
    assert(results[2].districts.includes("park"));
    assert.deepEqual(results[3].districts, []);
    assert.equal(results[0].colliders, results[3].colliders);
  }
  await writeFile(
    output + "/" + (process.env.QA_PHASE || "after") + ".json",
    JSON.stringify(
      {
        environment: "Chrome headless SwiftShader, 844x390 touch, DPR 1; not a physical phone",
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await server.close();
}
