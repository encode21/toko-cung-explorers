import { checkActivities } from "./mission-activity-checks.mjs";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/hud",
  output = "/tmp/toko-mission-hud-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  cacheDir: "/tmp/toko-mission-vite-cache",
  root: qa,
  publicDir: root + "/public",
  plugins: [
    {
      name: "daily-transport",
      enforce: "pre",
      transform(code, id) {
        if (id.endsWith("/tests/fixtures/hud/entry.tsx"))
          return (
            `import { worldRequest as missionTransport } from "${root}/src/services/world/client.ts"; window.missionTransport = missionTransport;\n` +
            code
          );
      },
      resolveId(source, importer) {
        if (source === "./api.functions" && importer?.endsWith("/services/world/client.ts"))
          return root + "/tests/fixtures/missions/api.ts";
      },
    },
    react(),
    tailwind(),
  ],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
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
  server: {
    host: "127.0.0.1",
    port: 4237,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root] },
    proxy: {
      "/mission-api": {
        target: "http://127.0.0.1:4521",
        rewrite: (p) => p.replace("/mission-api", "/world"),
      },
    },
  },
});
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  report = [];
const seed = () => ({
  enabled: true,
  dateKey: "2026-10-22",
  serverTime: "2026-10-22T12:00:00+07:00",
  nextReset: "2026-10-23T00:00:00+07:00",
  setId: "daily-test",
  revision: 0,
  introduced: false,
  streak: 1,
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
    day: "2026-10-22",
    last_updated: "",
  },
  quests: [["TALK"], ["COLLECT", "DELIVER"], ["SCAN"], ["VISIT"], ["DISTANCE"]].map((types, n) => ({
    id: `daily-${n}`,
    questId: `template-${n}`,
    status: "AVAILABLE",
    progress: types.map(() => 0),
    receipt: null,
    definition: {
      id: `template-${n}`,
      title: ["Sapa Warga", "Antar Paket", "Bantu Kasir", "Kunjungi Gudang", "Jalan Santai"][n],
      description: "Bantu toko",
      ordered: true,
      category: "WORLD",
      reward: { cungPoint: 20, xp: 50 },
      objectives: types.map((type, i) => ({
        type,
        label: type,
        required: type === "DISTANCE" ? 300 : 1,
        targetId: type === "DISTANCE" ? undefined : `target-${n}-${i}`,
        target: `target-${n}-${i}`,
        position: [10 + n * 5, 0, i * 6],
        radius: 2.5,
      })),
    },
  })),
});
try {
  for (const [width, height] of [
    [667, 320],
    [740, 360],
    [932, 430],
    [1280, 720],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: width < 1000,
      isMobile: width < 1000,
    });
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    const daily = seed();
    await page.request.post("http://127.0.0.1:4521/world/qa/reset", { data: daily });
    await page.goto("http://127.0.0.1:4237/?missions");
    await page
      .waitForFunction(() => window.daily?.getState().data?.setId === "daily-test")
      .catch(async (e) => {
        console.error(
          await page.evaluate(() => ({
            daily: window.daily?.getState(),
            transport: typeof window.missionTransport,
          })),
        );
        throw e;
      });
    await page.evaluate((d) => {
      const giver = {
        id: "npc_daily_cung",
        name: "Koko Cung",
        type: "NPC",
        archetype: "QUEST_GIVER",
        questPoolId: "daily_toko_cung",
        active: true,
        position: { x: 2.8, y: 0, z: 5.5 },
        radius: 2.5,
      };
      const targets = d.quests.flatMap((q) =>
        q.definition.objectives
          .filter((o) => o.targetId)
          .map((o) => ({
            id: o.targetId,
            name: o.label,
            type: "NPC",
            active: true,
            position: { x: o.position[0], y: 0, z: o.position[2] },
            radius: 2.5,
          })),
      );
      window.editor.setState({
        saved: JSON.stringify([giver, ...targets]),
        targets: [giver, ...targets],
      });
      window.core.setState({ snapshot: { ...window.core.getState().snapshot, active: null } });
    }, daily);
    const place = async (x, z) => {
      await page.request.post("http://127.0.0.1:4521/world/qa/position", {
        data: { position: [x, 0.83, z] },
      });
      await page.evaluate(
        ([x, z]) => window.game.setState({ playerPos: [x, 0.83, z], nearby: null }),
        [x, z],
      );
    };
    await place(2.8, 5.5);
    const action = page.locator("[data-context-action] button");
    await action.getByText("Terima Daily", { exact: true }).waitFor();
    const bounds = await action.boundingBox();
    assert(
      bounds.width >= 44 &&
        bounds.height >= 44 &&
        bounds.y >= 0 &&
        bounds.y + bounds.height < height,
    );
    if (width < 1000) {
      const jump = await page.locator("[data-mobile-primary-action]").boundingBox();
      assert(bounds.x + bounds.width < jump.x, "action sits left of jump");
      await action.tap();
    } else await page.keyboard.press("f");
    await page.waitForFunction(() =>
      window.daily.getState().data.quests.every((q) => q.status === "ACTIVE"),
    );
    assert.equal(await page.locator("[data-hud-trackers]").count(), 0, "no side tracker host");
    assert.equal(await page.locator("[data-daily-mission-tip]").count(), 0);
    await place(10, 0);
    await action.getByText("Bicara", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/action-${width}.png` });
    await page.evaluate(() => {
      const s = window.core.getState().snapshot;
      window.core.setState({
        snapshot: {
          ...s,
          active: { id: "collision", quest_id: s.quests[0].id, status: "ACTIVE", progress: [0] },
          quests: [{ ...s.quests[0], objectives: [{ ...window.objective, position: [10, 0, 0] }] }],
        },
      });
    });
    assert(
      (await page.evaluate(() => window.contextAction().id)).startsWith("daily:"),
      "tracked daily wins over equally near quest",
    );
    await page.evaluate(() =>
      window.core.setState({ snapshot: { ...window.core.getState().snapshot, active: null } }),
    );
    // A held/stale UI action cannot act after the player leaves the target.
    const stale = await page.evaluate(() => window.contextAction().id);
    await place(45, 45);
    const requestsBefore = (
      await (await page.request.get("http://127.0.0.1:4521/world/qa/state")).json()
    ).requests.length;
    await page.evaluate((id) => window.performContextAction(id), stale);
    assert.equal(
      (await (await page.request.get("http://127.0.0.1:4521/world/qa/state")).json()).requests
        .length,
      requestsBefore,
    );
    await place(10, 0);
    await page.keyboard.press("f");
    await page.getByText("Halo, tetangga!", {exact: false}).waitFor();
    assert.equal(await page.evaluate(() => window.daily.getState().data.quests[0].progress[0]), 0, "opening talk does not award progress");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.daily.getState().data.quests[0].progress[0]), 0, "closing early leaves the objective active");
    await page.keyboard.press("f");
    await page.getByRole("button", {name: "Iya! Aku ingin kenalan dan dengar kabar warga di sini."}).click();
    await page.screenshot({path: `${output}/daily-dialogue-${width}.png`});
    assert.equal(await page.evaluate(() => window.daily.getState().data.quests[0].progress[0]), 0, "reply waits for conversation completion");
    await page.getByRole("button", {name: "Sampai ketemu lagi!"}).click();
    await page.waitForFunction(() => window.daily.getState().data.quests[0].status === "CLAIMED");
    assert.equal(
      await page.evaluate(() => window.core.getState().snapshot.wallet.current_balance),
      20,
    );
    await place(15, 0);
    await page.request.post("http://127.0.0.1:4521/world/qa/fail");
    await action.click();
    await page.locator('[data-context-action] [role="status"]').waitFor();
    await action.click();
    await page.waitForFunction(() => window.daily.getState().data.quests[1].progress[0] === 1);
    await place(15, 6);
    await action.click();
    await page.waitForFunction(() => window.daily.getState().data.quests[1].status === "CLAIMED");
    await place(20, 0);
    await action.click();
    await page.waitForFunction(() => window.daily.getState().data.quests[2].status === "CLAIMED");
    for (const type of ["VISIT", "DISTANCE"])
      await page.request.post("http://127.0.0.1:4521/world/qa/event", {
        data: { type, targetId: type === "VISIT" ? "target-3-0" : undefined },
      });
    await page.evaluate(() => window.dailyCommand("read"));
    assert.equal(await page.evaluate(() => window.daily.getState().data.claimedCount), 5);
    assert.equal(
      await page.evaluate(() => window.core.getState().snapshot.wallet.current_balance),
      100,
    );
    assert.equal(await page.evaluate(() => window.daily.getState().data.profile.xp), 500);
    const state = await (await page.request.get("http://127.0.0.1:4521/world/qa/state")).json();
    assert(!state.requests.some((r) => r.action === "claim"), "no manual claim API");
    const failed = state.requests.filter(
      (r) => r.action === "interact" && r.instanceId === "daily-1" && r.objective === 0,
    );
    assert.equal(failed[0].requestId, failed[1].requestId, "retry preserves idempotency");
    await page.locator('[data-side-action="daily-missions"]').click();
    await page.locator("[data-daily-panel]").waitFor();
    assert.equal(await page.getByRole("button", { name: "Claim", exact: true }).count(), 0);
    const dailySpace = await page.locator(".daily-mission-scroll").boundingBox();
    const dailyPanel = await page.locator(".game-daily-mission-sheet").boundingBox();
    assert(dailySpace.height > dailyPanel.height * .58, "daily content keeps most of the short viewport");
    await page.screenshot({path: `${output}/daily-panel-${width}.png`});
    await page.evaluate(() => window.hud.getState().setSheet(null));
    assert.equal(
      await page.locator('[data-side-action="daily-missions"] [data-notification-dot]').count(),
      0,
    );
    await page.reload();
    await page.waitForFunction(() => window.daily?.getState().data?.claimedCount === 5);
    assert.equal(
      await page.locator('[data-side-action="daily-missions"] [data-notification-dot]').count(),
      0,
      "read persists across reload",
    );
    // Active daily wins over an ordinary nearby quest; secret still opens its discovery UI.
    await page.evaluate(() => {
      const s = window.core.getState().snapshot;
      s.active = { id: "secret-run", quest_id: s.quests[0].id, status: "ACTIVE", progress: [0] };
      s.quests[0].objectives[0] = {
        ...window.objective,
        position: [0, 0, 0],
        secret: {
          archiveId: "qa-secret",
          archiveIndex: 0,
          title: "Catatan",
          interactionType: "OBSERVATION",
          question: "Lihat catatan",
          answers: ["Terbaca"],
        },
      };
      window.core.setState({ snapshot: { ...s } });
      window.game.setState({ playerPos: [0, 0.83, 0], nearby: null });
    });
    await action.getByText("Selidiki", { exact: true }).waitFor();
    const secretId = await page.evaluate(() => window.contextAction().id);
    assert(secretId.startsWith("quest:"));
    await action.click();
    await page.waitForFunction(() => window.secret.getState().open);
    assert.equal(await page.locator("[data-context-action]").count(), 0);
    await page.evaluate(() => window.secret.getState().closeDiscovery());
    // Obby is one line, and dungeon details remain reachable without the old side card.
    await page.evaluate(() => {
      window.core.setState({ snapshot: { ...window.core.getState().snapshot, active: null } });
      window.obby.setState({ status: "active", step: 3, checkpoint: 2 });
    });
    await page.locator("[data-obby-progress]").waitFor();
    assert.equal(await page.locator("[data-obby-progress].quest-tracker").count(), 0);
    await page.locator('[data-side-action="quests"]').click();
    const journal = page.locator(".game-quest-journal-sheet");
    assert.equal(await journal.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
    const questSpace = await page.locator('.activity-details > [role="tabpanel"]').boundingBox();
    assert(questSpace.height > (await journal.boundingBox()).height * .6, "journal content remains tall");
    await page.screenshot({path: `${output}/quest-panel-${width}.png`});
    await page.getByRole("tab", { name: "Obby", exact: true }).click();
    await page.getByRole("button", { name: "Petunjuk obby", exact: true }).click();
    await page.getByText("Checkpoint tersimpan.", { exact: false }).waitFor();
    await page.screenshot({ path: `${output}/journal-${width}.png` });
    await checkActivities(page, width, output);
    report.push({
      width,
      height,
      daily: "accept → interact → automatic rewards + bonus",
      retry: "same request id",
      hud: "no cards; priority collision; secret discovery; dot persistence; Obby; dungeon travel/exit; optional targets/cancel; fishing phases/settings/inventory",
    });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser.close();
  await server.close();
}
