// Run against the isolated fixture: node scripts/serve-warung-preview.mjs
// WARUNG_PREVIEW_URL and PLAYWRIGHT_MODULE may override the server and module.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(
  playwrightModule?.startsWith("/")
    ? pathToFileURL(playwrightModule).href
    : playwrightModule || "playwright"
);
const url = new URL(process.env.WARUNG_PREVIEW_URL || "http://127.0.0.1:4224/");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Use the local fixture only");
url.searchParams.set("state", "decor-placement");
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const expected = [
  ["floor-catur", ["2f3134", "f4f4f2"]],
  ["floor-kayu", ["b07a4c", "c48d5c"]],
  ["floor-kotak", ["e9dcc4", "f6efe1"]],
];
const results = [];

async function renderedState(page) {
  return page.evaluate(() => {
    const { roots, three, store, client } = window.__floorRegression;
    const canvas = document.querySelector("[data-decor-preview] canvas");
    const state = roots.get(canvas).store.getState();
    const colors = [];
    state.scene.getObjectByName("WarungEmptyFloorShell").traverse((mesh) => {
      if (!mesh.isInstancedMesh) return;
      const matrix = new three.Matrix4();
      const color = new three.Color();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        // The 120 floor tiles have a distinct thin profile and ground height.
        if (
          Math.abs(matrix.elements[13] - 0.012) > 0.00001 ||
          Math.abs(matrix.elements[5] - 0.024) > 0.00001
        )
          continue;
        mesh.getColorAt(i, color);
        colors.push(color.getHexString());
      }
    });
    const warung = store.getState().data.warung;
    return {
      frame: state.gl.info.render.frame,
      colors: Object.fromEntries(
        [...new Set(colors)].map((color) => [
          color,
          colors.filter((value) => value === color).length,
        ]),
      ),
      style: warung.style,
      cash: warung.cash,
      mutations: client.requests.filter((request) => String(request.action).startsWith("decor_")),
    };
  });
}

async function canvasHash(page) {
  const png = await page.locator("[data-decor-preview] canvas").screenshot();
  return createHash("sha256").update(png).digest("hex");
}

try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["landscape", 844, 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url.href);
    await page.locator("[data-decor-preview] canvas").waitFor();
    await page.evaluate(async () => {
      // Reuse Vite's loaded URLs so HMR does not create a second store instance.
      const resources = performance.getEntriesByType("resource").map((entry) => entry.name);
      const find = (predicate) => {
        const value = resources.find(predicate);
        if (!value) throw new Error("Fixture module was not loaded");
        return value;
      };
      const fiber = await import(find((value) => value.includes("@react-three_fiber.js")));
      const three = await import(find((value) => /\/three.js\?/.test(value)));
      const store = await import(find((value) => value.includes("/src/game/warung/store.ts")));
      const client = await import(
        find((value) => /\/client.ts(?:\?|$)/.test(value) && !value.includes("/src/"))
      );
      window.__floorRegression = { roots: fiber._roots, three, store: store.useWarung, client };
    });
    await page
      .locator(".warung-decor-categories")
      .getByRole("button", { name: "Lantai", exact: true })
      .click();
    await page.waitForFunction(() => {
      const canvas = document.querySelector("[data-decor-preview] canvas");
      return window.__floorRegression.roots
        .get(canvas)
        ?.store.getState()
        .scene.getObjectByName("WarungEmptyFloorShell");
    });
    // Let the category camera settle before testing color-only updates.
    await page.waitForTimeout(300);
    const initial = await renderedState(page);
    let previous = initial;
    let previousHash = await canvasHash(page);
    for (const [id, palette] of expected) {
      const label = await page.evaluate(
        (id) =>
          window.__floorRegression.store.getState().data.decor.find((item) => item.id === id).name,
        id,
      );
      await page
        .locator(".warung-decor-item")
        .filter({ has: page.getByText(label, { exact: true }) })
        .click();
      // No camera interaction or explicit invalidate: selection must redraw itself.
      await page.waitForFunction(
        (frame) => {
          const canvas = document.querySelector("[data-decor-preview] canvas");
          return (
            window.__floorRegression.roots.get(canvas).store.getState().gl.info.render.frame > frame
          );
        },
        previous.frame,
        { timeout: 5000 },
      );
      const current = await renderedState(page);
      const hash = await canvasHash(page);
      assert.deepEqual(
        current.colors,
        Object.fromEntries(palette.map((color) => [color, 60])),
        `${name}: ${id} floor colors`,
      );
      assert.notEqual(hash, previousHash, `${name}: ${id} must visibly update the canvas`);
      assert.deepEqual(current.style, initial.style, `${name}: preview must not equip or buy`);
      assert.equal(current.cash, initial.cash, `${name}: preview must not charge cash`);
      assert.deepEqual(current.mutations, [], `${name}: preview must not send a decor mutation`);
      previous = current;
      previousHash = hash;
    }
    assert.deepEqual(errors, [], `${name}: no browser errors`);
    results.push(`${name}: catur → kayu → kotak rendered without camera input or purchases`);
    await page.close();
  }
  console.log(`Warung decor preview passed:\n${results.join("\n")}`);
} finally {
  await browser.close();
}
