// Phone navigation with real HUD components and fixture transport; no live account.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/hud";
const output = process.env.QA_OUTPUT || "/tmp/tokocung-staff-cash-qa";
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
      { find: "@/net/useWorldChannel", replacement: qa + "/world-channel.ts" },
      { find: "@/game/core/api.functions", replacement: qa + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 740, height: 360 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (error) => { errors.push(error.message); console.error(error.message); });
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.seedStaffFixture && window.hud);
    await page.evaluate(() => {
      window.dungeon.setState({ data: null });
      window.seedStaffFixture();
      window.warung.setState({ panelTab: "operasional" });
      window.hud.getState().setSheet("warung");
    });
    const staff = page.getByRole("region", { name: "Karyawan", exact: true });
    await staff.waitFor();
    await staff.scrollIntoViewIfNeeded();
    assert.equal(await staff.locator(".staff-card").count(), 2);
    assert.equal(await staff.locator("details[open]").count(), 0);
    const target = staff.getByRole("group", { name: "Target isi rak" });
    assert.equal(await target.getByRole("button", { name: "50%", exact: true }).getAttribute("aria-pressed"), "true");
    await target.getByRole("button", { name: "75%", exact: true }).click();
    await page.waitForFunction(() => window.staff.getState().data.staff[1].restockTargetPercent === 75);
    assert.equal(await target.getByRole("button", { name: "75%", exact: true }).getAttribute("aria-pressed"), "true");
    const targetBox = await target.getByRole("button", { name: "75%", exact: true }).boundingBox();
    await page.screenshot({ path: `${output}/target-${viewport.width}.png` });
    assert(targetBox.width >= 44 && targetBox.height >= 44, JSON.stringify(targetBox));
    await target.getByRole("button", { name: "50%", exact: true }).click();
    await page.waitForFunction(() => window.staff.getState().data.staff[1].restockTargetPercent === 50);
    await page.screenshot({ path: `${output}/staff-${viewport.width}.png` });
    assert.equal(await staff.evaluate(el => el.scrollWidth > el.clientWidth + 1), false, JSON.stringify(await staff.evaluate(el => ({width: el.clientWidth, scroll: el.scrollWidth, cards: [...el.querySelectorAll(".staff-card")].map(c => ({w: c.clientWidth, s: c.scrollWidth, b: c.getBoundingClientRect().toJSON()}))}))));
    if (viewport.width === 1280) {
      await page.evaluate(() => window.hud.getState().openFromInbox({ app: "cungchat", threadId: "staff-Penjaga warung" }));
      await page.getByRole("button", { name: "Bayar gaji Rp80.000 di CngBank", exact: true }).click();
    } else {
      await staff.getByRole("button", { name: "Bayar gaji", exact: true }).click();
    }
    const confirm = page.getByRole("button", { name: "Konfirmasi transfer Rp80.000", exact: true });
    await confirm.waitFor();
    assert.equal(await page.evaluate(() => window.staffRequests.filter(r => r.action === "pay").length), 0);
    await page.screenshot({ path: `${output}/bank-${viewport.width}.png` });
    await page.evaluate(() => { window.loseSalaryReply = true; });
    await confirm.click();
    await page.getByRole("button", { name: "Cek ulang pembayaran" }).click();
    await page.getByRole("status").filter({ hasText: "Transfer berhasil" }).waitFor();
    const payment = await page.evaluate(() => ({ requests: window.staffRequests.filter(r => r.action === "pay"), cash: window.staff.getState().data.kas }));
    assert.equal(payment.requests.length, 2);
    assert.deepEqual(payment.requests[0], payment.requests[1]);
    assert.equal(payment.cash, 170000);
    await page.evaluate(() => window.hud.getState().openFromInbox({ app: "cungchat", threadId: "staff-Penjaga warung" }));
    await page.getByText("Transfer gaji Rp80.000 sudah saya terima. Terima kasih, Bos!", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Bayar gaji/ }).count(), 0);
    await page.screenshot({ path: `${output}/chat-${viewport.width}.png` });
    await page.evaluate(() => {
      window.warung.setState({ notices: [{ kind: "sale", count: 1, items: { "mi-instan": 4 }, amount: 12000 }] });
      window.hud.getState().openFeed("inbox");
    });
    await page.getByRole("button", { name: /Kabar warung/ }).click();
    const ledger = page.getByRole("region", { name: "Catatan pengeluaran dan kas" });
    await ledger.waitFor();
    assert.equal(await ledger.getAttribute("data-notice-highlight"), "true");
    assert.equal(await page.evaluate(() => window.warung.getState().notices.length), 0);
    await page.screenshot({ path: `${output}/ledger-${viewport.width}.png` });
    await page.waitForFunction(() => !document.querySelector('[data-notice-highlight="true"]'));
    await page.evaluate(() => window.hud.getState().setSheet(null));
    await page.waitForFunction(() => !document.querySelector('[data-warung-panel]'));
    await page.evaluate(() => { window.warung.setState({ panelTab: "catatan" }); window.hud.getState().setSheet("warung"); });
    await ledger.waitFor();
    assert.equal(await ledger.getAttribute("data-notice-highlight"), null, "ordinary reopening never repeats notification highlight");
    await page.evaluate(() => window.hud.getState().setSheet("daily-login"));
    await page.locator(".daily-login-kas").nth(6).waitFor();
    assert.equal(await page.locator(".daily-login-day > .daily-login-kas").count(), 7);
    assert.equal(await page.locator(".daily-login-kas").nth(4).getAttribute("data-state"), "available");
    assert.match(await page.locator(".daily-login-day").nth(1).innerText(), /Diklaim/);
    await page.getByRole("button", { name: "Klaim hadiah hari ini" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".daily-login-kas")[4].dataset.state === "claimed");
    assert.equal(await page.locator(".daily-login-calendar").evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    assert.equal(await page.locator(".daily-login-kas strong").evaluateAll(rows => rows.some(el => el.scrollWidth > el.clientWidth + 1)), false, "cash amounts stay readable inside their card");
    await page.screenshot({ path: `${output}/daily-${viewport.width}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log("PASS: manual payroll confirmation + lost response retry + chat receipt + one-time ledger highlight + independent Point/Kas cards (3 viewport sizes)");
} finally {
  await browser.close();
  await server.close();
}
