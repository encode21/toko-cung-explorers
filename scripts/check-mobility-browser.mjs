// Real Player + Rapier + production HUD. Only backend transport is a fixture.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = "/tmp/toko-mobility-qa";
const port = 4261;
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  plugins: [
    {
      name: "mobility-api-boundary",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "./api.functions" && importer?.endsWith("/services/world/client.ts"))
          return root + "/tests/fixtures/mobility/api.ts";
      },
    },
    react(),
    tailwind(),
  ],
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
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    proxy: {
      "/mobility-api": {
        target: "http://127.0.0.1:4511",
        rewrite: (p) => p.replace("/mobility-api", "/world"),
      },
    },
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();
let browser;
const errors = [];
const report = {};
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--enable-unsafe-swiftshader",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
  const carrier = await context.newPage();
  const rider = await context.newPage();
  for (const p of [carrier, rider]) p.on("pageerror", (e) => errors.push(e.message));
  await carrier.goto(`http://127.0.0.1:${port}/?world&mobility&gm&name=GM`);
  await carrier.waitForFunction(
    () => window.obbyQA?.ready && window.mobility.getState().canFly,
    null,
    { timeout: 60000 },
  );
  await rider.goto(`http://127.0.0.1:${port}/?world&mobility&name=Penumpang`);
  await rider.waitForFunction(
    () => window.obbyQA?.ready && window.mobility.getState().confirmedAt,
    null,
    { timeout: 60000 },
  );
  await carrier.evaluate(() => window.obbyQA.place(30.3, 1, -17.5));
  await rider.evaluate(() => window.obbyQA.place(31.5, 1, -17.5));
  await carrier.waitForTimeout(1500);
  const target = await rider.evaluate(() => window.connectionId);
  const invoke = async (page, action, extra = {}) => {
    await page.waitForFunction(() => !window.mobility.getState().busy);
    await page.evaluate(async ({ action, extra }) => window.mobilityCommand(action, extra), {
      action,
      extra,
    });
  };
  await invoke(carrier, "request", { target });
  await rider.getByRole("button", { name: "Terima", exact: true }).click();
  await carrier.waitForFunction(() =>
    window.mobility.getState().carries.some((p) => p.status === "active"),
  );
  await rider.waitForFunction(() => window.obbyQA.sample.anim === "Piggyback");
  let c = await carrier.evaluate(() => window.obbyQA.sample),
    r = await rider.evaluate(() => window.obbyQA.sample);
  assert(Math.abs(r.y - c.y - 0.68) < 0.18, "passenger follows back height");
  await carrier.keyboard.down("q");
  await carrier.waitForTimeout(600);
  await carrier.keyboard.up("q");
  await carrier.waitForTimeout(800);
  await carrier.screenshot({ path: output + "/carrying.png" });
  await carrier.keyboard.down("e");
  await carrier.waitForTimeout(600);
  await carrier.keyboard.up("e");
  await carrier.keyboard.down("w");
  await carrier.keyboard.press("Space");
  await carrier.waitForTimeout(220);
  await carrier.keyboard.up("w");
  c = await carrier.evaluate(() => window.obbyQA.sample);
  r = await rider.evaluate(() => window.obbyQA.sample);
  assert(r.y > 1.4, "passenger rises during carrier jump");
  await carrier.waitForTimeout(900);
  await carrier.evaluate(() => {
    const p = window.obbyQA.platform(1);
    window.obbyQA.place(p.x, p.y + 0.93, p.z);
  });
  await carrier.waitForFunction(() => window.obby.getState().step === 1);
  await rider.waitForFunction(() => window.obby.getState().step === 1);
  await rider.getByRole("button", { name: "Turun", exact: true }).click();
  await carrier.waitForFunction(() => window.mobility.getState().carries.length === 0);
  await rider.waitForFunction(() => window.obbyQA.sample.anim !== "Piggyback");
  report.carry = "consent, follow during jump, physical Obby progress, passenger release passed";
  // Recovery must end the shared carry before teleporting, and leave failures retryable.
  await carrier.evaluate(() => window.obbyQA.place(30.3, 1, -17.5));
  await rider.evaluate(() => window.obbyQA.place(31.5, 1, -17.5));
  await carrier.waitForTimeout(1400);
  await invoke(carrier, "request", { target });
  await rider.getByRole("button", { name: "Terima", exact: true }).click();
  await rider.waitForFunction(() => window.obbyQA.sample.anim === "Piggyback");
  await carrier.waitForTimeout(900);
  const carrierId = await carrier.evaluate(() => window.connectionId);
  const measureAttachment = (page, localCarrier) =>
    page.evaluate(
      ({ carrierId, passengerId, localCarrier }) =>
        new Promise((resolve) => {
          const samples = [];
          const end = performance.now() + 1400;
          function sample() {
            const scene = window.three.scene;
            const c = scene.getObjectByName(localCarrier ? "Player" : `remote-${carrierId}`);
            const p = scene.getObjectByName(localCarrier ? `remote-${passengerId}` : "Player");
            if (c && p) {
              const cp = c.position,
                pp = p.position;
              const yaw = localCarrier
                ? c.getObjectByName("CharacterVisual").parent.rotation.y
                : c.rotation.y;
              samples.push(
                Math.hypot(
                  pp.x - (cp.x - Math.sin(yaw) * 0.38),
                  pp.z - (cp.z - Math.cos(yaw) * 0.38),
                  pp.y + (localCarrier ? 0.83 : 0) - (cp.y + (localCarrier ? 0 : 0.83) + 0.68),
                ),
              );
            }
            if (performance.now() < end) requestAnimationFrame(sample);
            else
              resolve({
                frames: samples.length,
                maxError: Math.max(...samples),
                meanError: samples.reduce((a, b) => a + b, 0) / samples.length,
              });
          }
          requestAnimationFrame(sample);
        }),
      { carrierId, passengerId: target, localCarrier },
    );
  await carrier.keyboard.down("w");
  await carrier.keyboard.down("q");
  const [carrierMotion, riderMotion] = await Promise.all([
    measureAttachment(carrier, true),
    measureAttachment(rider, false),
  ]);
  await carrier.keyboard.up("w");
  await carrier.keyboard.up("q");
  console.log("attachment", { carrierMotion, riderMotion });
  assert(carrierMotion.frames > 10 && carrierMotion.maxError < 0.12, JSON.stringify(carrierMotion));
  assert(riderMotion.frames > 10 && riderMotion.maxError < 0.22, JSON.stringify(riderMotion));
  report.motion = { carrierMotion, riderMotion };
  await rider.route("**/mobility-api/api/world/mobility", (route) => {
    if (route.request().postDataJSON()?.action === "release")
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Simulated release failure" }),
      });
    return route.continue();
  });
  const spawn = rider.getByRole("button", { name: "Kembali ke spawn", exact: true });
  await spawn.click();
  await rider.waitForFunction(() => !!window.mobility.getState().error);
  assert(
    (await rider.evaluate(() => window.obbyQA.sample.x)) > 25,
    "failed release must not teleport",
  );
  await rider.unroute("**/mobility-api/api/world/mobility");
  await spawn.click();
  await rider.waitForFunction(() => {
    const p = window.obbyQA.sample;
    return Math.abs(p.x) < 3 && Math.abs(p.z - 12) < 3 && p.y < 1.2;
  });
  await carrier.waitForFunction(() => window.mobility.getState().carries.length === 0);
  await rider.waitForTimeout(1100);
  assert(
    Math.abs(await rider.evaluate(() => window.obbyQA.sample.x)) < 3,
    "does not reattach after respawn",
  );
  await rider.screenshot({ path: output + "/spawn-recovery.png" });
  report.spawn = "carry release, failed-release retry, safe spawn, no reattachment passed";
  await invoke(rider, "flight", { enabled: true });
  assert.equal(await rider.evaluate(() => window.mobility.getState().flying), false);
  assert.equal(await rider.getByRole("button", { name: "Terbang · GM", exact: true }).count(), 0);
  await carrier.getByRole("button", { name: "Terbang · GM", exact: true }).click();
  await carrier.waitForFunction(() => window.mobility.getState().flying);
  await carrier.waitForFunction(() => window.obbyQA.sample.anim === "FlightHover");
  const before = await carrier.evaluate(() => window.obbyQA.sample.y);
  await carrier.keyboard.down("Space");
  await carrier.waitForTimeout(1300);
  await carrier.keyboard.up("Space");
  const high = await carrier.evaluate(() => window.obbyQA.sample.y);
  assert(high > before + 3, `flight ascent ${before} -> ${high}`);
  await carrier.waitForTimeout(500);
  const hover = await carrier.evaluate(() => window.obbyQA.sample.y);
  assert(Math.abs(high - hover) < 0.25, "hover without vertical input");
  await carrier.keyboard.down("Control");
  await carrier.waitForTimeout(600);
  await carrier.keyboard.up("Control");
  assert((await carrier.evaluate(() => window.obbyQA.sample.y)) < high - 1, "flight descent");
  await carrier.evaluate(() => window.obbyQA.place(0, 12, 10));
  await carrier.keyboard.down("w");
  await carrier.waitForFunction(() => window.obbyQA.sample.anim === "FlightForward");
  await rider.waitForFunction((id) => {
    const body = window.three.scene.getObjectByName(`remote-${id}`)?.getObjectByName("Body");
    return body && body.rotation.x > 1.3;
  }, carrierId);
  await carrier.screenshot({ path: output + "/flight-superman.png" });
  await carrier.keyboard.down("Space");
  await carrier.waitForFunction(() => window.obbyQA.sample.anim === "FlightHover");
  await carrier.keyboard.up("Space");
  await carrier.keyboard.up("w");
  await carrier.waitForTimeout(350);
  await carrier.screenshot({ path: output + "/flight-desktop.png" });
  await carrier.getByRole("button", { name: "Akhiri terbang", exact: true }).click();
  await carrier.waitForFunction(
    () => !window.mobility.getState().flying && window.obbyQA.sample.vy < -0.2,
  );
  report.flight =
    "editor permission, upright vertical flight, Superman local/remote, hover, gravity restoration passed";
  // Pending offer timeout and disconnect reset are covered by the service tests.
  const mobile = await browser.newPage({
    viewport: { width: 740, height: 360 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(`http://127.0.0.1:${port}/?world&mobility&gm&name=MobileGM`);
  await mobile.waitForFunction(
    () => window.obbyQA?.ready && window.mobility.getState().canFly,
    null,
    { timeout: 60000 },
  );
  const primaryBefore = await mobile.locator("[data-mobile-primary-action]").boundingBox();
  // A slow background read must neither disable the button nor swallow this click.
  await mobile.evaluate(() => {
    window.mobilityCommand("read");
  });
  const flightButton = mobile.getByRole("button", { name: "Terbang · GM", exact: true });
  assert.equal(await flightButton.isEnabled(), true, "polling does not disable flight toggle");
  await flightButton.tap();
  await mobile.waitForFunction(() => window.mobility.getState().flying);
  const primaryAfter = await mobile.locator("[data-mobile-primary-action]").boundingBox();
  assert(
    Math.abs(primaryAfter.x - primaryBefore.x) < 1 &&
      Math.abs(primaryAfter.y - primaryBefore.y) < 1,
    "contextual action keeps its anchor",
  );
  assert(
    primaryAfter.x > 400 && primaryAfter.y > 120 && primaryAfter.width >= 44,
    "flight control stays in reachable bottom right area",
  );
  const up = mobile.locator("[data-mobile-primary-action]");
  const rect = await up.boundingBox();
  const cdp = await mobile.context().newCDPSession(mobile);
  const start = await mobile.evaluate(() => window.obbyQA.sample.y);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }],
  });
  await mobile.waitForTimeout(1000);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert((await mobile.evaluate(() => window.obbyQA.sample.y)) > start + 2, "mobile hold ascends");
  await mobile.screenshot({ path: output + "/flight-mobile.png" });
  const mobileSpawn = mobile.getByRole("button", { name: "Kembali ke spawn", exact: true });
  const spawnRect = await mobileSpawn.boundingBox();
  assert(
    spawnRect.width >= 44 &&
      spawnRect.height >= 44 &&
      spawnRect.y >= 0 &&
      spawnRect.y + spawnRect.height <= 360,
    "spawn is reachable on small landscape screen",
  );
  await mobileSpawn.tap();
  await mobile.waitForFunction(
    () =>
      !window.mobility.getState().flying &&
      Math.abs(window.obbyQA.sample.z - 12) < 3 &&
      window.obbyQA.sample.y < 1.2,
  );
  await mobile.screenshot({ path: output + "/spawn-mobile.png" });
  await flightButton.tap();
  await mobile.waitForFunction(() => window.mobility.getState().flying);
  report.spawnMobile = "44px touch target, flying cleanup and ground recovery passed";
  await mobile.route("**/mobility-api/api/world/mobility", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Simulated offline" }),
    }),
  );
  await mobile.waitForFunction(() => !window.mobility.getState().flying, null, { timeout: 9000 });
  assert.equal(
    await mobile.getByRole("button", { name: "Terbang · GM", exact: true }).count(),
    1,
    "known GM button remains visible after an outage",
  );
  await mobile.evaluate(() => window.stopMobility());
  assert.equal(await mobile.evaluate(() => window.mobility.getState().flying), false);
  report.mobile =
    "stable action anchor, toggle during background poll, touch hold, visible outage status passed";
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser?.close();
  await server.close();
}
