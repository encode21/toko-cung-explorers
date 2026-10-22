// Isolated real HUD components, mocked transport; no live account required.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/hud";
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-daily-qa/screenshots";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [
    {
      name: "daily-transport",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "./api.functions" && importer?.endsWith("/services/world/client.ts"))
          return root + "/tests/fixtures/missions/api.ts";
      },
    },
    react(),
    tailwind(),
  ],
  resolve: {
    alias: [
      { find: "@/services/aiApi/npc.functions", replacement: qa + "/npc-api.ts" },
      { find: "@tanstack/react-start", replacement: qa + "/server-fn.ts" },
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: qa + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4237, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
try {
  const world = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  world.on("pageerror", (e) => errors.push(e.message));
  await world.goto("http://127.0.0.1:4237/?guidance&store");
  await world.waitForFunction(() => window.storeRay && window.guidanceScene);
  await world.evaluate(async () => {
    const fixture = window.createDailyFixture();
    fixture.quests[0].status = "ACTIVE";
    fixture.quests[0].definition.objectives[0] = {
      type: "TALK",
      label: "Sapa Staff Gudang",
      required: 1,
      targetId: "daily-store-target",
      position: [3, 0, -7],
      radius: 2,
    };
    window.dailyFixture = fixture;
    await window.dailyCommand("read");
    window.daily.setState({ tracked: fixture.quests[0].id });
    window.game.setState({ waypoint: null, playerPos: [0, 0.83, 0] });
  });
  await world.waitForFunction(() => window.guidanceScene.getObjectByName("DailyQuestPulse"));
  const probe = await world.evaluate(() => ({
    overhead: window.storeRay({ x: 0, y: 2, z: -5 }, { x: 0, y: 1, z: 0 }),
    aisle: window.storeRay({ x: 0, y: 1, z: 2 }, { x: 0, y: 0, z: -1 }),
    pulse: window.guidanceScene.getObjectByName("DailyQuestPulse").position.toArray(),
  }));
  assert(probe.overhead >= 3.19, "upper-floor collider must leave at least 5.2m of headroom");
  assert(probe.aisle >= 14, "central aisle must stay clear all the way to the back wall");
  assert.deepEqual(probe.pulse, [3, 0, -7], "pulse is placed at the tracked target");
  const scale = await world.evaluate(
    () => window.guidanceScene.getObjectByName("DailyQuestPulse").children[0].scale.x,
  );
  await world.waitForFunction(
    (before) =>
      Math.abs(
        window.guidanceScene.getObjectByName("DailyQuestPulse").children[0].scale.x - before,
      ) > 0.05,
    scale,
  );
  await world.screenshot({ path: `${output}/store-interior-pulse.png` });
  await world.emulateMedia({ reducedMotion: "reduce" });
  await world.waitForFunction(
    () => window.guidanceScene.getObjectByName("DailyQuestPulse").children[0].scale.x === 1.1625,
  );
  await world.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS daily 3D guidance: 5.2m headroom, clear aisle, target pulse and reduced motion; interaction/rewards covered by check-mission-hud-browser.mjs",
  );
} finally {
  await browser.close();
  await server.close();
}
