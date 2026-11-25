// Real Player, camera, city geometry and traffic height regression checks.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = process.env.HALTE_QA_OUTPUT || "/tmp/toko-halte-qa";
const port = Number(process.env.HALTE_QA_PORT || 4253);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
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
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
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
const report = [];
let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  for (const [width, height, mobile] of [
    [1280, 720, false],
    [740, 360, true],
  ]) {
    const label = mobile ? "mobile-landscape" : "desktop";
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}?world`);
    await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
    const place = async (x, y, z) => {
      const frame = await page.evaluate(
        ([x, y, z]) => {
          window.obbyQA.place(x, y, z);
          return window.obbyQA.frames;
        },
        [x, y, z],
      );
      await page.waitForFunction((frame) => window.obbyQA.frames > frame + 90, frame);
    };
    await place(2.5, 5.83, 20);
    await page.waitForFunction(() => {
      const s = window.obbyQA.sample;
      return (
        s.y > 5.6 &&
        s.y < 6 &&
        s.camera[1] < 7.31 &&
        s.camera[1] > 5.8 &&
        Math.hypot(s.camera[0] - s.x, s.camera[2] - s.z) < 5
      );
    });
    const elevated = await page.evaluate(() => ({
      sample: window.obbyQA.sample,
      clear: window.trafficClearance(),
      hit: window
        .trafficPlayer()
        .hit({ x: 2.5, z: 20, dx: 1, dz: 0, speed: 8, kind: "truck" }, performance.now() / 1000),
    }));
    assert.equal(elevated.hit, false, "road truck cannot hit player on JPO");
    assert.equal(elevated.clear, true, "player on JPO does not block traffic below");
    await page.screenshot({ path: `${output}/${label}-jpo.png` });
    await place(2.5, 0.83, 20);
    await page.waitForFunction(() => window.obbyQA.sample.y < 1.1);
    assert.equal(
      await page.evaluate(() => window.trafficClearance()),
      false,
      "same X/Z at street level blocks traffic",
    );
    await place(-4.5, 1.03, 29.7);
    await page.waitForFunction(() => {
      const s = window.obbyQA.sample;
      return (
        s.y < 1.3 &&
        s.camera[1] < 2.81 &&
        s.camera[1] > 1.3 &&
        Math.hypot(s.camera[0] - s.x, s.camera[2] - s.z) < 5
      );
    });
    await page.screenshot({ path: `${output}/${label}-halte.png` });
    const lanes = await page.evaluate(() =>
      [-4.8, -1.6, 1.6, 4.8, -7.4, 7.4].map((offset) => ({
        offset,
        blocked: window.spotBlocked(-76, 20 + offset, true, 1.15),
      })),
    );
    assert(
      lanes.every((lane) => !lane.blocked),
      `four lanes and both sidewalks clear at bridge towers: ${JSON.stringify(lanes)}`,
    );
    await page.evaluate(() => {
      window.obbyQA.bridgeOverview = { eye: [-53, 12, 37], target: [-93, 2, 20] };
    });
    await page.screenshot({ path: `${output}/${label}-bridge.png` });
    await page.evaluate(() => {
      window.obbyQA.bridgeOverview = null;
      window.obbyQA.place(40, 0.83, 20);
    });
    await page.waitForFunction(
      () => window.obbyQA.sample.x > 39 && window.obbyQA.sample.camera[1] > 3.5,
    );
    const groundHit = await page.evaluate(() =>
      window
        .trafficPlayer()
        .hit({ x: 40, z: 20, dx: 1, dz: 0, speed: 8, kind: "car" }, performance.now() / 1000),
    );
    assert.equal(groundHit, true, "road-level impacts still work");
    assert.deepEqual(errors, []);
    report.push({
      viewport: label,
      jpoCamera: elevated.sample.camera,
      lanes,
      elevatedHit: elevated.hit,
      groundHit,
    });
    await page.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    `PASS halte/JPO camera, vertical traffic separation and four-lane bridge on desktop/mobile. ${output}`,
  );
} finally {
  await browser?.close();
  await server.close();
}
