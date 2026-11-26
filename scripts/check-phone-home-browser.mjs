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
const output = process.env.QA_OUTPUT || "/tmp/tokocung-phone-home-qa";
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
  for (const viewport of [
    { width: 462, height: 880 },
    { width: 740, height: 360 },
    { width: 1280, height: 800 },
  ]) {
    const page = await browser.newPage({ viewport, hasTouch: viewport.width === 740 });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.hud && window.dungeon);
    await page.evaluate(() => {
      window.dungeon.setState({ data: null });
      const motor = { id: "matic", name: "Matic Harian", price: 120000, fare_percent: 120 };
      const snapshot = {
        motors: [motor],
        rides: [],
        spots: [],
        ojek: {
          hasWarung: true,
          cash: 622935,
          savings: 0,
          motor,
          rating: 5,
          tripsThisHour: 0,
          tripsPerHourCap: 20,
          playerTripsThisHour: 0,
          npcTripsPerHourCap: null,
          setoranPercent: 40,
          declinedStreak: 0,
          nextOfferAt: null,
          offer: null,
          order: null,
          ride: null,
          job: null,
        },
      };
      window.ojekTransport = async () => structuredClone(snapshot);
      window.ojek.setState({ data: snapshot, error: null });
      window.warung.setState({
        data: {
          warung: {
            id: 1,
            name: "Warung Contoh",
            cash: 622935,
            stock: [],
            level: 1,
            totalSales: 0,
            hiring: false,
            maxStock: 100,
            isOpen: true,
          },
          debts: [],
          debtHistory: [],
          journal: [],
          events: [],
          catalog: [],
          levels: [],
          rent: { daily: 10000, owedDays: 0, owed: 0 },
        },
        error: null,
      });
      window.hud.getState().setSheet("phone");
    });
    for (const app of [
      "ojek",
      "cungchat",
      "notes",
      "calendar",
      "cngbank",
      "sosmed",
      "tokocung",
      "camera",
    ]) {
      await page.locator(`[data-phone-app="${app}"]`).click();
      const panel = page.locator("[data-game-panel]").last();
      if (app === "tokocung" || app === "sosmed" || app === "calendar") {
        await panel.locator(`[data-phone-screen="${app}"]`).waitFor();
        assert.equal(await panel.locator(".phone-app-home").count(), app === "calendar" ? 1 : 0);
      }
      const home = panel.locator("[data-game-close]");
      await home.waitFor();
      assert.equal(
        await home.getAttribute("aria-label"),
        "Home handphone",
        `${app}: accessible Home action`,
      );
      assert.equal(await home.locator(".lucide-house").count(), 1, `${app}: house replaces X`);
      const bounds = await home.boundingBox();
      assert(bounds.width >= 44 && bounds.height >= 44, `${app}: touch target`);
      assert(
        bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width,
        `${app}: side button remains on screen`,
      );
      if (app === "ojek") await page.getByText("Kamu sedang offline", { exact: true }).waitFor();
      if (app === "ojek")
        await page.screenshot({ path: `${output}/ojek-home-${viewport.width}.png` });
      if (app === "cungchat") {
        await page.getByRole("button", { name: /Koko Cung/ }).click();
        await page.getByRole("button", { name: "Kembali ke daftar chat", exact: true }).waitFor();
      }
      await home.click();
      await page.locator("[data-phone-panel]").waitFor();
      await page.waitForFunction(
        (id) => document.activeElement?.getAttribute("data-phone-app") === id,
        app,
      );
      assert.equal(await page.evaluate(() => window.hud.getState().sheet), "phone");
    }
    // Escape returns to the launcher; only the launcher's X closes the phone.
    await page.locator('[data-phone-app="ojek"]').click();
    await page.locator('[data-phone-screen="ojek"]').waitFor();
    await page.keyboard.press("Escape");
    await page.locator("[data-phone-panel]").waitFor();
    await page.getByRole("button", { name: "Tutup Handphone", exact: true }).click();
    await page.waitForFunction(() => window.hud.getState().sheet === null);
    // Non-phone dialogs keep their existing close action.
    await page.evaluate(() => window.hud.getState().setSheet("help"));
    await page.getByRole("button", { name: "Tutup Panduan", exact: true }).click();
    await page.waitForFunction(() => window.hud.getState().sheet === null);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 8 phone apps -> Home -> next app, keyboard focus, Escape, launcher X, 44px targets and standalone close at 3 sizes.",
  );
} catch (error) {
  console.error("Browser errors:", errors);
  throw error;
} finally {
  await browser.close();
  await server.close();
}
