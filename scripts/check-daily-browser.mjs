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
  plugins: [react(), tailwind()],
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
  for (const [width, height] of [
    [667, 375],
    [844, 390],
    [932, 430],
    [1280, 720],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4237");
    await page.waitForFunction(() => window.daily && window.profile?.getState().profile);
    await page.evaluate(async () => {
      window.game.setState({
        overlay: "none",
        playerPos: [2.8, 0.83, 5.5],
        nearby: { id: "npc_daily_cung", kind: "npc", label: "Koko Cung" },
      });
      const npc = {
        id: "npc_daily_cung",
        name: "Koko Cung",
        type: "NPC",
        archetype: "QUEST_GIVER",
        questPoolId: "daily_toko_cung",
        active: true,
        position: { x: 2.8, y: 0, z: 5.5 },
        radius: 3,
        dialogue: "Hari ini toko lagi ramai nih. Mau bantuin?",
      };
      window.editor.setState({ saved: JSON.stringify([npc]), targets: [npc] });
      window.dailyFixture = {
        enabled: true,
        dateKey: "2026-10-14",
        serverTime: "2026-10-14T12:00:00+07:00",
        nextReset: "2026-10-15T00:00:00+07:00",
        setId: "daily-test",
        revision: 0,
        introduced: false,
        streak: 3,
        completedCount: 0,
        claimedCount: 0,
        profile: {
          xp: 100,
          level: 1,
          title: "Pendatang",
          missions_completed: 0,
          lifetime_points_earned: 0,
        },
        wallet: {
          current_balance: 0,
          earned_today: 0,
          lifetime_earned: 0,
          day: "2026-10-14",
          last_updated: "",
        },
        quests: Array.from({ length: 5 }, (_, i) => ({
          id: "daily-" + i,
          questId: "template-" + i,
          status: "AVAILABLE",
          progress: [0],
          receipt: null,
          definition: {
            id: "template-" + i,
            title: [
              "Kenalan Sama Warga",
              "Cek Gudang",
              "Keliling Toko",
              "Paket Datang",
              "Cari Petunjuk",
            ][i],
            description: "Bantu Koko Cung hari ini",
            category: "WORLD",
            minLevel: 1,
            weight: 1,
            reward: { cungPoint: 20, xp: 50 },
            objectives: [
              {
                type: "VISIT",
                label: "Kunjungi Gudang",
                required: 1,
                targetId: "warehouse",
                target: "warehouse",
                position: [6.2, 0, -15],
                radius: 2.2,
              },
            ],
          },
        })),
      };
      await window.dailyCommand("read");
      window.game.getState().interact();
    });
    const talk = page.locator("[data-quest-giver-dialogue]");
    await talk.waitFor();
    await page.getByRole("button", { name: "Terima misi" }).click();
    await page.waitForFunction(() =>
      window.daily.getState().data.quests.every((q) => q.status === "ACTIVE"),
    );
    await page.getByRole("button", { name: "Lihat misi" }).click();
    const panel = page.locator("[data-daily-panel]");
    await panel.waitFor();
    assert.equal(
      await page.evaluate(() => window.daily.getState().tracked),
      "daily-0",
      "accept automatically tracks the first mission",
    );
    // Re-select explicitly after a stale exploration waypoint.
    await page.evaluate(() => {
      window.daily.setState({ tracked: null });
      window.game.setState({ waypoint: "venue-beach", guidanceMuted: true });
    });
    await panel.getByRole("button", { name: "Track", exact: true }).first().click();
    assert.equal(await page.evaluate(() => window.game.getState().waypoint), null);
    assert.equal(await page.evaluate(() => window.game.getState().guidanceMuted), false);
    assert.equal(await page.evaluate(() => window.daily.getState().tracked), "daily-0");
    const bounds = await page.locator("[data-game-panel]").last().boundingBox();
    assert(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= width + 1 &&
        bounds.y + bounds.height <= height + 1,
      "panel must fit landscape",
    );
    assert(bounds.width < width * 0.95, "gameplay background stays visible");
    const smallButtons = await panel
      .locator("button")
      .evaluateAll(
        (buttons) => buttons.filter((b) => b.getBoundingClientRect().height < 43).length,
      );
    assert.equal(smallButtons, 0, "touch targets must be at least 44px");
    await page.screenshot({ path: `${output}/daily-${width}.png` });
    // A TALK step with registry/entity aliases must work directly from the HUD.
    await page.evaluate(async () => {
      const s = window.dailyFixture;
      s.quests[0].definition.objectives[0] = {
        type: "TALK",
        label: "Bicara dengan warga",
        required: 1,
        targetId: "registry-resident",
        position: [-10, 0, 8],
        radius: 2,
      };
      const targets = JSON.parse(window.editor.getState().saved);
      targets.push({
        ...targets[0],
        id: "registry-resident",
        archetype: "RESIDENT",
        entityId: "npc-resident",
        name: "Warga Cung",
        position: { x: -10, y: 0, z: 8 },
      });
      window.editor.setState({ saved: JSON.stringify(targets), targets });
      await window.dailyCommand("read");
      window.game.setState({ playerPos: [-10, 0.83, 8] });
    });
    await page.locator("[data-game-close]").last().click();
    const tracker = page.locator("[data-daily-tracker]");
    await tracker.getByRole("button", { name: "Bicara", exact: true }).click();
    await page.waitForFunction(() => window.daily.getState().data.quests[0].status === "CLAIMABLE");
    assert.equal(
      await page.locator("[data-daily-panel]").count(),
      0,
      "HUD action does not open the mission sheet",
    );
    await page.evaluate(() => window.game.setState({ playerPos: [2.8, 0.83, 5.5] }));
    await tracker.getByRole("button", { name: "Ambil hadiah", exact: true }).waitFor();
    await tracker.getByRole("button", { name: "Ambil hadiah", exact: true }).click();
    await page.waitForFunction(() => window.daily.getState().tracked === "daily-1");
    assert.equal(
      await page.evaluate(() => window.daily.getState().data.wallet.current_balance),
      20,
      "claim works directly from HUD and advances tracking",
    );

    await page.screenshot({ path: `${output}/daily-hud-action-${width}.png` });
    await page.locator('[data-side-action="daily-missions"]').click();
    await panel.waitFor();

    await page.evaluate(async () => {
      window.dailyFixture.claimedCount = 0;
      window.dailyFixture.wallet.current_balance = 0;
      window.dailyFixture.profile.xp = 100;
      window.dailyFixture.quests.forEach((q) => {
        q.receipt = null;
        q.status = "CLAIMABLE";
        q.progress = [1];
      });
      window.dailyFixture.completedCount = 5;
      await window.dailyCommand("read");
      window.dailyLoseResponse = true;
    });
    await panel.getByRole("button", { name: "Claim", exact: true }).first().click();
    await panel.getByRole("button", { name: "Coba lagi" }).click();
    await page.waitForFunction(() => window.daily.getState().data.claimedCount === 1);
    assert.equal(
      await page.evaluate(() => window.daily.getState().data.wallet.current_balance),
      20,
      "lost claim response must not duplicate wallet credit",
    );
    for (let i = 0; i < 4; i++) {
      await panel.getByRole("button", { name: "Claim", exact: true }).first().click();
      await page.waitForFunction(() => !window.daily.getState().busy);
    }
    assert.equal(
      await page.evaluate(() => window.daily.getState().data.wallet.current_balance),
      100,
    );
    assert.equal(await page.evaluate(() => window.daily.getState().data.profile.xp), 500);
    await page.locator("[data-game-close]").last().click();
    await page.locator('[data-side-action="daily-missions"]').click();
    await panel.waitFor();
    await page.close();
  }
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
    "PASS daily HUD and 3D store: auto tracking, direct action/claim, next mission, stale waypoint reset, 44px targets, retry-safe rewards; 5.2m headroom, clear aisle, target pulse and reduced motion",
  );
} finally {
  await browser.close();
  await server.close();
}
