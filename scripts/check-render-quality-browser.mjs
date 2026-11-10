// Real Canvas and AdaptiveQuality: unrelated parent renders must not resize the drawing buffer.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.RENDER_QA_PORT || 4264);
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/render-quality",
  cacheDir: "/tmp/tokocung-render-quality-vite-cache",
  plugins: [react()],
  resolve: { alias: { "@": root + "/src" }, dedupe: ["react", "react-dom", "three"] },
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
const results = [];
const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)));
      }),
  );
try {
  for (const deviceScaleFactor of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 800, height: 450 },
      deviceScaleFactor,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem(
        "toko-cung-game-settings",
        JSON.stringify({ state: { graphics: "HIGH" }, version: 1 }),
      );
    });
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForFunction(() => window.renderQualityQA?.ready);
    await page.evaluate(() => window.renderQualityQA.cameraPosition([7, 3, 8]));
    for (const [tier, cap] of [
      ["HIGH", 1.5],
      ["MEDIUM", 1.15],
      ["LOW", 0.85],
    ]) {
      await page.evaluate((value) => window.renderQualityQA.setGraphics(value), tier);
      await page.waitForFunction((value) => window.renderQualityQA.snapshot().tier === value, tier);
      await settle(page);
      const before = await page.evaluate(() => window.renderQualityQA.snapshot());
      const expected = Math.min(deviceScaleFactor, cap);
      assert.equal(before.dpr, expected, `${tier}: correct device-clamped pixel ratio`);
      assert.deepEqual(
        before.pixels,
        before.size.map((value) => Math.floor(value * expected)),
      );
      assert.equal(before.far, tier === "LOW" ? 260 : 420);
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.renderQualityQA.rerender());
        await settle(page);
      }
      const after = await page.evaluate(() => window.renderQualityQA.snapshot());
      assert.equal(
        after.resizeCalls,
        before.resizeCalls,
        `${tier}: parent renders must not clear the drawing buffer`,
      );
      assert.deepEqual(after.pixels, before.pixels, `${tier}: buffer size survives parent renders`);
      assert.equal(after.dpr, before.dpr, `${tier}: pixel ratio survives parent renders`);
      assert.equal(
        after.cameraId,
        before.cameraId,
        `${tier}: camera instance survives parent renders`,
      );
      assert.deepEqual(after.camera, [7, 3, 8], `${tier}: camera position survives parent renders`);
      results.push({
        deviceScaleFactor,
        tier,
        dpr: after.dpr,
        pixels: after.pixels,
        extraResizes: after.resizeCalls - before.resizeCalls,
      });
    }
    await page.evaluate(() => window.renderQualityQA.setEditor(true));
    await settle(page);
    const editor = await page.evaluate(() => window.renderQualityQA.snapshot());
    assert.equal(
      editor.dpr,
      editor.lowDevice ? 1 : Math.min(deviceScaleFactor, 1.5),
      "editor preserves its existing pixel ratio policy",
    );
    await page.evaluate(() => window.renderQualityQA.setEditor(false));
    await settle(page);
    assert.equal(
      (await page.evaluate(() => window.renderQualityQA.snapshot())).dpr,
      0.85,
      "returning to play restores LOW pixel ratio",
    );
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: adaptive resolution survives 48 parent renders, preserves camera pose and editor behavior.",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await server.close();
}
