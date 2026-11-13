// Actual city geometry/materials/physics in a transport-only fixture. No production account calls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.QA_OUTPUT || "/tmp/tokocung-city-refresh-qa";
const port = Number(process.env.QA_PORT || 4273);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/city-refresh",
  publicDir: root + "/public",
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
      {
        find: "@/game/world/city-banner.functions",
        replacement: root + "/tests/fixtures/city-refresh/banner-functions.ts",
      },
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
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const [device, width, height] of [
    ["desktop", 1280, 720],
    ["mobile", 844, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: device === "mobile",
      isMobile: device === "mobile",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (/Shader Error|VALIDATE_STATUS|program not valid/.test(m.text())) errors.push(m.text());
    });
    await page.goto(`http://127.0.0.1:${port}/?worldTime=14:30`);
    await page.waitForFunction(() => window.cityQA?.frames > 15, null, { timeout: 90000 });
    await page.waitForTimeout(1800);
    assert.equal(
      await page.evaluate(() => !!window.cityQA.scene.getObjectByName("CityAdvertising")),
      true,
    );
    assert.equal(
      await page.evaluate(() => !!window.cityQA.scene.getObjectByName("NaturalCityTrees")),
      true,
    );
    await page.waitForFunction(() =>
      ["pusat-01", "pusat-02", "kampung-01", "pasar-01"].every(
        (id) => window.cityQA.scene.getObjectByName(`city-ad-${id}`)?.userData.campaignId === 701,
      ),
    );
    const shots = [
      ["overview", "city", [-58, 38, 56], [-3, 2, -3]],
      ["street", "city", [-46, 3.2, 18.3], [27, 3.2, 21]],
      ["ruko", "city", [-6, 4.1, 18], [-11, 3.5, 35]],
      ["houses", "city", [-31, 3.2, -8], [-44, 2.3, -7]],
      ["advertising", "city", [12.5, 2.7, 22.8], [3.5, 3.35, 24.15]],
      ["advertising-reverse", "city", [-5.5, 2.7, 22.8], [3.5, 3.35, 24.15]],
      ["advertising-west", "city", [-39, 2.7, 22.8], [-48, 3.35, 24.15]],
      ["advertising-kampung", "city", [-32.7, 2.7, -4], [-34.15, 3.35, -13]],
      ["advertising-pasar", "city", [105, 2.7, 22.8], [96, 3.35, 24.15]],
      ["cleared-signs", "city", [20, 3.3, 3], [27.5, 1.8, -8.5]],
      ["truck", "truck", [7, 3.5, 8], [0, 1.25, 0]],
      ["truck-side", "truck", [10, 2.5, 0], [0, 1.3, 0]],
      ["mpv", "mpv", [5.7, 3.3, 7], [0, 1, 0]],
      ["mpv-rear", "mpv", [-5.5, 2.9, -7], [0, 1, 0]],
    ];
    for (const [name, mode, position, target] of shots.filter(
      ([name]) => !process.env.QA_SHOTS || process.env.QA_SHOTS.split(",").includes(name),
    )) {
      await page.evaluate(
        ([mode, position, target]) => {
          window.cityQA.mode(mode);
          window.cityQA.view(position, target);
        },
        [mode, position, target],
      );
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `${output}/${device}-${name}.png` });
      results.push({
        device,
        name,
        ...(await page.evaluate(() => ({
          calls: window.cityQA.calls,
          triangles: window.cityQA.triangles,
        }))),
      });
    }
    // A replacement image loads, and missing/invalid replacements fall back without losing the city.
    await page.evaluate(() => {
      window.cityQA.mode("ad");
      window.cityQA.view([0, 4.4, 8], [0, 4.4, 0]);
      window.cityQA.ad("/assets/mountain/forest-ground.webp");
    });
    await page.waitForFunction(
      () => window.cityQA.scene.getObjectByName("city-ad-qa")?.userData.imageLoaded === true,
    );
    await page.route("**/missing-campaign.webp", (route) =>
      route.fulfill({ status: 404, body: "Missing campaign" }),
    );
    await page.evaluate(() => window.cityQA.ad("/missing-campaign.webp"));
    await page.waitForTimeout(400);
    assert.equal(
      await page.evaluate(
        () => window.cityQA.scene.getObjectByName("city-ad-qa").userData.imageLoaded,
      ),
      false,
    );
    await page.evaluate(() => window.cityQA.ad("javascript:alert(1)"));
    assert.equal(
      await page.evaluate(
        () => window.cityQA.scene.getObjectByName("city-ad-qa").userData.imageLoaded,
      ),
      false,
    );
    // Road and crossing surfaces retain their shared metre-based physics.
    await page.evaluate(() => {
      window.cityQA.mode("city");
      window.cityQA.view([0, 5, 25], [0, 1, 20]);
    });
    await page.waitForTimeout(1300);
    const ground = await page.evaluate(() =>
      [-40, -15, 0, 10, 40].map((x) => window.cityQA.ground(x, 20)),
    );
    assert(
      ground.every((y) => y !== null && Math.abs(y - 0.042) < 0.05),
      "continuous asphalt collision",
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${device}: city, portraits, ads replacement/fallback, natural trees, road collision; no shader errors`,
    );
    await page.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { environment: "Chrome headless SwiftShader; not a physical phone FPS benchmark", results },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
