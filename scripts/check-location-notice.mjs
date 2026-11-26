// Offline integration test of location notices, cashier reminders and persistent actions.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { WARUNG_LOTS, lotFront } from "../src/game/warung/lots.ts";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/grosir";
const hud = root + "/tests/fixtures/hud";
const output =
  process.env.LOCATION_QA_OUTPUT ||
  fileURLToPath(new URL("../../previews/location-notice-compact", import.meta.url));
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  cacheDir: root + "/.cache/grosir-qa",
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/aiApi/npc.functions", replacement: hud + "/npc-api.ts" },
      { find: "@tanstack/react-start", replacement: hud + "/server-fn.ts" },
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/net/useWorldChannel", replacement: hud + "/world-channel.ts" },
      { find: "@/game/core/api.functions", replacement: hud + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4238, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const passed = [];
const lotPosition = lotFront(WARUNG_LOTS[0]);
const wait = (page, ms) => page.waitForTimeout(ms);
const enterStore = async (page) => {
  await page.evaluate(() => window.game.setState({ playerPos: [2.2, 0.83, 0.5], inside: true }));
  await page
    .locator('[data-location-notice][data-location-key="kulakan"]')
    .waitFor({ state: "visible" });
};
const leaveStore = async (page) => {
  await page.evaluate(() => window.game.setState({ playerPos: [30, 0.83, 30], inside: false }));
  await page.locator("[data-warung-kulakan-prompt]").waitFor({ state: "hidden" });
};
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["landscape", 858, 398],
    ["compact", 535, 238],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: name !== "desktop",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4238/");
    await page.waitForFunction(() => typeof window.resetGrosir === "function");
    await page.evaluate(() =>
      window.warung.setState({
        basket: [
          { itemId: "mi-instan", qty: 28 },
          { itemId: "kopi-sachet", qty: 17 },
        ],
      }),
    );
    await leaveStore(page);
    await enterStore(page);
    const notice = page.locator("[data-location-notice]");
    const payment = page.locator("[data-warung-kulakan-prompt]");
    await wait(page, 350);
    assert.equal(await payment.isVisible(), false, `${name}: entry notice suppresses payment`);
    assert.equal(
      await notice.locator(".location-notice-icon, svg, img").count(),
      0,
      `${name}: location notice has no icon`,
    );
    const n = await notice.boundingBox();
    assert.ok(
      n && n.x >= 0 && n.y >= 0 && n.x + n.width <= width + 1 && n.y + n.height <= height + 1,
      `${name}: location notice bounds`,
    );
    assert.ok(n.height < 90, `${name}: location notice stays compact`);
    const contentWidth = await notice.evaluate((el) => {
      const box = el.querySelector(".location-notice-message") ?? el;
      const textWidths = [...box.querySelectorAll("strong, span")].map((text) => {
        const range = document.createRange();
        range.selectNodeContents(text);
        return range.getBoundingClientRect().width;
      });
      const style = getComputedStyle(box);
      return (
        Math.max(...textWidths) + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      );
    });
    assert.ok(n.width <= contentWidth + 3, `${name}: width follows the actual text`);
    assert.equal(
      await notice.evaluate((el) => getComputedStyle(el).pointerEvents),
      "none",
      `${name}: location message does not block movement`,
    );
    await page.screenshot({ path: `${output}/${name}-entry.png` });
    // A movement update and a fresh server-shaped snapshot must not restart entry lifetime.
    await wait(page, 1000);
    await page.evaluate(() => {
      window.game.setState({ playerPos: [2.4, 0.83, 0.6] });
      const state = window.warung.getState();
      window.warung.setState({ data: { ...state.data, warung: { ...state.data.warung } } });
    });
    await wait(page, 1800);
    await notice.waitFor({ state: "hidden", timeout: 800 });
    await payment.waitFor({ state: "visible" });
    assert.match(await payment.innerText(), /Bayar di kasir/);
    assert.match(await payment.innerText(), /45 barang/);
    await page.screenshot({ path: `${output}/${name}-payment.png` });
    if (name === "compact") {
      passed.push(`${name}: text-sized notice fits and hands off to payment`);
      await page.close();
      continue;
    }
    // Closing a sheet in the same physical location does not replay the notice.
    await page.evaluate(() => window.openGrosir());
    await page.locator(".grosir-drawer").waitFor();
    assert.equal(await payment.isVisible(), false, `${name}: shopping stays focused`);
    await page.keyboard.press("Escape");
    await payment.waitFor({ state: "visible" });
    assert.equal(await notice.count(), 0, `${name}: no notice replay after modal close`);
    // Basket changes update the live payment reminder; emptying it removes the toast.
    await page.evaluate(() =>
      window.warung.setState({ basket: [{ itemId: "mi-instan", qty: 2 }] }),
    );
    assert.match(await payment.innerText(), /2 barang/);
    await page.evaluate(() => window.warung.setState({ basket: [] }));
    await payment.waitFor({ state: "hidden" });
    assert.equal(await notice.count(), 0, `${name}: emptying basket does not replay location`);
    // Leaving and genuinely entering again starts a fresh three-second notice.
    await leaveStore(page);
    await enterStore(page);
    await page.evaluate(() => window.openGrosir());
    await wait(page, 3250);
    await page.keyboard.press("Escape");
    assert.equal(
      await payment.isVisible(),
      false,
      `${name}: empty basket remains quiet after reentry`,
    );
    assert.equal(await notice.count(), 0, `${name}: notice expires while menu is open`);
    await page.evaluate(() =>
      window.warung.setState({ basket: [{ itemId: "mi-instan", qty: 3 }] }),
    );
    await payment.waitFor({ state: "visible" });
    assert.match(await payment.innerText(), /3 barang/);
    await leaveStore(page);
    // Warung location copy expires, while its existing entry/lock actions remain reachable.
    await page.evaluate(([x, z]) => {
      const state = window.warung.getState();
      window.warung.setState({
        lots: [{ ...state.data.warung, lot: 0, ownerName: "Kamu", online: true }],
      });
      window.game.setState({ playerPos: [x, 0.83, z], inside: false });
    }, lotPosition);
    const lotNotice = page.locator("[data-location-notice]");
    const lotActions = page.locator("[data-warung-lot-prompt]");
    await lotNotice.waitFor({ state: "visible" });
    await lotActions
      .getByRole("button", { name: "Masuk warung", exact: true })
      .waitFor({ state: "visible" });
    await wait(page, 350);
    await page.screenshot({ path: `${output}/${name}-warung.png` });
    await wait(page, 2850);
    await lotNotice.waitFor({ state: "hidden" });
    assert.ok(
      await lotActions.getByRole("button", { name: "Masuk warung", exact: true }).isVisible(),
      `${name}: entry action preserved`,
    );
    assert.equal(await payment.count(), 0, `${name}: no cashier reminder outside wholesale area`);
    passed.push(
      `${name}: compact text-only entry, exclusive toast timing, nonempty-cart payment, no replay and retained location actions`,
    );
    await page.close();
  }
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(JSON.stringify({ passed, screenshots: output }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
