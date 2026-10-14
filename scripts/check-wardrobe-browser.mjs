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
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-wardrobe-qa";
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
      { find: "@/game/core/api.functions", replacement: qa + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4221, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });

const errors = [];
try {
  for (const [width, height] of [
    [667, 375],
    [740, 360],
    [844, 390],
    [1280, 720],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1280 });
    page.on("pageerror", (e) => { errors.push(e.message); console.error(e.message); });
    await page.goto("http://127.0.0.1:4221");
    const open = async () => {
      await page.getByRole("button", { name: "Buka profil dan progression" }).click();
      await page.getByRole("button", { name: "Customize" }).click();
      await page.getByRole("button", { name: "Toko", exact: true }).click();
    };
    await open();
    await page.getByRole("button", { name: "Coba Kaus Cung", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().appearanceDraft.explorer.top),
      "tshirt",
    );
    assert.equal(await page.evaluate(() => window.wardrobeFixture.balance), 1250);
    await page.getByRole("button", { name: "Beli · 80 P", exact: true }).click();
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).evaluate((el) => {
      el.click();
      el.click();
    });
    await page.getByRole("button", { name: "Pakai", exact: true }).click();
    assert.equal(await page.evaluate(() => window.wardrobeFixture.balance), 1170);
    assert.equal(
      await page.evaluate(() => window.wardrobeFixture.calls),
      1,
      "double click sends one purchase",
    );
    await page.getByRole("combobox", { name: "Kategori kosmetik" }).click();
    await page.getByRole("option", { name: "Topi & bando", exact: true }).click();
    await page.getByRole("button", { name: "Coba Bando kucing", exact: true }).click();
    await page.getByRole("button", { name: "Beli · 60 P", exact: true }).click();
    await page.evaluate(() => {
      window.wardrobeFixture.loseResponse = true;
    });
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).click();
    await page.getByRole("alert").waitFor();
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).click();
    await page.getByRole("button", { name: "Pakai", exact: true }).click();
    assert.equal(await page.evaluate(() => window.wardrobeFixture.balance), 1110);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await page.waitForFunction(
      () => window.profile.getState().profile.avatar.explorer?.headwear === "cat-band",
    );
    await page.reload();
    await page.getByRole("button", { name: "Buka profil dan progression" }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().profile.avatar.explorer.top),
      "tshirt",
      "saved appearance reloads",
    );
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("button", { name: "Toko", exact: true }).click();
    await page.getByRole("combobox", { name: "Kategori kosmetik" }).click();
    await page.getByRole("option", { name: "Atasan", exact: true }).click();
    await page.getByRole("button", { name: "Coba Hoodie", exact: true }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${output}/shop-${width}x${height}.png` });
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const grid = await page.locator(".wardrobe-grid").boundingBox();
    assert(grid.height >= 50, "catalog remains visible");
    const footer = await page.locator(".wardrobe-footer").boundingBox();
    assert(footer.y + footer.height <= height, "footer accessible");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().appearanceDraft.explorer.top),
      "explorer-jacket",
    );
    await page.getByRole("button", { name: "Batal", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().profile.avatar.explorer.top),
      "tshirt",
    );
    assert.equal(await page.evaluate(() => window.profile.getState().appearanceDraft), null);
    await page.getByRole("button", { name: "Customize" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/closet-${width}x${height}.png` });
    await page.getByRole("button", { name: "Toko", exact: true }).click();
    await page.getByRole("combobox", { name: "Kategori kosmetik" }).click();
    await page.getByRole("option", { name: "Set outfit", exact: true }).click();
    await page.getByRole("button", { name: "Coba Set Streetwear", exact: true }).click();
    await page.getByRole("button", { name: "Beli · 270 P", exact: true }).click();
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).click();
    await page.getByRole("button", { name: "Pakai", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().appearanceDraft.explorer.top),
      "hoodie",
    );
    await page.getByRole("button", { name: "Lepas", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().appearanceDraft.explorer.top),
      "tshirt",
    );
    await page.getByRole("button", { name: "Batal", exact: true }).click();
    assert(
      (await page.evaluate(() => window.wardrobeFixture.owned)).includes("hoodie"),
      "purchase survives cancel",
    );
    await page.evaluate(() => {
      window.wardrobeFixture.balance = 0;
    });
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("button", { name: "Toko", exact: true }).click();
    await page.getByRole("combobox", { name: "Kategori kosmetik" }).click();
    await page.getByRole("option", { name: "Topi & bando", exact: true }).click();
    await page.getByRole("button", { name: "Coba Mahkota mini", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Poin Tidak Cukup", exact: true }).isDisabled(),
      true,
    );
    await page.close();
  }
  const offline = await browser.newPage({ viewport: { width: 740, height: 360 }, hasTouch: true });
  await offline.addInitScript(() => {
    window.failCatalog = true;
  });
  await offline.goto("http://127.0.0.1:4221");
  await offline.getByRole("button", { name: "Buka profil dan progression" }).click();
  await offline.getByRole("button", { name: "Customize" }).click();
  await offline.getByRole("button", { name: "Toko", exact: true }).click();
  await offline.getByRole("button", { name: "Coba Kaus Cung", exact: true }).click();
  assert.equal(await offline.getByLabel("Saldo poin").textContent(), "— P");
  assert(await offline.getByRole("button", { name: "Menunggu koneksi" }).isDisabled());
  assert(await offline.getByRole("button", { name: "Simpan", exact: true }).isDisabled());
  assert.equal(await offline.locator(".wardrobe-main select:visible").count(), 0);
  await offline.getByRole("combobox", { name: "Kategori kosmetik" }).click();
  await offline.getByRole("option", { name: "Bawahan", exact: true }).waitFor();
  await offline.screenshot({ path: `${output}/custom-dropdown-740x360.png` });
  await offline.keyboard.press("Escape");
  await offline.evaluate(() => {
    window.failCatalog = false;
  });
  await offline.getByRole("button", { name: "Muat ulang" }).click();
  await offline.getByLabel("Saldo poin").filter({ hasText: "1.250 P" }).waitFor();
  assert(await offline.getByRole("button", { name: "Simpan", exact: true }).isEnabled());
  await offline.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS first garment/accessory try-buy-equip-save; response loss retry, set restore, cancel/reset and 4 landscape sizes. Browser transport mocked.",
  );
} finally {
  await browser.close();
  await server.close();
}
