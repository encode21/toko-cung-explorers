// Real physics, Player, mountain scenery and HUD; only backend transport is substituted.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = root + "/tests/fixtures/mountain";
const output = process.env.MOUNTAIN_QA_OUTPUT || "/tmp/tokocung-photo-waterfall-qa";
const port = Number(process.env.MOUNTAIN_QA_PORT || 4259);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: fixture,
  cacheDir: "/tmp/tokocung-mountain-vite-cache",
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  resolve: {
    alias: [
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: fixture + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  for (const [width, height] of [
    [1280, 720],
    [740, 360],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => window.mountainQA?.ready, null, { timeout: 60000 });
    await page.evaluate(() => {
      const p = window.plan.summit.position;
      window.game.getState().requestTeleport([p[0], p[1] + 0.83, p[2]]);
    });
    await page.waitForFunction(() => window.game.getState().playerPos[1] > 50);
    await page.evaluate(() => window.hud.getState().setSheet("camera"));
    await page
      .getByRole("button", { name: "Ambil foto", exact: true })
      .waitFor({ state: "visible" });
    await page.waitForFunction(() => window.photo.getState().ready);
    for (const zoom of [0.5, 2, 1]) {
      await page
        .getByRole("button", { name: `Zoom ${zoom === 0.5 ? "0,5" : zoom} kali`, exact: true })
        .click();
      await page.waitForFunction(
        (zoom) => window.photo.getState().ready && window.three.camera.zoom === zoom,
        zoom,
      );
      const b = await page
        .getByRole("button", { name: `Zoom ${zoom === 0.5 ? "0,5" : zoom} kali`, exact: true })
        .boundingBox();
      assert(
        b.width >= 44 && b.height >= 44 && b.x >= 0 && b.y + b.height <= height,
        "zoom is reachable",
      );
      if (zoom === 0.5) {
        await page.waitForTimeout(300);
        await page.screenshot({ path: output + `/summit-wide-${width}.png` });
      }
    }
    await page.getByRole("button", { name: "Kamera Belakang", exact: true }).click();
    await page.getByRole("button", { name: "Zoom 0,5 kali", exact: true }).click();
    await page.waitForFunction(
      () => window.three.camera.zoom === 0.5 && window.photo.getState().ready,
    );
    await page.getByRole("button", { name: "Ambil foto", exact: true }).click();
    await page.getByAltText("Hasil foto di Toko Cung").waitFor({ state: "visible" });
    const photo = await page.evaluate(async () => {
      const img = document.querySelector("[data-photo-frame] img");
      await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight };
    });
    assert(photo.width > 100 && photo.height > 100);
    await page.getByRole("button", { name: "Ambil ulang", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Zoom 0,5 kali" }).getAttribute("aria-pressed"),
      "true",
    );
    await page.evaluate(() => window.hud.getState().setSheet(null));
    await page.waitForFunction(
      () => window.three.camera.zoom === 1 && window.photo.getState().zoom === 1,
    );

    const sampleWater = () =>
      page.evaluate(() => ({
        time: window.three.scene.getObjectByName("WaterfallCurtain").material.uniforms.time.value,
        dropY: window.three.scene.getObjectByName("WaterfallDrops").instanceMatrix.array[13],
        scale:
          window.three.scene.getObjectByName("WaterfallRipples").children[0].children[0].scale.x,
      }));
    await page.evaluate(() => {
      window.waterfallView = true;
      window.three.camera.zoom = 0.7;
      window.three.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: output + `/waterfall-before-${width}.png` });
    const before = await sampleWater();
    await page.waitForTimeout(400);
    const after = await sampleWater();
    await page.screenshot({ path: output + `/waterfall-after-${width}.png` });
    assert(
      after.time > before.time + 0.2 &&
        after.scale !== before.scale &&
        after.dropY !== before.dropY,
      "water and foam animate",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    const reduced = await sampleWater();
    await page.waitForTimeout(200);
    assert.deepEqual(await sampleWater(), reduced, "reduced motion remains still");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    assert((await sampleWater()).time > 0, "animation resumes");
    await page.close();
    console.log(
      "PASS summit 0.5/1/2x selfie/rear, capture, retake and close restoration; animated water/foam",
      width,
      height,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
