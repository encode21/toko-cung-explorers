// Real physics, Player, mountain scenery and HUD; only backend transport is substituted.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = root + "/tests/fixtures/mountain";
const output = process.env.MOUNTAIN_QA_OUTPUT || "/tmp/tokocung-weather-qa";
const port = Number(process.env.MOUNTAIN_QA_PORT || 4261);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: fixture,
  cacheDir: "/tmp/tokocung-mountain-vite-cache",
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
      { find: "@/services/world/client", replacement: fixture + "/client.ts" },
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
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  for (const [width, height] of [
    [1280, 720],
    [740, 360],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
    page.on("pageerror", (e) => errors.push(e.message));
    const samples = [];
    for (const phase of ["drizzle", "rain", "storm", "clearing", "rainbow"]) {
      await page.goto(`http://127.0.0.1:${port}/?lighting&weather=${phase}`);
      await page.waitForFunction(() => window.mountainQA?.ready, null, { timeout: 60000 });
      await page.evaluate(() => {
        const p = window.plan.summit.position;
        window.game.getState().requestTeleport([p[0], p[1] + 0.83, p[2]]);
        const yaw = Math.atan2(window.lighting.direction.x, window.lighting.direction.z);
        const position = [p[0], p[1] + 5, p[2]];
        window.cameraView = {
          position,
          target: [p[0] - Math.sin(yaw) * 105, p[1] + 21, p[2] - Math.cos(yaw) * 105],
        };
      });
      await page.waitForFunction(() => window.game.getState().playerPos[1] > 50);
      await page.waitForTimeout(800);
      const sample = await page.evaluate(() => {
        const rain = window.three.scene.getObjectByName("WeatherRain");
        const rainbow = window.three.scene.getObjectByName("WeatherRainbow");
        return {
          weather: window.weather(),
          count: rain.count,
          visible: rain.visible,
          opacity: rain.material.opacity,
          rainbow: rainbow.visible,
        };
      });
      if (phase === "rainbow") {
        assert.equal(sample.rainbow, true);
        assert.equal(sample.visible, false);
      } else {
        assert(sample.visible && sample.count > 0);
        assert.equal(sample.rainbow, false);
      }
      samples.push(sample);
      await page.screenshot({ path: `${output}/${phase}-${width}.png` });
      await page.evaluate(() => window.warung.setState({ inside: { own: true } }));
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(
          () =>
            window.three.scene.getObjectByName("WeatherRain").visible ||
            window.three.scene.getObjectByName("WeatherRainbow").visible,
        ),
        false,
      );
    }
    assert(
      samples[0].count < samples[1].count &&
        samples[1].count < samples[2].count &&
        samples[3].count < samples[2].count,
    );
    console.log(
      "PASS mountain rain phases, rainbow, indoor shelter",
      width,
      JSON.stringify(samples),
    );
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
