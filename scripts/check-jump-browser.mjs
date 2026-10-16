import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("..", import.meta.url).pathname;
const output = "/tmp/toko-jump-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "tests/fixtures/jump",
  publicDir: root + "public",
  server: { host: "127.0.0.1", port: 4247, fs: { allow: [root] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const [name, width, height] of [
    ["desktop", 1100, 760],
    ["mobile-landscape", 844, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: name !== "desktop",
      hasTouch: name !== "desktop",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.jumpPreview?.ready);
    for (const [phase, time] of [
      ["anticipation", 0.356],
      ["takeoff", 0.418],
      ["dip-one", 0.482],
      ["arms-up", 0.542],
      ["dip-two", 0.6],
      ["fall", 0.85],
      ["landing", 1.05],
      ["walk", 1.35],
    ]) {
      await page.evaluate((t) => window.jumpPreview.seek(t), time);
      await page.screenshot({ path: `${output}/${name}-${phase}.png` });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    `PASS both rigs render all jump phases in desktop/mobile landscape; screenshots: ${output}`,
  );
} finally {
  await browser?.close();
  await server.close();
}
