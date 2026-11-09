// Real Player + Rapier + production HUD. Only backend transport is a fixture.
import { spawn } from "node:child_process";
import { mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = root + "/docs/qa/minigames";
const backend = process.env.WORLD_QA_BACKEND;
if (!backend) throw new Error("Set WORLD_QA_BACKEND to the local backend checkout");
const database = (await mkdtemp(tmpdir() + "/tokocung-world-qa-")) + "/test.sqlite";
await writeFile(database, "");
const php = spawn(
  "php",
  [
    "-d",
    "error_reporting=22527",
    "-S",
    "127.0.0.1:4519",
    backend + "/tests/Fixtures/world-social-router.php",
  ],
  {
    cwd: backend,
    env: {
      ...process.env,
      APP_ENV: "testing",
      APP_KEY: "01234567890123456789012345678901",
      WORLD_QA_DB: database,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let phpLog = "";
php.stdout.on("data", (c) => (phpLog += c));
php.stderr.on("data", (c) => (phpLog += c));
const port = 4265;
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  plugins: [
    {
      name: "mobility-api-boundary",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "./api.functions" && importer?.endsWith("/services/world/client.ts"))
          return root + "/tests/fixtures/mobility/api.ts";
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
      { find: "../mobility/runtime", replacement: root + "/tests/fixtures/vehicles/runtime.ts" },
      { find: "@/net/useWorldChannel", replacement: root + "/tests/fixtures/vehicles/channel.ts" },
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    proxy: {
      "/mobility-api": {
        target: "http://127.0.0.1:4519",
        rewrite: (p) => p.replace("/mobility-api", "/world"),
      },
    },
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();
let browser;
const errors = [],
  report = {};
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--enable-unsafe-swiftshader",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  const driver = await context.newPage(),
    rider = await context.newPage();
  for (const [page, name] of [
    [driver, "Warga Satu"],
    [rider, "Warga Dua"],
  ]) {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", async (r) => {
      if (r.url().includes("mobility-api") && r.status() >= 400)
        console.log("HTTP", r.status(), await r.text());
    });
    await page.goto(`http://127.0.0.1:${port}/?world&vehicles&mobility&minigames&name=${name}`);
    await page.waitForFunction(
      () => window.obbyQA?.ready && window.minigames?.getState().receivedAt > 0,
      null,
      { timeout: 30000 },
    );
  }
  const pages = [driver, rider];
  const fixture = async (path, data = {}) =>
    (
      await context.request.post(`http://127.0.0.1:${port}/mobility-api/qa/${path}`, { data })
    ).json();
  const poll = async () => {
    for (const p of pages) await p.evaluate(() => window.miniCommand("read"));
  };
  const advance = async (seconds) => {
    await fixture("advance", { seconds });
    await poll();
  };
  const place = async (p, x, z) => {
    await p.evaluate(({ x, z }) => window.obbyQA.place(x, 0.93, z), { x, z });
    await p.waitForTimeout(120);
  };
  const begin = async (game) => {
    await fixture("schedule", { game });
    for (const [i, p] of pages.entries()) await place(p, 100 + i * 2, 35);
    await poll();
    if (game === "SACK") {
      await driver.getByRole("button", { name: "Tutup info alun-alun", exact: true }).click();
      await driver.keyboard.press("KeyF");
    } else await driver.getByRole("button", { name: "Gabung ronde", exact: true }).click();
    await driver.waitForFunction(() => window.minigames.getState().round.players.length === 1);
    assert.equal(await driver.evaluate(() => window.minigames.getState().round.phase), "lobby");
    await rider.getByRole("button", { name: "Gabung ronde", exact: true }).click();
    await rider.waitForFunction(() => window.minigames.getState().round.phase === "countdown");
    await poll();
    await driver.screenshot({ path: output + `/${game.toLowerCase()}-lobby.png` });
    await advance(8);
    await driver.waitForFunction(() => window.minigames.getState().round.phase === "running");
  };
  await begin("QUIZ");
  const { correct } = await fixture("question");
  await place(driver, correct ? 94 : 114, 35);
  await place(rider, correct ? 114 : 94, 35);
  // Real walking remains enabled in the quiz; final answer is the last reported physical zone.
  const before = await driver.evaluate(() => window.game.getState().playerPos);
  await driver.keyboard.down("KeyW");
  await driver.waitForTimeout(250);
  await driver.keyboard.up("KeyW");
  const after = await driver.evaluate(() => window.game.getState().playerPos);
  assert(Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.1);
  await poll();
  await driver.screenshot({ path: output + "/quiz-zones.png" });
  await advance(8);
  await driver.waitForFunction(() =>
    window.minigames.getState().badges.includes("alun-quiz-winner"),
  );
  await driver.screenshot({ path: output + "/quiz-reward.png" });
  report.quiz = await driver.evaluate(() => window.minigames.getState());
  await begin("SACK");
  for (let i = 1; i <= 12; i++) {
    if (i === 2) {
      const button = driver.locator("[data-context-action] button").first();
      await button.tap();
    } else await driver.keyboard.press("Space");
    await driver.waitForFunction(
      (score) =>
        window.minigames
          .getState()
          .round.players.find((p) => p.connectionId === window.connectionId)?.score === score,
      i,
    );
    if (i === 4) {
      await poll();
      await driver.waitForTimeout(250);
      await driver.screenshot({ path: output + "/sack-race.png" });
    }
    await driver.waitForTimeout(740);
  }
  await driver.waitForFunction(() =>
    window.minigames.getState().badges.includes("alun-sack-winner"),
  );
  await driver.screenshot({ path: output + "/sack-reward.png" });
  report.sack = await driver.evaluate(() => window.minigames.getState());
  await begin("CHICKEN");
  const chicken = await driver.evaluate(() =>
    window.minigames.getState().round.chickens.find((c) => c.available),
  );
  await place(driver, chicken.x, chicken.z);
  await poll();
  await driver.waitForTimeout(250);
  await driver.keyboard.press("KeyF");
  await driver.waitForFunction(
    () =>
      window.minigames.getState().round.players.find((p) => p.connectionId === window.connectionId)
        ?.score === 1,
  );
  await rider.waitForFunction(() =>
    window.minigames.getState().round.players.some((p) => p.score === 1),
  );
  await driver.screenshot({ path: output + "/chicken-catch.png" });
  for (let i = 0; i < 5; i++) await advance(8);
  await driver.waitForFunction(() =>
    window.minigames.getState().badges.includes("alun-chicken-winner"),
  );
  await driver.screenshot({ path: output + "/chicken-reward.png" });
  report.chicken = await driver.evaluate(() => window.minigames.getState());
  await begin("SACK");
  await rider.evaluate(async () => {
    window.stopMinigames();
    window.net.setState({ connected: false });
    await fetch("/mobility-api/qa/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: window.connectionId }),
    });
  });
  await driver.waitForFunction(() => window.minigames.getState().round.phase === "cancelled");
  await driver.screenshot({ path: output + "/disconnect-cancelled.png" });
  report.disconnectCancelled = true;
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify({ report, errors }, null, 2));
  console.log(
    "PASS: two players; quiz, sack, chicken; countdown, score, permanent badges and disconnect cancellation",
  );
} finally {
  await browser?.close();
  await server.close();
  php.kill();
  await writeFile("/tmp/world-minigames-qa-backend.log", phpLog);
  await unlink(database).catch(() => {});
}
