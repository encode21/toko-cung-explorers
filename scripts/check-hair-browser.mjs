// Renders every hair style from four angles, then every headwear on each style, for visual QA.
import { createServer } from "vite";
import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("..", import.meta.url).pathname;
const output = process.env.HAIR_QA_OUTPUT || root + "docs/qa/social-avatar-v3/hair";
await mkdir(output, { recursive: true });
const catalog = JSON.parse(await readFile(root + "src/identity/wardrobe-catalog.json", "utf8"));
const styles = ["short", "spiky", "bob", "buns", "buzz", "sidepart", "ponytail", "hijab"];
const hats = catalog.filter((i) => i.slot === "headwear").map((i) => i.id);
const server = await createServer({
  configFile: false,
  root: root + "tests/fixtures/social-avatar",
  publicDir: root + "public",
  server: { host: "127.0.0.1", port: 4274, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const sheet = async (name, cells, columns) => {
    const size = 240;
    const page = await browser.newPage({
      viewport: { width: columns * size, height: Math.ceil(cells.length / columns) * size },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.resolvedUrls.local[0] + "hair.html");
    await page.waitForFunction(() => window.hairSheet?.ready);
    await page.evaluate(({ cells, columns }) => window.hairSheet.render(cells, columns), {
      cells,
      columns,
    });
    await page.screenshot({ path: `${output}/${name}.png` });
    await page.close();
  };
  // Rows: styles. Columns: front, three-quarter, side, back.
  await sheet(
    "styles",
    styles.flatMap((hair) => [0, 40, 90, 180].map((angle) => ({ hair, angle }))),
    4,
  );
  // Rows: styles. Columns: every headwear, three-quarter view, so no hat exposes a bald scalp.
  for (const [name, angle] of [
    ["hats-front", 35],
    ["hats-back", 150],
  ])
    await sheet(
      name,
      styles.flatMap((hair) => hats.map((headwear) => ({ hair, headwear, angle }))),
      hats.length,
    );
  await sheet(
    "accessories",
    catalog
      .filter((i) => ["hairDecoration", "eyewear", "audio", "neck"].includes(i.slot))
      .map((i) => ({ hair: "bob", [i.slot]: i.id, angle: 25, height: 0.1 })),
    6,
  );
  // WARDROBE_THUMBS=id,id writes shop thumbnails for new accessories.
  for (const id of (process.env.WARDROBE_THUMBS || "").split(",").filter(Boolean)) {
    const item = catalog.find((i) => i.id === id);
    const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
    await page.goto(server.resolvedUrls.local[0] + "hair.html");
    await page.waitForFunction(() => window.hairSheet?.ready);
    await page.evaluate((cell) => window.hairSheet.render([cell], 1, "#dde5e9"), {
      hair: "short",
      [item.slot]: id,
      angle: 20,
      height: 0.15,
    });
    await page.screenshot({ path: `${root}public/assets/wardrobe/${id}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS hair sheets: ${output} (hats: ${hats.join(", ")})`);
} finally {
  await browser?.close();
  await server.close();
}
