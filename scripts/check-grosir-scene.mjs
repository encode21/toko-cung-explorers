// Real store/kiosk rendering with offline account data and the production camera controller.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/grosir-scene",
  hud = root + "/tests/fixtures/hud";
const output =
  process.env.GROSIR_QA_OUTPUT ||
  fileURLToPath(new URL("../../previews/kiosk-v2", import.meta.url));
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  cacheDir: root + "/.cache/grosir-scene",
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
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/grosir/client.ts" },
      { find: "@/net/useWorldChannel", replacement: hud + "/world-channel.ts" },
      { find: "@/game/core/api.functions", replacement: hud + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4238, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-angle=swiftshader"],
});
const errors = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["landscape", 858, 398],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4238/");
    await page.waitForFunction(() => window.kioskCameraState?.loaded, { timeout: 30000 });
    const baseline = await page.evaluate(() => window.kioskCameraState);
    await page.evaluate(() => window.openGrosirScene());
    await page.locator(".grosir-drawer").waitFor();
    await page.waitForTimeout(1500);
    const focused = await page.evaluate(() => window.kioskCameraState);
    assert.ok(focused.position[2] < 0.5, `${name}: camera views front of kiosk`);
    assert.ok(
      focused.screen[0] > 0 && focused.screen[0] < focused.scene.sceneWidth,
      `${name}: kiosk screen within left scene`,
    );
    assert.ok(
      focused.top[1] >= 0 && focused.feet[1] <= focused.scene.sceneHeight + 3,
      `${name}: whole kiosk above basket`,
    );
    await page.screenshot({ path: `${output}/scene-${name}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);
    const restored = await page.evaluate(() => window.kioskCameraState);
    for (let i = 0; i < 3; i++)
      assert.ok(
        Math.abs(restored.position[i] - baseline.position[i]) < 0.002,
        `${name}: restored camera position`,
      );
    assert.equal(restored.view, baseline.view);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.openGrosirScene());
    await page.waitForTimeout(100);
    const instant = await page.evaluate(() => window.kioskCameraState);
    assert.ok(
      instant.screen[0] > 0 && instant.screen[0] < instant.scene.sceneWidth,
      `${name}: reduced motion instant focus`,
    );
    await page.close();
  }
  assert.deepEqual(errors, [], "no browser errors");
  console.log(
    "Real kiosk camera: front framing, screen/feet containment, close restore, and reduced motion passed.",
  );
  console.log(output);
} finally {
  await browser.close();
  await server.close();
}
