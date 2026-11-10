import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("..", import.meta.url).pathname;
const output = root + "docs/qa/social-avatar-v3";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "tests/fixtures/social-avatar",
  publicDir: root + "public",
  server: { host: "127.0.0.1", port: 4273, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.text().includes("No target node")) errors.push(m.text());
  });
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.avatarPreview?.ready);
  const names = await page.evaluate(() => window.avatarPreview.names);
  for (const name of names) {
    await page.evaluate((name) => window.avatarPreview.seek(name, 0.4), name);
    if (["Idle", "Wave", "Run", "Jump", "Sit", "Swim", "RideDrive", "Dance_sway"].includes(name))
      await page.screenshot({ path: `${output}/${name}.png` });
  }
  await page.evaluate(() => window.avatarPreview.hero());
  await page.screenshot({ path: `${output}/hero.png` });
  for (const [id, config, label] of [
    ["hair-short", { hair: "short" }, "Rambut pendek · tanpa topi"],
    ["hair-bob", { hair: "bob", gender: "female", expression: "grin" }, "Perempuan · rambut bob · ceria"],
    ["hair-ponytail", { hair: "ponytail", expression: "wink" }, "Rambut kuncir · kedip"],
    ["hair-hijab", { hair: "hijab", expression: "calm" }, "Hijab · kalem"],
    ["body-child", { age: "child", hair: "buns", gender: "female" }, "Anak-anak · cepol"],
    ["body-heavy", { build: "heavy", hair: "buzz" }, "Dewasa · gemuk · cepak"],
    ["body-muscular", { build: "muscular", hair: "spiky" }, "Dewasa · berotot · jabrik"],
    ["body-slim", { build: "slim", hair: "sidepart" }, "Dewasa · kurus · belah samping"],
  ]) {
    await page.evaluate(({ config, label }) => window.avatarPreview.customize(config, label), { config, label });
    await page.screenshot({ path: `${output}/${id}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${names.length} animations rendered; comparison screenshots: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
