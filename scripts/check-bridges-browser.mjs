// Real Player + Rapier + production HUD. Only backend transport is a fixture.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { CITY_BRIDGES } from "../src/game/world/bridges.ts";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = process.env.BRIDGE_QA_OUTPUT || "/tmp/toko-bridge-qa";
const port = Number(process.env.BRIDGE_QA_PORT || 4262);
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
  for (const mobile of [false, true]) {
    const label = mobile ? "mobile" : "desktop";
    const page = await browser.newPage({
      viewport: mobile ? { width: 740, height: 360 } : { width: 1280, height: 720 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/?world`);
    await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
    for (const bridge of CITY_BRIDGES) {
      const result = await page.evaluate(({ position, yaw }) => {
        const [ox, , oz] = position;
        const point = (x, z) => [
          ox + Math.cos(yaw) * x + Math.sin(yaw) * z,
          oz - Math.sin(yaw) * x + Math.cos(yaw) * z,
        ];
        const player = point(0, 8);
        window.obbyQA.place(player[0], 1, player[1]);
        const eye = point(25, -15),
          target = point(0, 28);
        window.obbyQA.bridgeOverview = {
          eye: [eye[0], 15, eye[1]],
          target: [target[0], 3, target[1]],
        };
        const blocked = [];
        // Test real Rapier collision clearance for a truck and both pavements.
        for (const z of [4, 12, 32, 52, 60]) {
          for (const x of [-1.6, 1.6]) {
            const p = point(x, z);
            const hit = window.rapierWorld.intersectionWithShape(
              { x: p[0], y: 1.6, z: p[1] },
              { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
              new window.rapier.Cuboid(1.2, 1.4, 3),
              window.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC |
                window.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC |
                window.rapier.QueryFilterFlags.EXCLUDE_SENSORS,
            );
            if (hit) blocked.push({ x, z, kind: "truck" });
          }
          for (const x of [-4.2, 4.2]) {
            const p = point(x, z);
            const hit = window.rapierWorld.intersectionWithShape(
              { x: p[0], y: 1, z: p[1] },
              { x: 0, y: 0, z: 0, w: 1 },
              new window.rapier.Capsule(0.42, 0.38),
              window.rapier.QueryFilterFlags.EXCLUDE_DYNAMIC |
                window.rapier.QueryFilterFlags.EXCLUDE_KINEMATIC |
                window.rapier.QueryFilterFlags.EXCLUDE_SENSORS,
            );
            if (hit) blocked.push({ x, z, kind: "foot" });
          }
        }
        return { blocked };
      }, bridge);
      await page.waitForTimeout(900);
      const pose = await page.evaluate(() => window.obbyQA.sample);
      assert.deepEqual(result.blocked, [], `${label} ${bridge.id} clearance`);
      assert(
        pose.y > 0.7 && !pose.anim?.startsWith("Swim"),
        "bridge approach stays dry and supported",
      );
      await page.screenshot({ path: `${output}/${label}-${bridge.id}.png` });
      report.push({ label, bridge: bridge.id, pose, ...result });
    }
    await page.goto(`http://127.0.0.1:${port}/?gang`);
    await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
    await page.evaluate(() => window.startGangFixture());
    await page.waitForFunction(() => window.three.scene.getObjectByName("Bridge-to-next-gang"));
    for (const [id, shore, direction] of [
      ["city", 2985, -1],
      ["next-gang", 3130, 1],
    ]) {
      await page.evaluate(
        ({ shore, direction }) => {
          window.obbyQA.place(6000, 1, shore + direction * 5);
          window.obbyQA.bridgeOverview = {
            eye: [6020, 12, shore - direction * 16],
            target: [6000, 3, shore + direction * 26],
          };
        },
        { shore, direction },
      );
      await page.waitForTimeout(1000);
      const pose = await page.evaluate(() => window.obbyQA.sample);
      assert(
        pose.y > 0.7 && !pose.anim?.startsWith("Swim"),
        "Gang road continues beyond gate with solid deck",
      );
      await page.screenshot({ path: `${output}/${label}-gang-${id}.png` });
      report.push({ label, bridge: `gang-${id}`, pose });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(`PASS: four city bridges and both Gang connections, desktop/mobile. ${output}`);
