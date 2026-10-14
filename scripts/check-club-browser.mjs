// Optional browser harness: install Playwright separately or set PLAYWRIGHT_MODULE.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/club";
await mkdir(root + "/docs/qa/club", { recursive: true });
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
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4219, strictPort: true, fs: { allow: [root] } },
  optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-runtime"] },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.config.server.port}/`);
  await page.getByRole("button", { name: "✦ Dance", exact: true }).waitFor({ timeout: 45000 });
  await page.waitForFunction(() => window.game.getState().playerPos[1] < -12);
  await page.waitForTimeout(1500);
  const pos = await page.evaluate(() => window.game.getState().playerPos);
  assert(pos[1] > -14 && pos[1] < -12, JSON.stringify(pos));
  await page.getByRole("button", { name: "✦ Dance", exact: true }).click();
  await page.getByRole("button", { name: "bounce", exact: true }).click();
  await page.waitForFunction(
    () => window.club.getState().data.members[window.playerId]?.dance?.id === "bounce",
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(600);
  await page.keyboard.up("w");
  await page.waitForFunction(
    () => window.club.getState().data.members[window.playerId]?.dance === null,
  );
  await page.getByRole("button", { name: "✦ Dance", exact: true }).click();
  await page.getByRole("button", { name: "Sync · Budi · disco", exact: true }).click();
  await page.waitForFunction(
    () => window.club.getState().data.members[window.playerId]?.dance?.groupId === "bob",
  );
  await page.screenshot({ path: root + "/docs/qa/club/desktop.png" });
  await page.evaluate(() => window.game.setState({ pendingTeleport: [0, -13.17, -5] }));
  await page.waitForFunction(() => window.game.getState().playerPos[2] < -4);
  await page.getByRole("button", { name: "♫ Now Playing", exact: true }).click();
  await page.getByRole("button", { name: "Apply DJ · Join waiting queue", exact: true }).click();
  await page.getByRole("heading", { name: "DJ Console", exact: true }).waitFor();
  await page.getByRole("button", { name: "Request", exact: true }).click();
  await page.getByRole("button", { name: "Accept Cung Night", exact: true }).click();
  await page.getByRole("button", { name: "play", exact: true }).click();
  await page.waitForFunction(() => window.club.getState().data.playbackStatus === "playing");
  await page.getByRole("combobox", { name: "Lighting", exact: false }).click();
  await page.getByRole("option", { name: "ocean", exact: true }).click();
  await page.screenshot({ path: root + "/docs/qa/club/console.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: root + "/docs/qa/club/mobile-console.png" });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    "horizontal overflow",
  );
  await page.getByRole("button", { name: "Close club panel", exact: true }).click();
  await page.getByRole("button", { name: "✦ Dance", exact: true }).click();
  await page.screenshot({ path: root + "/docs/qa/club/mobile-wheel.png" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log(
    JSON.stringify({
      errors,
      position: pos,
      drawCalls: await page.evaluate(() => window.three.gl.info.render.calls),
    }),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual Player physics/movement, dance cancel, group sync, DJ UI, requests, mock playback, lighting, desktop/mobile layout. API fixture; no live multiplayer.",
  );
} finally {
  await browser.close();
  await server.close();
}
