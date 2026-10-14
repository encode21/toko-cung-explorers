import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url)),
  out = "/tmp/toko-intro-qa";
await mkdir(out, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/intro",
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/intro/client.ts" },
      { find: "@", replacement: root + "/src" },
    ],
  },
  server: { host: "127.0.0.1", port: 4243, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const report = [];
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      const errors = [];
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:4243");
      await page.locator("video").waitFor();
      const checkViewport = async () => {
        const result = await page.evaluate(() => {
          const e = document.querySelector("main"),
            r = e.getBoundingClientRect(),
            v = visualViewport;
          return {
            height: r.height,
            width: r.width,
            expectedH: v.height,
            expectedW: v.width,
            bg: getComputedStyle(document.body).backgroundColor,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.ok(Math.abs(result.height - result.expectedH) < 1);
        assert.ok(Math.abs(result.width - result.expectedW) < 1);
        assert.equal(result.bg, "rgb(16, 24, 32)");
        assert.equal(result.overflow, false);
      };
      await page.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
      await checkViewport();
      await page.waitForTimeout(350);
      const portrait = await page.screenshot({ path: out + `/${name}-portrait.png` });
      const captionPixels = await page.evaluate(async (encoded) => {
        const image = new Image();
        image.src = `data:image/png;base64,${encoded}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const rect = document.querySelector(".story-caption h1").getBoundingClientRect();
        const scale = image.width / innerWidth;
        const { data } = context.getImageData(
          Math.floor(rect.x * scale),
          Math.floor(rect.y * scale),
          Math.floor(rect.width * scale),
          Math.floor(rect.height * scale),
        );
        let bright = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] > 220 && data[i + 1] > 205 && data[i + 2] > 170) bright++;
        return bright;
      }, portrait.toString("base64"));
      assert.ok(
        captionPixels > 100,
        `${name}: caption must be painted above inline video, not only present in DOM`,
      );
      // Same mounted player and canvas-sized region survive rotation.
      await page.evaluate(() => (window.originalVideo = document.querySelector("video")));
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(200);
      await checkViewport();
      assert.equal(
        await page.evaluate(() => window.originalVideo === document.querySelector("video")),
        true,
      );
      await page.screenshot({ path: out + `/${name}-landscape.png` });
      await page.getByRole("button", { name: "Lewati", exact: true }).click();
      await page.getByRole("heading", { name: "Lobby", exact: true }).waitFor();
      await page.waitForTimeout(70);
      assert.equal(await page.evaluate(() => window.introQA.state().pending), false);
      await page.evaluate(() => window.introQA.hydrateIntro("alice", null));
      assert.equal(
        await page.locator("video").count(),
        0,
        "stale /me cannot undo acknowledged completion",
      );
      // Rehydrating the same account/server result bypasses the automatic intro.
      await page.evaluate(() => window.introQA.hydrateIntro("alice", "2026-10-13T15:00:00+00:00"));
      assert.equal(await page.locator("video").count(), 0);
      const calls = await page.evaluate(() => window.introCalls);
      await page.getByRole("button", { name: "Tonton ulang cerita" }).click();
      await page.getByRole("button", { name: "Kembali ke lobby" }).click();
      assert.equal(await page.evaluate(() => window.introCalls), calls);
      // Another account cannot inherit completion. Failed persistence retries per account.
      await page.evaluate(() => {
        window.failSave = true;
        window.introQA.hydrateIntro("bob", null);
      });
      await page.getByRole("button", { name: "Lewati", exact: true }).click();
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => window.introQA.state().pending), true);
      await page.evaluate(() => {
        window.introQA.clearIntro();
        window.introQA.hydrateIntro("charlie", null);
      });
      await page.locator("video").waitFor();
      assert.equal(await page.evaluate(() => window.introQA.state().dismissed), false);
      await page.evaluate(() => {
        window.introQA.hydrateIntro("bob", null);
        window.failSave = false;
        return window.introQA.retryIntroCompletion();
      });
      assert.equal(await page.evaluate(() => window.introQA.state().pending), false);
      // Complete all four clips (real media, accelerated seek to their ended events).
      await page.evaluate(() => window.introQA.hydrateIntro("diana", null));
      for (let i = 0; i < 4; i++) {
        await page.waitForFunction(
          () => {
            const v = document.querySelector("video");
            return v && v.readyState >= 1 && Number.isFinite(v.duration);
          },
          null,
          { timeout: 15000 },
        );
        const before = await page.locator("video").getAttribute("src");
        await page.evaluate(() => {
          const v = document.querySelector("video");
          v.currentTime = v.duration - 0.08;
          v.muted = true;
          return v.play();
        });
        if (i < 3)
          await page.waitForFunction(
            (src) => document.querySelector("video")?.getAttribute("src") !== src,
            before,
          );
        else await page.getByRole("heading", { name: "Lobby", exact: true }).waitFor();
      }
      // Storage absence does not prevent dismissal; stalled playback has a user action.
      await page.evaluate(() => window.introQA.hydrateIntro("erin", null));
      await page.locator("video").evaluate((v) => v.dispatchEvent(new Event("error")));
      await page.getByText("Video belum bisa diputar.").waitFor();
      await page.getByRole("button", { name: "Lewati", exact: true }).last().click();
      // Simulated keyboard viewport and page restoration keep bounds in sync.
      await page.getByRole("textbox", { name: "Chat" }).focus();
      await page.setViewportSize({ width: 844, height: 240 });
      await page.waitForTimeout(100);
      await checkViewport();
      await page.setViewportSize({ width: 844, height: 390 });
      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      await page.waitForTimeout(100);
      await checkViewport();
      assert.deepEqual(errors, []);
      report.push({
        engine: name,
        passed: true,
        checks: [
          "portrait",
          "landscape",
          "stable video on resize",
          "skip",
          "replay",
          "account isolation",
          "offline retry",
          "four clips end",
          "media error",
          "viewport resize/pageshow",
        ],
      });
      console.log(name + " intro checks passed");
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
}
