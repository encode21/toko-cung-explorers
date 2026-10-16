import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/obby",
  output = "/tmp/toko-swim-qa";
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
    port: 4262,
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (error) => {
  errors.push(error.message);
  console.error(error.message);
});
try {
  await page.goto("http://127.0.0.1:4262/?world");
  await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    window.obby.getState().reset();
    window.obbyQA.place(29, 0.84, -8.5);
  });
  await page.getByRole("button", { name: "Jelajah", exact: true }).click();
  await page.getByRole("button", { name: /Pantai Cung/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: output + "/plaza-beach-direction.png" });
  const route = [
    ["a", "x", 26.2, -1],
    ["w", "z", -36.2, -1],
    ["a", "x", -34.2, -1],
    ["s", "z", -29, 1],
    ["a", "x", -38, -1],
  ];
  for (const [key, axis, value, sign] of route) {
    await page.keyboard.down(key);
    await page.waitForFunction(
      ({ axis, value, sign }) => sign * (window.obbyQA.sample[axis] - value) >= -0.02,
      { axis, value, sign },
      { timeout: 22000 },
    );
    await page.keyboard.up(key);
    await page.waitForTimeout(120);
  }
  const arrival = await page.evaluate(() => ({
    sample: window.obbyQA.sample,
    waypoint: window.game.getState().waypoint,
    drawCalls: window.three.gl.info.render.calls,
  }));
  assert(Math.hypot(arrival.sample.x + 38, arrival.sample.z + 29) < 0.4);
  assert.equal(arrival.waypoint, "venue-beach");
  assert(!arrival.sample.anim?.startsWith("Swim"));
  await page.screenshot({ path: output + "/beach-arrival.png" });
  await page.evaluate(() => (window.obbyQA.beachOverview = true));
  await page.waitForTimeout(200);
  await page.screenshot({ path: output + "/beach-overview.png" });
  assert.deepEqual(errors, []);
  await writeFile(
    output + "/world-route-report.json",
    JSON.stringify({ passed: true, route, arrival, errors }, null, 2),
  );
  console.log("PASS Plaza to beach via existing sidewalks, destination guidance and dry arrival");
} catch (error) {
  await page.screenshot({ path: output + "/route-failure.png" });
  await writeFile(
    output + "/route-failure-state.json",
    JSON.stringify(
      await page.evaluate(() => ({
        sample: window.obbyQA.sample,
        frames: window.obbyQA.samples.slice(-120),
      })),
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
