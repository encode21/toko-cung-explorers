import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { DANCES } from "../src/game/club/model.ts";
const root = new URL("..", import.meta.url).pathname;
const output = "/tmp/toko-dance-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "tests/fixtures/dance",
  publicDir: root + "public",
  server: { host: "127.0.0.1", port: 4246, fs: { allow: [root] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4246");
  await page.waitForFunction(() => window.dancePreview?.ready);
  for (const id of DANCES) {
    await page.evaluate((id) => window.dancePreview.select(id), id);
    for (const t of [0.25, 0.65, 1.15]) {
      await page.evaluate((t) => window.dancePreview.seek(t), t);
      await page.screenshot({ path: `${output}/${id}-${t}.png` });
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS eight dances rendered on both rigs; screenshots: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
