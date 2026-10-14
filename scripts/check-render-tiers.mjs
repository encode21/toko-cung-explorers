// Run against the isolated world fixture while check-mobile-soak.mjs serves port 4241.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const out = "/tmp/toko-render-tiers";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.WORLD_QA_URL || "http://127.0.0.1:4241");
  await page.waitForFunction(() => window.perfStats?.calls > 100, null, { timeout: 120000 });
  await page.evaluate(async (root) => {
    window.tierSettings = (
      await import("/@fs" + root + "src/state/game-settings.ts")
    ).useGameSettings;
    window.originalCanvas = document.querySelector("canvas");
  }, root);
  const results = [];
  for (const mode of ["12:00", "23:00"]) {
    await page.evaluate((mode) => window.sceneTime.setWorldTime(mode), mode);
    for (const [tier, dpr] of [
      ["LOW", 1],
      ["MEDIUM", 1.25],
      ["HIGH", 1.5],
    ]) {
      await page.evaluate((tier) => window.tierSettings.setState({ graphics: tier }), tier);
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        return {
          ...window.perfStats,
          dpr: canvas.width / canvas.clientWidth,
          sameCanvas: canvas === window.originalCanvas,
        };
      });
      assert.equal(state.sameCanvas, true);
      assert.ok(Math.abs(state.dpr - dpr) < 0.01, JSON.stringify(state));
      results.push({ mode, tier, ...state });
      await page.screenshot({ path: out + "/" + mode.replace(":", "") + "-" + tier + ".png" });
    }
  }
  for (let i = 0; i < 10; i++) {
    await page.evaluate(
      (i) => window.tierSettings.setState({ graphics: i % 2 ? "LOW" : "HIGH" }),
      i,
    );
    await page.waitForTimeout(150);
  }
  assert.deepEqual(errors, []);
  await writeFile(out + "/report.json", JSON.stringify({ results, errors }, null, 2));
  console.log("PASS day/night LOW/MEDIUM/HIGH DPR and ten tier changes without canvas recreation");
} finally {
  await browser.close();
}
