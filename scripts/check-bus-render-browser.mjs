// Real BusRide + R3F renderer, no accounts or API calls.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/bus-render",
  cacheDir: "/tmp/tokocung-bus-render-vite-cache",
  plugins: [react()],
  resolve: { alias: { "@": root + "/src" }, dedupe: ["react", "react-dom", "three"] },
  server: { host: "127.0.0.1", port: 0, hmr: false, watch: null, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)));
      }),
  );
const checkRendering = async (page, phase) => {
  const before = await page.evaluate(() => window.busRenderQA.snapshot().frames);
  await settle(page);
  const after = await page.evaluate(() => window.busRenderQA.snapshot().frames);
  assert.ok(after > before, `${phase}: world must keep rendering with BusRide mounted`);
};
try {
  for (const deviceScaleFactor of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 932, height: 600 },
      deviceScaleFactor,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.busRenderQA?.snapshot);
    await checkRendering(page, "idle / spawn");
    await page.evaluate(() => window.busRenderQA.start());
    await page.waitForFunction(() => window.busRenderQA.snapshot().riding);
    await checkRendering(page, "bus ride");
    const cameraBefore = await page.evaluate(() => window.busRenderQA.snapshot().camera);
    await settle(page);
    const cameraAfter = await page.evaluate(() => window.busRenderQA.snapshot().camera);
    assert.notDeepEqual(cameraAfter, cameraBefore, "camera follows the moving bus");
    await page.waitForFunction(() => {
      const s = window.busRenderQA.snapshot();
      return s.arrived && !s.riding;
    });
    await checkRendering(page, "after drop-off");
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: world renders at spawn, during bus travel and after drop-off; camera follows the bus (DPR 1 and 2).",
  );
} finally {
  await browser.close();
  await server.close();
}
