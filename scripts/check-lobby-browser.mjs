// Lobby channel selection: Masuk Dunia stays inside one measured viewport.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/lobby";
const output = process.env.LOBBY_QA_OUTPUT || "/tmp/toko-lobby-qa";
await mkdir(output, { recursive: true });

const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/net/channel-store", replacement: qa + "/channels.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["@tanstack/react-start", "@tanstack/start-server-core"],
  },
  server: { host: "127.0.0.1", port: 4224, strictPort: true, fs: { allow: [root] } },
});
await server.listen();

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
try {
  for (const [width, height] of [
    [667, 375],
    [740, 360],
    [844, 390],
    [932, 430],
    [1024, 768],
    [1280, 720],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width !== 1280,
      isMobile: width !== 1280,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${width}x${height}: ${e.message}`));
    await page.goto("http://127.0.0.1:4224/");
    await page.getByRole("button", { name: "Masuk Dunia" }).waitFor();
    await page.getByRole("option", { name: /CHANNEL 01/i }).click();
    const result = await page.evaluate(() => {
      const viewport = document.querySelector(".world-viewport");
      const enter = [...document.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("Masuk Dunia"),
      );
      const list = document.querySelector(".channel-list");
      const r = enter.getBoundingClientRect();
      const vh = viewport.getBoundingClientRect().height;
      return {
        pageOverflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight + 1,
        enterVisible: r.top >= 0 && r.bottom <= vh + 1 && r.height >= 40,
        listScrolls: list && list.scrollHeight >= list.clientHeight,
        enter: { top: r.top, bottom: r.bottom, height: r.height },
        vh,
      };
    });
    assert(!result.pageOverflow, `${width}x${height}: page overflow ${JSON.stringify(result)}`);
    assert(result.enterVisible, `${width}x${height}: Masuk Dunia clipped ${JSON.stringify(result)}`);
    await page.screenshot({ path: `${output}/${width}x${height}-lobby.png` });
    await context.close();
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("PASS lobby: Masuk Dunia visible in one viewport across QA sizes");
} finally {
  await browser.close();
  await server.close();
}
