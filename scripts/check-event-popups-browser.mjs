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
const output = process.env.POPUP_QA_OUTPUT || root + "/docs/qa/login-event-popups";
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
  server: { host: "127.0.0.1", port: 4227, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const sizes = [
  [667, 375],
  [740, 360],
  [844, 390],
  [932, 430],
  [1024, 768],
  [1280, 720],
];
async function bounds(page, selector) {
  const panel = page.locator(selector);
  await panel.waitFor();
  await panel.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  assert(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1,
    "panel fits viewport",
  );
  assert.equal(await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
  for (const target of await panel.locator("button:visible").all()) {
    const b = await target.boundingBox();
    assert(
      b.y >= box.y && b.y + b.height <= box.y + box.height + 1,
      "button fits without scrolling",
    );
    assert(b.height >= 44, "touch target >= 44px");
  }
  assert.equal(await page.locator('[role="dialog"]').count(), 1, "single popup");
  return panel;
}
const close = (page) => page.locator("[data-game-close]").click();
try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.clock.setFixedTime(new Date("2026-11-10T10:00:00+07:00"));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4227");
    await page.waitForFunction(() => window.login?.getState().status);
    await page.evaluate(async () => {
      window.loginFixture = {
        enabled: true,
        points: 50,
        claimedToday: false,
        budgetExhausted: false,
        currentDay: 3,
        resetAt: Date.now() + 86400000,
        days: Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          points: 50,
          claimed: i < 2,
          date: i < 2 ? `2026-11-0${i + 1}` : null,
        })),
      };
      window.claimCalls = 0;
      window.serverBalance = 1250;
      window.loginTransport = async (op) => {
        if (window.loginFail) throw new Error("Koneksi terputus");
        if (op === "daily-login-claim") {
          window.claimCalls++;
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (!window.loginFixture.claimedToday) {
            window.loginFixture.claimedToday = true;
            window.loginFixture.days[window.loginFixture.currentDay - 1].claimed = true;
            window.serverBalance += 50;
          }
          if (window.loseClaimResponse) {
            window.loseClaimResponse = false;
            throw new Error("Respons terputus. Coba lagi.");
          }
        }
        return structuredClone(window.loginFixture);
      };
      await window.loadDailyLogin();
      const s = window.core.getState().snapshot;
      const amounts = [500, 1500, 1000, 2000, 300];
      s.quests.push(
        ...amounts.map((point, i) => ({
          ...s.quests[0],
          id: `pahlawan-${i}`,
          title: `Quest Pahlawan ${i + 1}`,
          theme: "pahlawan",
          campaign_id: "pahlawan-2026",
          repeat_policy: i === 4 ? "DAILY" : "ONCE",
          rewards: { xp: 100, point },
        })),
      );
      window.core.setState({ snapshot: structuredClone(s) });
      const now = Date.now();
      window.eventFixture = {
        id: "pahlawan-2026",
        type: "NATIONAL_DAY",
        status: "ACTIVE",
        intensity: 1,
        startedAt: Date.parse("2026-11-10T00:00:00+07:00"),
        expiresAt: Date.parse("2026-11-17T00:00:00+07:00"),
        revision: 1,
        payload: { theme: "pahlawan" },
      };
      window.receiveWorldSnapshot(
        { revision: 1, generatedAt: now, events: [window.eventFixture] },
        now,
      );
      window.advanceWorld(now, 16);
      window.hud.getState().setSheet("phone");
      window.channels.setState({ sceneReady: true });
    });
    await page.locator("[data-phone-panel]").waitFor();
    assert.equal(
      await page.locator(".game-pahlawan-event").count(),
      0,
      "event waits for existing panel",
    );
    await close(page);
    const event = await bounds(page, ".game-pahlawan-event");
    await event.getByText("Hingga 5.000 Point", { exact: true }).waitFor();
    await event.getByText("300 Point / hari", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/${width}x${height}-event.png` });
    await close(page);
    const login = await bounds(page, ".game-daily-login-sheet");
    const content = await login.locator(".daily-login-content").evaluate((el) => ({
      scroll: el.scrollHeight,
      height: el.clientHeight,
      sections: [
        ...document.querySelectorAll(
          ".game-daily-login-sheet header, .daily-login-intro, .daily-login-calendar, .daily-login-notice, .daily-login-footer",
        ),
      ].map((s) => ({ name: s.className, height: s.getBoundingClientRect().height })),
    }));
    assert(
      content.scroll <= content.height + 1,
      `seven cards and notice fit: ${JSON.stringify(content)}`,
    );
    assert.equal(await login.locator(".daily-login-calendar li").count(), 7);
    assert.equal(await login.locator('[data-state="claimed"]').count(), 2);
    assert.equal(await login.locator('[data-state="available"]').count(), 1);
    const day7 = await login.locator(".daily-login-day-final").boundingBox();
    const day1 = await login.locator(".daily-login-day").first().boundingBox();
    assert(day7.height > day1.height * 1.8, "large day-seven card spans two rows");
    await page.screenshot({ path: `${output}/${width}x${height}-daily.png` });
    await close(page);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    assert.equal(
      await page.locator('[role="dialog"]').count(),
      0,
      "dismissed offers stay dismissed",
    );
    await page.locator('[data-side-action="daily-login"]').click();
    await page.evaluate(() => Promise.all([window.claimDailyLogin(), window.claimDailyLogin()]));
    await login.getByRole("button", { name: "Sudah diklaim hari ini" }).waitFor();
    assert.equal(
      await login.getByRole("button", { name: "Sudah diklaim hari ini" }).isDisabled(),
      true,
    );
    assert.equal(await page.evaluate(() => window.claimCalls), 1);
    assert.equal(await page.evaluate(() => window.serverBalance), 1300);
    assert.equal(
      await page.evaluate(() => window.core.getState().snapshot.wallet.current_balance),
      1250,
      "no client-side wallet credit",
    );
    await close(page);
    await page.locator('[data-side-action="pahlawan-event"]').click();
    await bounds(page, ".game-pahlawan-event");
    await page.getByRole("button", { name: "Lihat quest event" }).click();
    await page.getByRole("button", { name: "Semua quest", exact: true }).waitFor();
    assert.equal(
      await page.getByText("Jejak kiriman yang hilang", { exact: true }).count(),
      0,
      "event CTA filters ordinary quests",
    );
    await page.getByText("Quest Pahlawan 1", { exact: true }).first().waitFor();
    await close(page);
    await page.waitForFunction(() => window.hud.getState().sheet === null);
    if (width === 844 || width === 1280)
      await page.screenshot({ path: `${output}/${width}x${height}-menu.png` });
    await page.locator('[data-side-action="pahlawan-event"]').click();
    await bounds(page, ".game-pahlawan-event");
    await page.evaluate(() => window.advanceWorld(window.eventFixture.expiresAt + 1, 16));
    await page.locator(".game-pahlawan-event").waitFor({ state: "hidden" });
    assert.equal(
      await page.locator('[data-side-action="pahlawan-event"]').count(),
      0,
      "expired event disappears",
    );
    if (width === 844) {
      await page.evaluate(async () => {
        window.loginFixture.currentDay = 7;
        window.loginFixture.claimedToday = false;
        window.loginFixture.days.forEach((d, i) => {
          d.claimed = i < 6;
        });
        await window.loadDailyLogin();
        window.hud.getState().setSheet("daily-login");
      });
      await page.getByRole("button", { name: "Klaim hari ke-7" }).waitFor();
      await page.screenshot({ path: `${output}/844x390-day-seven.png` });
      await page.evaluate(() => {
        window.loseClaimResponse = true;
      });
      await page.getByRole("button", { name: "Klaim hari ke-7" }).click();
      await page.getByRole("button", { name: "Coba lagi" }).click();
      await page.getByRole("button", { name: "Sudah diklaim hari ini" }).waitFor();
      assert.equal(
        await page.evaluate(() => window.serverBalance),
        1350,
        "lost response recovers without paying again",
      );
      assert.equal(await page.locator('[data-state="claimed"]').count(), 7);
      await page.evaluate(async () => {
        window.loginFixture.claimedToday = false;
        window.loginFixture.budgetExhausted = true;
        await window.loadDailyLogin();
      });
      await page.getByText("Hadiah event sudah habis. Terima kasih sudah ikut bermain!").waitFor();
      assert.equal(await page.getByRole("button", { name: "Klaim hari ke-7" }).isDisabled(), true);
      await page.evaluate(async () => {
        window.loginFail = true;
        await window.loadDailyLogin();
      });
      await page.getByRole("button", { name: "Coba lagi" }).waitFor();
      await page.evaluate(() => {
        window.loginFail = false;
      });
      await page.getByRole("button", { name: "Coba lagi" }).click();
      await page.getByText("Hadiah event sudah habis. Terima kasih sudah ikut bermain!").waitFor();
      await close(page);
      // A response from a departed account must never replace the next account's state.
      await page.evaluate(async () => {
        let resolve;
        window.loginTransport = () =>
          new Promise((done) => {
            resolve = done;
          });
        const pending = window.loadDailyLogin();
        window.clearDailyLogin();
        resolve(window.loginFixture);
        await pending;
      });
      assert.equal(await page.evaluate(() => window.login.getState().status), null);
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 6 landscape sizes; 7-day calendar, claim/retry, event queue/reopen/CTA/expiry, no duplicate credit or stale account state.",
  );
} finally {
  await browser.close();
  await server.close();
}
