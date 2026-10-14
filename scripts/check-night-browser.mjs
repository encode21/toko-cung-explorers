// Optional browser harness: install Playwright separately or set PLAYWRIGHT_MODULE.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/club";
const output = "/tmp/toko-venue-qa";
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
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4219, strictPort: true, fs: { allow: [root] } },
  optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-runtime"] },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});

const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 740, height: 360 }, hasTouch: true });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4219/?night&worldTime=23:00");
  await page.waitForFunction(() => window.game?.getState().playerPos[0] > 40);
  await page.waitForTimeout(1800);
  const inspect = () => {
    const scene = window.three.scene;
    const road = [];
    const lenses = [];
    scene.traverse((o) => {
      if (o.name === "VehicleRoadLight")
        road.push({
          intensity: o.intensity,
          shadows: o.castShadow,
          x: o.position.x,
          z: o.position.z,
          target: o.target.position.toArray(),
        });
      if (o.name === "VehicleHeadlights")
        o.traverse((m) => {
          if (m.material?.emissiveIntensity) lenses.push(m.material.emissiveIntensity);
        });
    });
    return { fill: scene.getObjectByName("NightVisibilityFill").intensity, road, lenses };
  };
  const night = await page.evaluate(inspect);
  assert(night.fill > 0.7);
  assert(night.lenses.length >= 3);
  assert(night.road.length <= 2 && night.road.some((l) => l.intensity > 0));
  assert(night.road.every((l) => !l.shadows));
  await page.screenshot({ path: output + "/night-visibility.png" });
  await page.evaluate(() => window.sceneTime.setWorldTime("12:00"));
  await page.waitForTimeout(400);
  const day = await page.evaluate(inspect);
  assert.equal(day.fill, 0);
  assert(day.road.every((l) => l.intensity === 0));
  assert.equal(day.lenses.length, 0);
  await page.screenshot({ path: output + "/day-visibility.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: night venue lighting, bounded headlights, daytime lights off, mobile render",
    JSON.stringify(night),
  );
} finally {
  await browser.close();
  await server.close();
}
