// Offline integration test of the actual HUD, queue, drawer, basket and payment actions.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/grosir";
const hud = root + "/tests/fixtures/hud";
const output =
  process.env.GROSIR_QA_OUTPUT || fileURLToPath(new URL("../../previews/kiosk", import.meta.url));
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  cacheDir: root + "/.cache/grosir-qa",
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/aiApi/npc.functions", replacement: hud + "/npc-api.ts" },
      { find: "@tanstack/react-start", replacement: hud + "/server-fn.ts" },
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/net/useWorldChannel", replacement: hud + "/world-channel.ts" },
      { find: "@/game/core/api.functions", replacement: hud + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4237, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const results = [];
try {
  for (const [name, browserWidth, browserHeight, worldWidth, worldHeight] of [
    ["desktop", 1440, 900],
    ["reference", 858, 398],
    ["landscape", 740, 360],
    ["compact-world", 1280, 800, 858, 398],
    ["portrait", 390, 844],
  ]) {
    const width = worldWidth ?? browserWidth;
    const height = worldHeight ?? browserHeight;
    const page = await browser.newPage({
      viewport: { width: browserWidth, height: browserHeight },
      hasTouch: name === "landscape" || name === "reference",
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4237/");
    await page.waitForFunction(() => typeof window.openGrosir === "function");
    if (worldWidth) {
      await page.evaluate(
        ({ width, height }) => {
          const world = document.querySelector(".world-viewport");
          world.style.setProperty("--world-width", `${width}px`);
          world.style.setProperty("--world-height", `${height}px`);
          world.dataset.compact = "true";
        },
        { width, height },
      );
    }
    await page.evaluate(() => window.openGrosir());
    const drawer = page.locator(".grosir-drawer");
    await drawer.waitFor();
    await drawer.evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    );
    const box = await drawer.boundingBox();
    assert.ok(box && Math.abs(box.x + box.width - width) < 2, `${name}: drawer right aligned`);
    assert.ok(
      box.y >= -1 && box.y + box.height <= height + 1,
      `${name}: drawer contained vertically`,
    );
    assert.ok(
      width > 600 ? box.width < width : Math.abs(box.width - width) < 2,
      `${name}: drawer responsive width`,
    );
    assert.equal(
      await page.locator("[data-gameplay-hud]").evaluate((el) => getComputedStyle(el).display),
      "none",
      `${name}: HUD hidden`,
    );
    assert.ok(
      await page.evaluate(() => window.gameUi.getState().panels > 0),
      `${name}: movement blocked`,
    );
    assert.equal(
      await page
        .locator(
          ".mmo-side-button:visible, .mmo-player-cluster:visible, .mmo-touch-controls:visible",
        )
        .count(),
      0,
      `${name}: HUD menus hidden`,
    );
    await page.waitForFunction(() => !window.warung.getState().busy);
    const multiplier = drawer.locator(".grosir-multiplier");
    const setQuantity = async (quantity) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (
          (await multiplier.getAttribute("aria-label")).startsWith(`Jumlah per ketuk: ${quantity}.`)
        )
          return;
        await multiplier.click();
      }
      assert.fail(`Could not select multiplier ${quantity}`);
    };
    const products = drawer.getByRole("group", { name: "Pilih produk grosir" });
    const add = drawer.locator(".grosir-add");
    await products.getByRole("button", { name: "Kopi sachet", exact: true }).click();
    assert.deepEqual(
      await page.evaluate(() => window.warung.getState().basket),
      [],
      `${name}: selecting product does not add`,
    );
    await products.getByRole("button", { name: "Mi instan", exact: true }).click();
    let expected = 0;
    for (const quantity of [2, 3, 4, 5]) {
      await multiplier.click();
      assert.ok(
        (await multiplier.getAttribute("aria-label")).startsWith(`Jumlah per ketuk: ${quantity}.`),
        `${name}: multiplier cycles to ${quantity}`,
      );
      await add.click();
      expected += quantity;
      assert.equal(
        await page.evaluate(
          () => window.warung.getState().basket.find((item) => item.itemId === "mi-instan")?.qty,
        ),
        expected,
        `${name}: add ${quantity} at once`,
      );
    }
    await multiplier.click();
    assert.ok(
      (await multiplier.getAttribute("aria-label")).startsWith("Jumlah per ketuk: 1."),
      `${name}: multiplier wraps from 5 to 1`,
    );
    assert.equal(await multiplier.count(), 1, `${name}: only one multiplier control`);
    // All essential controls fit the visible short-landscape layout without scrolling.
    for (const selector of [
      ".grosir-multiplier",
      ".grosir-add",
      ".grosir-catalog",

      "[data-game-close]",
    ]) {
      const bounds = await drawer.locator(selector).boundingBox();
      assert.ok(
        bounds &&
          bounds.x >= box.x - 1 &&
          bounds.x + bounds.width <= width + 1 &&
          bounds.y >= -1 &&
          bounds.y + bounds.height <= height + 1,
        `${name}: visible ${selector}: ${JSON.stringify(bounds)}`,
      );
    }
    assert.equal(
      await page.locator(".grosir-basket-bar").count(),
      0,
      `${name}: old right basket bar removed`,
    );
    const worldBasket = drawer.locator(".grosir-world-basket");
    const basketBounds = await worldBasket.boundingBox();
    assert.ok(
      basketBounds &&
        basketBounds.x >= -1 &&
        basketBounds.y >= -1 &&
        basketBounds.x + basketBounds.width <= width + 1 &&
        basketBounds.y + basketBounds.height <= height + 1,
      `${name}: basket fits world viewport: ${JSON.stringify(basketBounds)}`,
    );
    if (width > 600) {
      assert.ok(
        basketBounds.x + basketBounds.width <= box.x + 1,
        `${name}: basket in world area left of drawer`,
      );
      assert.ok(basketBounds.y > height / 2, `${name}: basket anchored near bottom`);
    }
    for (const selector of [
      ".grosir-add",
      ".grosir-multiplier",
      ".grosir-world-basket button",
      "[data-game-close]",
    ]) {
      const uncovered = await drawer.locator(selector).evaluateAll((elements) =>
        elements.every((el) => {
          const rect = el.getBoundingClientRect();
          return [
            [0.1, 0.5],
            [0.5, 0.5],
            [0.9, 0.5],
          ].every(([x, y]) =>
            el.contains(
              document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y),
            ),
          );
        }),
      );
      assert.ok(uncovered, `${name}: ${selector} hit targets are not clipped or covered`);
    }
    assert.equal(
      await products.evaluate((el) => getComputedStyle(el).scrollbarWidth),
      "none",
      `${name}: product scrollbar hidden`,
    );
    await products.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await products.getByRole("button").first().focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await products
        .getByRole("button")
        .nth(1)
        .evaluate((el) => document.activeElement === el),
      true,
      `${name}: keyboard moves product focus`,
    );
    await page.keyboard.press("End");
    await page.waitForFunction(
      () => document.querySelector(".grosir-product-strip").scrollLeft > 0,
    );
    await products.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await products.hover();
    await page.mouse.wheel(120, 0);
    await page.waitForFunction(
      () => document.querySelector(".grosir-product-strip").scrollLeft > 0,
    );
    await products.getByRole("button", { name: "Mi instan", exact: true }).click();
    const basketButton = drawer.getByRole("button", { name: "Keranjang", exact: true });
    await basketButton.focus();
    assert.equal(
      await basketButton.evaluate((el) => document.activeElement === el),
      true,
      `${name}: external basket remains in dialog focus scope`,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await drawer.evaluate((el) => el.contains(document.activeElement)),
      true,
      `${name}: keyboard focus stays in dialog`,
    );
    await page.screenshot({ path: `${output}/${name}.png` });
    await products.getByRole("button", { name: "Beras", exact: true }).click();
    await drawer.getByRole("button", { name: "Keranjang", exact: true }).click();
    await drawer.getByRole("button", { name: "Pilih barang", exact: true }).click();
    const selectedOption = products.getByRole("button", { name: "Beras", exact: true });
    await page.waitForFunction(() => {
      const strip = document.querySelector(".grosir-product-strip");
      const selected = strip?.querySelector('[aria-pressed="true"]');
      if (!strip || !selected) return false;
      const a = strip.getBoundingClientRect();
      const b = selected.getBoundingClientRect();
      return b.x >= a.x - 1 && b.right <= a.right + 1;
    });
    assert.equal(
      await selectedOption.getAttribute("aria-pressed"),
      "true",
      `${name}: return keeps selected thumbnail visible`,
    );
    await drawer.getByRole("button", { name: "Keranjang", exact: true }).click();
    await drawer
      .getByRole("button", { name: "Hapus Mi instan dari keranjang", exact: true })
      .click();
    assert.deepEqual(
      await page.evaluate(() => window.warung.getState().basket),
      [],
      `${name}: remove product`,
    );
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(() => window.kioskQueue.getState().since),
      null,
      `${name}: close frees kiosk`,
    );
    assert.equal(
      await page.evaluate(() => window.gameUi.getState().panels),
      0,
      `${name}: close releases movement lock`,
    );
    assert.equal(
      await page.locator("[data-gameplay-hud]").evaluate((el) => getComputedStyle(el).display),
      "contents",
      `${name}: HUD restored`,
    );
    results.push(
      `${name}: right drawer, left basket, unclipped controls, hidden product scrollbar, focus scope, cyclic multiplier, basket removal and HUD restoration`,
    );
    if (name === "desktop") {
      const reopen = async (state = "empty") => {
        await page.evaluate((state) => {
          window.resetGrosir(state);
          window.openGrosir();
        }, state);
        await drawer.waitFor();
        await page.waitForFunction(() => !window.warung.getState().busy);
      };
      await reopen();
      await page.evaluate(() => {
        const data = structuredClone(window.warung.getState().data);
        data.warung.stock.find((item) => item.itemId === "mi-instan").qty = 19;
        window.warung.setState({ data });
      });
      await setQuantity(2);
      assert.equal(await add.isDisabled(), true, "Stock capacity blocks additions");
      await setQuantity(1);
      assert.equal(await add.isEnabled(), true, "Exact available capacity allowed");
      await page.evaluate(() => {
        const data = structuredClone(window.warung.getState().data);
        data.warung.cash = 0;
        window.warung.setState({ data });
      });
      assert.equal(await add.isDisabled(), true, "Insufficient cash blocks additions");
      await page.evaluate(() => {
        const data = structuredClone(window.warung.getState().data);
        data.warung.cash = 100000;
        data.catalog.find((item) => item.id === "mi-instan").level = 2;
        window.warung.setState({ data });
      });
      assert.equal(await add.isDisabled(), true, "Locked item blocks additions");
      await page.keyboard.press("Escape");
      await reopen();
      await page.evaluate(() =>
        window.net.setState({
          roster: [{ id: "ahead", name: "Budi", kioskSince: Date.now() - 1000 }],
        }),
      );
      await drawer.getByRole("heading", { name: "Antrean ke-2" }).waitFor();
      assert.equal(await add.count(), 0, "Cannot order while waiting");
      await drawer.getByRole("button", { name: "Keluar antrean" }).click();
      assert.equal(
        await page.evaluate(() => window.kioskQueue.getState().since),
        null,
        "Cancel queue frees kiosk",
      );
      await reopen();
      await add.click();
      await drawer.getByRole("button", { name: "Keranjang", exact: true }).click();
      await drawer.getByRole("button", { name: "Lanjut bayar", exact: true }).click();
      await drawer.getByRole("button", { name: /^Bawa sendiri/ }).click();
      await drawer.waitFor({ state: "hidden" });
      assert.deepEqual(
        await page.evaluate(() => window.warung.getState().basket),
        [],
        "Successful checkout clears basket",
      );
      assert.equal(
        await page.evaluate(() => window.warung.getState().data.shipments[0]?.mode),
        "ambil",
        "Pickup creates shipment",
      );
      assert.equal(
        await page.evaluate(() => window.kioskQueue.getState().since),
        null,
        "Successful checkout frees kiosk",
      );
      await reopen("tokocung-retry");
      await add.click();
      await drawer.getByRole("button", { name: "Keranjang", exact: true }).click();
      await drawer.getByRole("button", { name: "Lanjut bayar", exact: true }).click();
      await drawer.getByRole("button", { name: /^Antar ·/ }).click();
      await drawer.getByRole("alert").waitFor();
      assert.ok(
        (await page.evaluate(() => window.warung.getState().basket)).length > 0,
        "Failed payment preserves basket",
      );
      assert.ok(
        await page.evaluate(() => window.kioskQueue.getState().since !== null),
        "Failed payment preserves queue",
      );
      await drawer.getByRole("button", { name: "Lanjut bayar", exact: true }).click();
      await drawer.getByRole("button", { name: /^Antar ·/ }).click();
      await drawer.waitFor({ state: "hidden" });
      assert.equal(
        await page.evaluate(() => window.warung.getState().data.shipments.length),
        1,
        "Retry creates single shipment",
      );
      await reopen();
      await add.click();
      await drawer.getByRole("button", { name: "Keranjang", exact: true }).click();
      await drawer.getByRole("button", { name: "Lanjut bayar", exact: true }).click();
      await page.evaluate(() => {
        window.grosirCheckoutDelay = 1000;
      });
      await drawer.getByRole("button", { name: /^Bawa sendiri/ }).click();
      assert.equal(
        await page.evaluate(() => window.warung.getState().busy),
        true,
        "Delayed checkout active",
      );
      await drawer.getByRole("button", { name: "Tutup Grosir Toko Cung", exact: true }).click();
      await drawer.waitFor({ state: "hidden" });
      await page.evaluate(() => window.openGrosir());
      await drawer.waitFor();
      await page.waitForFunction(() => !window.warung.getState().busy);
      assert.equal(
        await page.evaluate(() => window.hud.getState().sheet),
        "grosir",
        "Old checkout does not close reopened drawer",
      );
      assert.ok(
        await page.evaluate(() => window.kioskQueue.getState().since !== null),
        "Old checkout does not release new queue place",
      );
      await page.evaluate(() => {
        window.grosirCheckoutDelay = 0;
      });
      await page.keyboard.press("Escape");
      results.push(
        "Stock, cash and level limits; queue cancellation; pickup checkout; delivery failure and retry; delayed checkout close/reopen isolation",
      );
    }
    await page.close();
  }
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(JSON.stringify({ passed: results, screenshots: output }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
