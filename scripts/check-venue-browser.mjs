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
const output = "/tmp/toko-venue-qa";
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
  server: { host: "127.0.0.1", port: 4219, strictPort: true, fs: { allow: [root] } },
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
  for (const [width, height] of process.env.VENUE_QA_MOBILE
    ? [[740, 360]]
    : [
        [1280, 720],
        [740, 360],
      ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    await page.goto("http://127.0.0.1:4219");
    await page.waitForFunction(
      () => window.club?.getState().inside && window.game.getState().playerPos[1] < -12,
    );
    const teleport = async (x, z, y = -13.17) => {
      await page.evaluate(
        ([x, z, y]) => window.game.setState({ pendingTeleport: [x, y, z] }),
        [x, z, y],
      );
      await page.waitForFunction(
        ([x, z]) => {
          const p = window.game.getState().playerPos;
          return Math.abs(p[0] - x) < 1 && Math.abs(p[2] - z) < 1;
        },
        [x, z],
      );
    };
    const turnAround = async (direction) => {
      await page.evaluate(async (direction) => {
        for (let i = 0; i < 16; i++) {
          window.look.getState().addLook((direction * Math.PI) / 0.0055 / 16, 0);
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        }
      }, direction);
    };
    const clickMesh = async (name) => {
      if (name === "club-exit-door") await turnAround(1);
      await page.waitForTimeout(700);
      const point = await page.evaluate((name) => {
        const object = window.three.scene.getObjectByName(name);
        if (!object) throw new Error("Missing clickable object: " + name);
        const v = object.position.clone();
        object.getWorldPosition(v);
        if (name.includes("door")) v.y += 0.9;
        if (name.startsWith("vendor") && innerWidth < 1000) v.y += 1.65;
        v.project(window.three.camera);
        return { x: ((v.x + 1) * innerWidth) / 2, y: ((1 - v.y) * innerHeight) / 2 };
      }, name);
      assert(
        point.x >= 0 && point.x < width && point.y >= 0 && point.y < height,
        "clickable mesh in camera view: " + name + JSON.stringify(point),
      );
      if (width < 1000) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      if (name === "club-exit-door") await turnAround(-1);
    };
    assert.equal(
      await page.locator("[data-club-actions]").count(),
      0,
      "no avatar-obscuring action toolbar",
    );
    assert.equal(
      await page.getByRole("button", { name: /Masuk arena konser|Masuk Cung Underground/ }).count(),
      0,
    );
    await page.getByRole("button", { name: "Sapa", exact: true }).click();
    await page.waitForFunction(
      () => Math.abs(window.three.scene.getObjectByName("RightWrist")?.quaternion.z ?? 0) > 0.03,
    );
    await page.screenshot({ path: output + "/wave-" + width + ".png" });
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Dance", exact: true }).click();
    await page.getByRole("button", { name: "disco", exact: true }).click();
    await page.waitForFunction(
      () => window.club.getState().data.members[window.playerId]?.dance?.id === "disco",
    );
    await page.keyboard.down("w");
    await page.waitForTimeout(550);
    await page.keyboard.up("w");
    await page.waitForFunction(() => window.club.getState().suppressed);
    await page.getByRole("button", { name: "Dance", exact: true }).click();
    await page.getByRole("button", { name: "Sync · Budi · disco", exact: true }).click();
    await page.waitForFunction(
      () => window.club.getState().data.members[window.playerId]?.dance?.groupId === "bob",
    );
    await teleport(-8, -5.5);
    await page.getByRole("button", { name: "Minum es jeruk", exact: true }).click();
    await page.waitForFunction(
      () => window.three.scene.getObjectByName("DrinkCup")?.visible === true,
    );
    await page.screenshot({ path: output + "/drink-" + width + ".png" });
    await page.waitForFunction(() => !window.three.scene.getObjectByName("DrinkCup")?.visible);
    await teleport(-7.8, -1);
    await page.waitForFunction(() => window.game.getState().nearby?.kind === "bench");
    if (width < 1000)
      await page.getByRole("button", { name: "Interaksi dengan Sofa lounge", exact: true }).click();
    else await page.keyboard.press("f");
    await page.waitForFunction(() => window.game.getState().sitting);
    await page.waitForTimeout(700);
    assert(
      (await page.evaluate(() => window.game.getState().playerPos[1])) < -12,
      "seat stays on underground floor",
    );
    await page.screenshot({ path: output + "/sit-" + width + ".png" });
    if (width < 1000) await page.getByRole("button", { name: "Berdiri", exact: true }).click();
    else await page.keyboard.press("f");
    await page.waitForFunction(() => !window.game.getState().sitting);
    await page.waitForTimeout(400);
    assert(
      (await page.evaluate(() => window.game.getState().playerPos[1])) < -12,
      "standing stays underground",
    );
    await teleport(0, 7);
    await clickMesh("club-exit-door");
    await page.waitForFunction(() => !window.club.getState().inside);
    await teleport(41, 7, 0.83);
    await page.waitForFunction(() => window.club.getState().outdoor);
    assert(
      (await page.evaluate(() => window.game.getState().playerPos[1])) > 0,
      "concert stays in city",
    );
    await page.waitForTimeout(800);
    await page.screenshot({ path: output + "/concert-" + width + ".png" });
    console.log(
      "Concert render calls",
      width,
      await page.evaluate(() => window.three.gl.info.render.calls),
    );
    if (width < 1000) {
      const before = await page.evaluate(() => window.game.getState().playerPos);
      const stick = await page.getByLabel("Analog gerak", { exact: true }).boundingBox();
      await page.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2);
      await page.mouse.down();
      await page.mouse.move(stick.x + stick.width / 2 + 35, stick.y + stick.height / 2, {
        steps: 4,
      });
      await page.waitForTimeout(650);
      await page.mouse.up();
      const after = await page.evaluate(() => window.game.getState().playerPos);
      assert(
        Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.5,
        "mobile analog moves the player: " + JSON.stringify({ before, after }),
      );
      await page.getByRole("button", { name: "Loncat", exact: true }).click();
      await page.waitForFunction(() => window.game.getState().playerPos[1] > 1.2);
      await page.waitForTimeout(800);
    }
    await teleport(41, -3, 0.83);
    await page.keyboard.down("w");
    await page.waitForTimeout(1500);
    await page.keyboard.up("w");
    const stage = await page.evaluate(() => window.game.getState().playerPos);
    assert(stage[2] < -6.5 && stage[1] > 1, "ramp reaches raised stage: " + stage);
    await teleport(31, 4.1, 0.83);
    await page.waitForFunction(() => window.game.getState().nearby?.kind === "bench");
    await page.keyboard.press("f");
    await page.waitForFunction(() => window.game.getState().sitting);
    await page.keyboard.press("f");
    await page.waitForFunction(() => !window.game.getState().sitting);
    await teleport(33, 1, 0.83);
    await clickMesh("vendor-33");
    await page.waitForFunction(() => window.three.scene.getObjectByName("DrinkCup")?.visible);
    await teleport(10.4, 3.4, 0.83);
    await page.waitForFunction(() => !window.club.getState().inside);
    await clickMesh("club-entry-door");
    await page.waitForFunction(
      () => window.club.getState().inside && !window.club.getState().outdoor,
    );

    await teleport(0, -4.8);
    await page.getByRole("button", { name: "Musik", exact: true }).click();
    await page.getByRole("button", { name: "Apply DJ", exact: true }).click();
    await page.waitForFunction(() => window.club.getState().data.activeDjId === window.playerId);
    await page.getByLabel("Choose song request").selectOption("cung-night");
    await page.getByRole("button", { name: "Request", exact: true }).click();
    await page.getByRole("button", { name: "DJ Console", exact: true }).click();
    await page.getByRole("button", { name: "Accept Cung Night", exact: true }).click();
    await page.getByRole("button", { name: "play", exact: true }).click();
    await page.waitForFunction(() => window.club.getState().data.playbackStatus === "playing");
    await page.getByLabel("Lighting", { exact: false }).selectOption("ocean");
    await page.screenshot({ path: output + "/dj-" + width + ".png" });
    await page.getByRole("button", { name: /Tutup/ }).click();
    await teleport(0, 8.2);
    await clickMesh("club-exit-door");
    await page.waitForFunction(() => !window.club.getState().inside);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    console.log("PASS venue interactions and physical navigation", width, height);
    await page.goto("http://127.0.0.1:4219/?map");
    await page.getByRole("button", { name: "Buka legenda peta", exact: true }).click();
    await page
      .getByRole("button", { name: "Arahkan ke Cung Live · Arena konser", exact: true })
      .click();
    assert.equal(await page.evaluate(() => window.game.getState().waypoint), "venue-concert");
    await page.evaluate(() => window.club.setState({ inside: true }));
    await page.waitForTimeout(200);
    await page.screenshot({ path: output + "/venue-map-" + width + ".png" });
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
