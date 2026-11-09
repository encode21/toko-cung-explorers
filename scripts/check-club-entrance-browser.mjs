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
const output = "/tmp/toko-club-entrance-qa";
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
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4220, strictPort: true, fs: { allow: [root] } },
  optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-runtime"] },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
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
    await page.goto("http://127.0.0.1:4220");
    await page.waitForFunction(
      () =>
        window.editor?.getState().loaded &&
        window.club?.getState().inside &&
        window.game.getState().playerPos[1] < -12,
    );
    const targets = await page.evaluate(() => window.editor.getState().targets);
    assert.deepEqual(targets.find((t) => t.id === "club_entrance").position, {
      x: 22,
      y: 0,
      z: 30.6,
    });
    await page.evaluate(() => window.cmd("exit"));
    await page.waitForFunction(
      () => !window.club.getState().inside && window.game.getState().playerPos[1] > 0,
    );
    const teleport = async (x, y, z) => {
      // Drop onto the requested point so outdoor walkable snapping cannot move the probe.
      await page.evaluate(
        (p) => window.game.setState({ pendingTeleport: p }),
        [x, y > 0 ? y + 2 : y, z],
      );
      await page.waitForFunction(
        ([x, y, z]) => {
          const p = window.game.getState().playerPos;
          return Math.hypot(p[0] - x, p[1] - y, p[2] - z) < 0.3;
        },
        [x, y, z],
      );
      await page.waitForTimeout(300);
    };
    await teleport(10.4, 0.83, 3.8);
    assert.notEqual(await page.evaluate(() => window.game.getState().nearby?.kind), "door");
    await page.keyboard.press("f");
    assert.equal(await page.evaluate(() => window.club.getState().inside), false);
    const doors = await page.evaluate(() => {
      const doors = [];
      window.three.scene.traverse((object) => {
        if (object.name === "club-entry-door") {
          const p = object.position.clone();
          object.getWorldPosition(p);
          doors.push(p.toArray());
        }
      });
      return doors;
    });
    assert.equal(doors.length, 1);
    assert(Math.abs(doors[0][0] - 22) < 0.01 && Math.abs(doors[0][2] - 30.55) < 0.01);
    await teleport(22, 0.83, 28.6);
    await page.waitForFunction(() => window.game.getState().nearby?.id === "club_entrance");
    await page.screenshot({ path: output + `/new-entrance-${width}.png` });
    if (width < 1000)
      await page
        .getByRole("button", { name: "Buka pintu · Masuk Cung Underground", exact: true })
        .tap();
    else await page.keyboard.press("f");
    await page.waitForFunction(
      () =>
        window.club.getState().inside &&
        !window.club.getState().outdoor &&
        window.game.getState().playerPos[1] < -12,
    );
    await teleport(0, -13.17, 8.2);
    await page.waitForFunction(() => window.game.getState().nearby?.id === "club_exit");
    if (width < 1000)
      await page.getByRole("button", { name: "Buka pintu · Keluar ke kota", exact: true }).tap();
    else await page.keyboard.press("f");
    await page.waitForFunction(
      () => !window.club.getState().inside && window.game.getState().playerPos[1] > 0,
    );
    const p = await page.evaluate(() => window.game.getState().playerPos);
    assert(Math.hypot(p[0] - 22, p[2] - 28.6) < 1, "exit returns outside the new facade");
    await page.close();
    console.log(
      "PASS legacy server entrance: old door removed, new entrance and exit work",
      width,
      height,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
