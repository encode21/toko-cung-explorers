// Real BusRide + R3F renderer, no accounts or API calls.
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/bus-render",
  cacheDir: "/tmp/tokocung-bus-render-vite-cache",
  publicDir: root + "/public",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  resolve: {
    alias: [
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      {
        find: "@/services/world/client",
        replacement: root + "/tests/fixtures/bus-render/client.ts",
      },
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 0, hmr: false, watch: null, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)));
      }),
  );
const checkRendering = async (page, phase) => {
  const before = await page.evaluate(() => window.busRenderQA.snapshot().frames);
  await settle(page);
  const after = await page.evaluate(() => window.busRenderQA.snapshot().frames);
  assert.ok(after > before, `${phase}: world must keep rendering with BusRide mounted`);
};
try {
  const pedestrian = await browser.newPage({ viewport: { width: 932, height: 600 } });
  pedestrian.on("pageerror", (error) => errors.push(error.message));
  await pedestrian.goto(server.resolvedUrls.local[0] + "?service");
  await pedestrian.waitForFunction(() => window.busRenderQA?.snapshot?.().boarding.canBoard);
  await pedestrian.evaluate(() => {
    window.busRenderQA.walk();
    window.busRenderQA.openMenu("kota");
  });
  const waitingBus = await pedestrian.evaluate(() => window.busRenderQA.snapshot());
  assert.equal(waitingBus.riding, false);
  assert.equal(waitingBus.busVisible, true);
  assert.equal(waitingBus.busRegistered, true);
  const tour = pedestrian.getByRole("button", { name: /Keliling kota/ });
  assert.equal(await tour.isEnabled(), true);
  await pedestrian.evaluate(() => window.busRenderQA.serviceTime(21000));
  await pedestrian.waitForFunction(() => window.busRenderQA.snapshot().speed > 1);
  assert.equal(
    await tour.isEnabled(),
    false,
    "an open chooser stops selling tickets after departure",
  );
  await pedestrian.waitForFunction(() => window.busRenderQA.snapshot().position[0] < -6);
  const departed = await pedestrian.evaluate(() => window.busRenderQA.snapshot());
  assert.deepEqual(
    departed.camera,
    waitingBus.camera,
    "pedestrian camera stays free while bus drives past",
  );
  assert.equal(departed.riding, false);
  assert.equal(departed.busVisible, true);
  assert.equal(departed.door, 0);
  await pedestrian.evaluate(() => window.busRenderQA.closeMenu());
  await mkdir("/tmp/tokocung-bus-qa", { recursive: true });
  await pedestrian.screenshot({ path: "/tmp/tokocung-bus-qa/scheduled-pedestrian-bus.png" });
  await pedestrian.close();
  for (const area of ["city", "gang", "club", "mountain", "none"]) {
    const markers = await browser.newPage({ viewport: { width: 932, height: 600 } });
    markers.on("pageerror", (error) => errors.push(error.message));
    await markers.goto(server.resolvedUrls.local[0] + `?markers=${area}`);
    await markers.waitForFunction(() => window.busRenderQA?.snapshot);
    if (area !== "none")
      await markers.waitForFunction(() => window.busRenderQA.snapshot().markers.length > 0);
    const all = (await markers.evaluate(() => window.busRenderQA.snapshot())).markers;
    const labels = all.map((m) => m.name);
    if (area === "city") {
      for (const name of [
        "Halte Toko Cung · Bus",
        "Halte Gerbang Kampung · Bus",
        "Halte Pasar · Bus",
        "Masuk Toko Cung",
        "Masuk gudang",
        "Masuk Warung Kota QA",
        "Masuk Kos-kosan",
        "Kunjungi Gang Kampung",
        "Principal · Pilih misi",
        "Masuk Cung Underground",
        "Naik helikopter · Gunung",
      ])
        assert(labels.includes(`EntryRing:${name}`), name);
      assert.equal(
        labels.filter((name) => name.includes("Underground")).length,
        1,
        "inactive duplicate door has no marker",
      );
      await markers.evaluate(() => window.busRenderQA.player([-6.8, 1.03, 27.6]));
      await settle(markers);
      await markers.evaluate(() => window.busRenderQA.player([-5.2, 1.03, 27.6]));
      await markers.getByRole("dialog").waitFor();
      assert.equal(
        await markers.getByRole("button", { name: /Keliling kota/ }).isEnabled(),
        false,
        "walking into ring cannot buy or summon a missing bus",
      );
      await markers.evaluate(() => window.busRenderQA.closeMenu());
      await settle(markers);
      assert.equal(
        await markers.getByRole("dialog").count(),
        0,
        "standing inside does not reopen chooser",
      );
      await markers.evaluate(() => window.busRenderQA.player([0, 0.83, 0]));
      await settle(markers);
      await markers.evaluate(() => window.busRenderQA.player([-4.5, 1.03, 27.6]));
      await settle(markers);
      assert.equal(
        await markers.getByRole("dialog").count(),
        0,
        "teleport arrival does not reopen chooser",
      );
      await markers.evaluate(() => window.busRenderQA.walk());
      await settle(markers);
      await markers.screenshot({ path: "/tmp/tokocung-bus-qa/yellow-entry-rings.png" });
    } else if (area === "gang") {
      assert(labels.includes("EntryRing:Halte · Jadwal & tujuan bus"));
      assert(labels.includes("EntryRing:Masuk Warung Gang QA"));
      assert(labels.includes("EntryRing:Ke Kampung 2"));
      assert(!labels.some((name) => /Tutup QA|Pindah Kota QA|Underground/.test(name)));
    } else if (area === "club") {
      assert.deepEqual(labels, ["EntryRing:Keluar ke kota"]);
      assert(Math.abs(all[0].position[1] + 13.97) < 0.01, "basement ring stays on its own floor");
    } else if (area === "mountain") {
      assert.deepEqual(labels, ["EntryRing:Naik helikopter · Kota"]);
      assert(Math.abs(all[0].position[1] - 4.03) < 0.01);
    } else assert.deepEqual(labels, []);
    await markers.close();
  }
  for (const deviceScaleFactor of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 932, height: 600 },
      deviceScaleFactor,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.busRenderQA?.snapshot);
    await checkRendering(page, "idle / spawn");
    await page.evaluate(() => window.busRenderQA.start());
    await page.waitForFunction(() => {
      const s = window.busRenderQA.snapshot();
      return s.riding && s.ready;
    });
    await checkRendering(page, "bus ride");
    const cameraBefore = await page.evaluate(() => window.busRenderQA.snapshot().camera);
    await settle(page);
    const cameraAfter = await page.evaluate(() => window.busRenderQA.snapshot().camera);
    assert.notDeepEqual(cameraAfter, cameraBefore, "camera follows the moving bus");
    await page.waitForFunction(() => {
      const s = window.busRenderQA.snapshot();
      return s.arrived && !s.riding;
    });
    await checkRendering(page, "after drop-off");
    await page.close();
  }
  const output = process.env.BUS_QA_DIR || "/tmp/tokocung-bus-qa";
  await mkdir(output, { recursive: true });
  for (const compact of [false, true]) {
    const collision = await browser.newPage({ viewport: { width: 932, height: 600 } });
    collision.on("pageerror", (error) => errors.push(error.message));
    await collision.goto(server.resolvedUrls.local[0] + (compact ? "?compact" : ""));
    await collision.waitForFunction(() => window.busRenderQA?.obstacle);
    await collision.evaluate(() => window.busRenderQA.obstacle(true, 0));
    // Let Rapier publish the teleported fixture car to its spatial index before requesting a bus.
    await settle(collision);
    await settle(collision);
    await collision.evaluate(() => window.busRenderQA.start());
    await collision.waitForFunction(() => window.busRenderQA.snapshot().collisionReady);
    for (let i = 0; i < 5; i++) await settle(collision);
    const occupied = await collision.evaluate(() => window.busRenderQA.snapshot());
    assert.equal(occupied.ready, false, "occupied stop delays bus spawn");
    assert.equal(occupied.busVisible, false, "bus never appears inside an existing car");
    assert.equal(occupied.busRegistered, false, "existing traffic can clear the stop");
    await collision.evaluate(() => window.busRenderQA.obstacle(true, 16));
    await collision.waitForFunction(() => {
      const s = window.busRenderQA.snapshot();
      return s.collisionReady && s.position[1] > 3 && s.speed === 0;
    });
    const stopped = await collision.evaluate(() => window.busRenderQA.snapshot());
    assert(stopped.position[1] + (compact ? 4 : 5.5) < 13.9, "bus stays outside the car");
    assert.equal(stopped.door, 0, "traffic stop does not open the doors");
    assert.equal(stopped.busRegistered, true);
    const hit = await collision.evaluate(() => window.busRenderQA.castCarAtBus());
    assert(hit > 0 && hit < 15, "player vehicle sweep sees the solid bus");
    for (let i = 0; i < 5; i++) await settle(collision);
    assert.equal(
      (await collision.evaluate(() => window.busRenderQA.snapshot())).position[1],
      stopped.position[1],
    );
    await collision.evaluate(() => window.busRenderQA.obstacle(false));
    await collision.waitForFunction(() => window.busRenderQA.snapshot().arrived);
    await settle(collision);
    assert.equal(
      (await collision.evaluate(() => window.busRenderQA.snapshot())).busRegistered,
      false,
    );
    if (!compact) {
      await collision.evaluate(() => {
        window.busRenderQA.obstacle(true);
        window.busRenderQA.spawnThief();
      });
      await collision.waitForFunction(() => (window.busRenderQA.snapshot().thief?.x ?? -8) > -1.5);
      for (let i = 0; i < 20; i++) await settle(collision);
      const thief = await collision.evaluate(() => window.busRenderQA.snapshot());
      assert(thief.thief.x < -1.2, "thief capsule stops before the car");
      assert.equal(thief.thiefRegistered, true, "traffic can see the thief");
      await collision.screenshot({ path: `${output}/thief-collision.png` });
      await collision.evaluate(() => window.busRenderQA.obstacle(false));
      await collision.waitForFunction(() => (window.busRenderQA.snapshot().thief?.x ?? -8) > 2);
      await collision.evaluate(() => window.busRenderQA.clearThief());
      await settle(collision);
      assert.equal(
        (await collision.evaluate(() => window.busRenderQA.snapshot())).thiefRegistered,
        false,
      );
    }
    await collision.close();
  }
  const boarding = await browser.newPage({ viewport: { width: 932, height: 600 } });
  boarding.on("pageerror", (error) => errors.push(error.message));
  await boarding.goto(server.resolvedUrls.local[0]);
  await boarding.waitForFunction(() => window.busRenderQA?.start);
  await boarding.evaluate(() => window.busRenderQA.start(true));
  await boarding.waitForFunction(() => window.busRenderQA.snapshot().door > 0.7);
  await boarding.screenshot({ path: `${output}/npc-boarding.png` });
  const waiting = await boarding.evaluate(() => window.busRenderQA.snapshot());
  assert.equal(waiting.speed, 0, "bus is stationary with doors open");
  assert.equal(waiting.passengers.length, 2, "waiting NPCs are visible at the curb");
  await boarding.waitForFunction(() => window.busRenderQA.snapshot().passengers.length < 2);
  await boarding.waitForFunction(() => window.busRenderQA.snapshot().boarded === 2);
  await boarding.evaluate(() => window.busRenderQA.skip());
  await boarding.waitForFunction(() => !window.busRenderQA.snapshot().riding);
  await boarding.close();
  const preview = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  preview.on("pageerror", (error) => errors.push(error.message));
  await preview.goto(server.resolvedUrls.local[0] + "?preview");
  await preview.waitForFunction(() => window.busRenderQA?.view);
  for (const side of [-1, 1]) {
    await preview.evaluate((s) => window.busRenderQA.view(s), side);
    await settle(preview);
    await preview.screenshot({ path: `${output}/bus-${side === 1 ? "doors" : "driver"}.png` });
  }
  await preview.goto(server.resolvedUrls.local[0] + "?preview&compact");
  await preview.waitForFunction(() => window.busRenderQA?.view);
  await preview.evaluate(() => window.busRenderQA.view(-1));
  await settle(preview);
  await preview.screenshot({ path: `${output}/bus-kampung.png` });
  await preview.close();
  const market = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  market.on("pageerror", (error) => errors.push(error.message));
  await market.goto(server.resolvedUrls.local[0] + "?market");
  await market.waitForFunction(() => window.busRenderQA?.obstacle);
  await checkRendering(market, "market stalls and relocated halt");
  await market.screenshot({ path: `${output}/market-halt.png` });
  await market.close();
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 740, height: 360 },
  ]) {
    const menu = await browser.newPage({ viewport });
    menu.on("pageerror", (error) => errors.push(error.message));
    await menu.goto(server.resolvedUrls.local[0]);
    await menu.waitForFunction(() => window.busRenderQA?.openMenu);
    await menu.evaluate(() => window.busRenderQA.openMenu("kampung"));
    const dialog = menu.getByRole("dialog");
    await dialog.waitFor();
    for (const label of [
      "Halte Toko Cung",
      "Halte Gerbang Kampung",
      "Halte Pasar",
      "Keliling kota",
    ]) {
      assert.equal(await dialog.getByRole("button", { name: new RegExp(label) }).count(), 1);
    }
    assert.equal(
      await menu.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      "no horizontal overflow",
    );
    await dialog.getByRole("button", { name: /Keliling kota/ }).scrollIntoViewIfNeeded();
    await menu.screenshot({ path: `${output}/destinations-${viewport.width}.png` });
    await menu.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    await menu.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: entrance rings across city/gang/club/mountain, safe bus walk-in; visible scheduled pedestrian service, free camera, open-menu departure cutoff; rendering/camera DPR 1/2, full/compact bus brakes and resumes, solid body blocks car sweep, thief stops/resumes and cleans up, NPC boarding, menus and previews.",
  );
} catch (error) {
  console.error("Browser errors:", errors);
  for (const context of browser.contexts())
    for (const page of context.pages())
      console.error(
        "Last scene:",
        await page.evaluate(() => window.busRenderQA?.snapshot?.()).catch(() => null),
      );
  throw error;
} finally {
  await browser.close();
  await server.close();
}
