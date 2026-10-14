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
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    await page.goto("http://127.0.0.1:4221");
    const open = async () => {
      await page.getByRole("button", { name: "Buka profil dan progression" }).click();
      await page.getByRole("button", { name: "Penampilan", exact: true }).click();
      await page.getByRole("button", { name: "Toko", exact: true }).click();
    };
    await open();
    const topTabs = page.getByRole("navigation", { name: "Kustomisasi", exact: true });
    const buy = page.getByRole("button", { name: "Beli", exact: true });
    assert(await buy.isDisabled(), "buy requires an item selection");
    assert.equal(await buy.locator("svg").count(), 1, "buy uses the Point coin icon");
    assert.equal(await page.getByRole("button", { name: "Simpan", exact: true }).count(), 0);
    assert.deepEqual(await topTabs.getByRole("button").allTextContents(), ["Sesuaikan", "Toko"]);
    const wallet = page.locator("[data-appearance-point]");
    assert.equal(await wallet.getAttribute("aria-label"), "1.250 Point");
    const walletBounds = await wallet.boundingBox();
    const shopTabBounds = await topTabs
      .getByRole("button", { name: "Toko", exact: true })
      .boundingBox();
    assert(
      walletBounds.x >= shopTabBounds.x + shopTabBounds.width,
      "Point sits beside the shop tab",
    );
    const sideTabs = page.getByRole("navigation", { name: "Bagian penampilan", exact: true });
    assert.deepEqual(await sideTabs.getByRole("button").allTextContents(), ["", "", ""]);
    assert.deepEqual(
      await sideTabs
        .getByRole("button")
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label"))),
      ["Penampilan", "Lemari", "Emote"],
    );
    await sideTabs.getByRole("button", { name: "Penampilan", exact: true }).click();
    const swatch = await page.locator(".wardrobe-colors button").first().boundingBox();
    assert(
      Math.abs(swatch.width - swatch.height) < 1 && swatch.width <= 30,
      "compact swatches remain circular",
    );
    const beforeEmote = await page.evaluate(() => window.profile.getState().appearanceDraft);
    await sideTabs.getByRole("button", { name: "Emote", exact: true }).click();
    await page.getByRole("button", { name: "Duduk", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Duduk", exact: true }).getAttribute("aria-pressed"),
      "true",
    );
    assert.deepEqual(
      await page.evaluate(() => window.profile.getState().appearanceDraft),
      beforeEmote,
      "previewing an emote does not change appearance data",
    );
    await page.getByRole("button", { name: "Duduk", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Duduk", exact: true }).getAttribute("aria-pressed"),
      "false",
    );
    await topTabs.getByRole("button", { name: "Toko", exact: true }).click();
    assert.equal(
      await page.getByRole("textbox", { name: "Cari kosmetik" }).count(),
      0,
      "shop has no search field",
    );
    assert.equal(
      await page.getByRole("combobox", { name: "Filter kepemilikan" }).count(),
      0,
      "shop has no ownership filter",
    );
    await sideTabs.getByRole("button", { name: "Lemari", exact: true }).click();
    assert.equal(
      await page.getByRole("textbox", { name: "Cari kosmetik" }).count(),
      0,
      "closet has no search field",
    );
    assert.equal(
      await page.getByRole("combobox", { name: "Filter kepemilikan" }).count(),
      0,
      "closet has no ownership filter",
    );
    assert((await page.locator(".appearance-item").count()) > 0, "closet shows owned items");
    const thumbnail = await page.locator(".appearance-item img").first().boundingBox();
    const itemCard = await page.locator(".appearance-item").first().boundingBox();
    assert.equal(thumbnail.width, thumbnail.height, "item thumbnails remain circular");
    assert(itemCard.height > thumbnail.height, "item labels have room below the thumbnail");
    await topTabs.getByRole("button", { name: "Toko", exact: true }).click();
    const starter = page.getByRole("button", { name: "Coba Jaket Explorer", exact: true });
    await starter.click();
    assert(await starter.locator(".appearance-owned-ribbon").isVisible());
    assert(await buy.isDisabled(), "owned starter items cannot be purchased");
    const tshirt = page.getByRole("button", { name: "Coba Kaus Cung", exact: true });
    assert.equal(
      await tshirt.locator(".appearance-point-price svg").count(),
      1,
      "item prices use the Point coin icon",
    );
    assert.equal((await tshirt.locator(".appearance-point-price").innerText()).trim(), "80");
    assert.equal(await tshirt.locator(".appearance-owned-ribbon").count(), 0);
    await tshirt.click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().appearanceDraft.explorer.top),
      "tshirt",
    );
    assert.equal(await page.evaluate(() => window.wardrobeFixture.balance), 1250);
    await buy.click();
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).evaluate((el) => {
      el.click();
      el.click();
    });
    await tshirt.locator(".appearance-owned-ribbon").waitFor();
    assert(await buy.isDisabled(), "successful purchase prevents buying the owned item again");
    await page.getByRole("button", { name: "Pakai", exact: true }).click();
    assert.equal(await page.evaluate(() => window.wardrobeFixture.balance), 1170);
    assert.equal(
      await wallet.getAttribute("aria-label"),
      "1.170 Point",
      "header follows the confirmed purchase balance",
    );
    assert.equal(
      await page.evaluate(() => window.wardrobeFixture.calls),
      1,
      "double click sends one purchase",
    );
    await page.getByRole("button", { name: "Topi & bando", exact: true }).click();
    await page.getByRole("button", { name: "Coba Bando kucing", exact: true }).click();
    await buy.click();
    await page.evaluate(() => {
      window.wardrobeFixture.loseResponse = true;
    });
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).click();
    await page.getByRole("alert").waitFor();
    await page.getByRole("button", { name: "Konfirmasi beli", exact: true }).click();
    await page.getByRole("button", { name: "Pakai", exact: true }).click();
    assert.equal(await page.evaluate(() => window.wardrobeFixture.balance), 1110);
    await topTabs.getByRole("button", { name: "Sesuaikan", exact: true }).click();
    assert.equal(await buy.count(), 0, "customize keeps Save instead of Buy");
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
    await page.getByRole("button", { name: "Penampilan", exact: true }).click();
    await page.getByRole("button", { name: "Toko", exact: true }).click();
    await page.getByRole("button", { name: "Atasan", exact: true }).click();
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
    const footer = await page.locator(".appearance-footer").boundingBox();
    assert(footer.y + footer.height <= height, "footer accessible");
    const trialBeforeReset = await page.evaluate(() => window.profile.getState().appearanceDraft);
    const savedBeforeReset = await page.evaluate(() => window.profile.getState().profile.avatar);
    await page.getByRole("button", { name: "Reset penampilan", exact: true }).click();
    assert.deepEqual(
      await page.evaluate(() => window.profile.getState().appearanceDraft),
      trialBeforeReset,
      "opening reset does not change the draft",
    );
    await page.getByRole("button", { name: "Tidak", exact: true }).click();
    assert.deepEqual(
      await page.evaluate(() => window.profile.getState().appearanceDraft),
      trialBeforeReset,
      "declining reset preserves the draft",
    );
    await page.getByRole("button", { name: "Reset penampilan", exact: true }).click();
    await page.getByRole("button", { name: "Iya", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().appearanceDraft.explorer.top),
      "tshirt",
      "confirmed reset restores the last saved outfit",
    );
    assert.deepEqual(
      await page.evaluate(() => window.profile.getState().profile.avatar),
      savedBeforeReset,
      "reset does not save or mutate the profile",
    );
    await page.getByRole("button", { name: "Kembali ke profil", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.profile.getState().profile.avatar.explorer.top),
      "tshirt",
    );
    assert.equal(await page.evaluate(() => window.profile.getState().appearanceDraft), null);
    await page.getByRole("button", { name: "Penampilan", exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/closet-${width}x${height}.png` });
    await page.getByRole("button", { name: "Toko", exact: true }).click();
    await page.getByRole("button", { name: "Set outfit", exact: true }).click();
    await page.getByRole("button", { name: "Coba Set Streetwear", exact: true }).click();
    await buy.click();
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
    await page.getByRole("button", { name: "Kembali ke profil", exact: true }).click();
    assert(
      (await page.evaluate(() => window.wardrobeFixture.owned)).includes("hoodie"),
      "purchase survives cancel",
    );
    await page.evaluate(() => {
      window.wardrobeFixture.balance = 0;
    });
    await page.getByRole("button", { name: "Penampilan", exact: true }).click();
    await page.getByRole("button", { name: "Toko", exact: true }).click();
    await page.getByRole("button", { name: "Topi & bando", exact: true }).click();
    await page.getByRole("button", { name: "Coba Mahkota mini", exact: true }).click();
    assert(await buy.isDisabled(), "insufficient balance disables the shop purchase button");
    await page.close();
  }
  const offline = await browser.newPage({ viewport: { width: 740, height: 360 }, hasTouch: true });
  await offline.addInitScript(() => {
    window.failCatalog = true;
  });
  await offline.goto("http://127.0.0.1:4221");
  await offline.getByRole("button", { name: "Buka profil dan progression" }).click();
  await offline.getByRole("button", { name: "Penampilan", exact: true }).click();
  await offline.getByRole("button", { name: "Toko", exact: true }).click();
  await offline.getByRole("button", { name: "Coba Kaus Cung", exact: true }).click();
  assert.equal(
    await offline.locator("[data-appearance-point]").getAttribute("aria-label"),
    "1.250 Point",
    "known game balance stays visible when catalog loading fails",
  );
  assert(await offline.getByRole("button", { name: "Beli", exact: true }).isDisabled());
  await offline.getByRole("button", { name: "Sesuaikan", exact: true }).click();
  assert(await offline.getByRole("button", { name: "Simpan", exact: true }).isDisabled());
  await offline.getByRole("button", { name: "Toko", exact: true }).click();
  await offline.getByRole("button", { name: "Bawahan", exact: true }).click();
  await offline.screenshot({ path: `${output}/category-tabs-740x360.png` });
  await offline.evaluate(() => {
    window.failCatalog = false;
  });
  await offline.getByRole("button", { name: "Muat ulang" }).click();
  await offline.getByRole("button", { name: "Coba Cargo", exact: true }).click();
  assert(await offline.getByRole("button", { name: "Beli", exact: true }).isEnabled());
  await offline.getByRole("button", { name: "Sesuaikan", exact: true }).click();
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
