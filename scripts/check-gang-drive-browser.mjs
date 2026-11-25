// FEAT-148: drive a shared bike with a passenger through Gerbang Kampung and return it to parking. Real Player + Rapier + HUD; backend fixture.
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = process.env.QA_OUTPUT || root + "/docs/qa/gang-drive";
const backend = process.env.WORLD_QA_BACKEND;
if (!backend) throw new Error("Set WORLD_QA_BACKEND to the local backend checkout");
const database = (await mkdtemp(tmpdir() + "/tokocung-world-qa-")) + "/test.sqlite";
await writeFile(database, "");
const php = spawn(
  "php",
  [
    "-d",
    "error_reporting=22527",
    "-S",
    "127.0.0.1:4521",
    backend + "/tests/Fixtures/world-social-router.php",
  ],
  {
    cwd: backend,
    env: {
      ...process.env,
      APP_ENV: "testing",
      APP_KEY: "01234567890123456789012345678901",
      WORLD_QA_DB: database,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let phpLog = "";
php.stdout.on("data", (c) => (phpLog += c));
php.stderr.on("data", (c) => (phpLog += c));
const port = 4267;
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
      { find: "../mobility/runtime", replacement: root + "/tests/fixtures/vehicles/runtime.ts" },
      { find: "@/net/useWorldChannel", replacement: root + "/tests/fixtures/vehicles/channel.ts" },
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
        target: "http://127.0.0.1:4521",
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
const errors = [],
  report = {};
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
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const rider = await context.newPage();
  rider.on("pageerror", (e) => errors.push(e.message));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?world&vehicles&mobility&gang-drive&name=Pengemudi`);
  await page.waitForFunction(() => window.obbyQA?.ready && window.mobility?.getState().vehicles?.length === 11, null, { timeout: 30000 });
  await page.evaluate(() => window.loadCityGang());
  const bike = await page.evaluate(() => window.mobility.getState().vehicles[2]);
  await page.evaluate((p) => window.obbyQA.place(...p), await page.evaluate((id) => window.vehicleDoor(id, 0), bike.id));
  await page.waitForTimeout(600);
  await page.keyboard.press("KeyF");
  await page.waitForFunction((id) => window.mobility.getState().vehicles.find((v) => v.id === id).occupants[0]?.transition?.phase === "seated", bike.id, { timeout: 10000 });
  await rider.goto(`http://127.0.0.1:${port}/?world&vehicles&mobility&gang-drive&name=Penumpang`);
  await rider.waitForFunction(() => window.obbyQA?.ready && window.mobility?.getState().vehicles?.length === 11, null, { timeout: 30000 });
  await rider.evaluate(() => window.loadCityGang());
  const door = await rider.evaluate((id) => window.vehicleDoor(id, 1), bike.id);
  assert(door, "Passenger door is accessible");
  await rider.evaluate((p) => window.obbyQA.place(...p), door);
  await rider.waitForTimeout(700);
  await page.getByRole("button", { name: "Ajak bonceng", exact: true }).click();
  await rider.getByRole("button", { name: "Terima", exact: true }).click();
  await page.waitForFunction((id) => {
    const v = window.mobility.getState().vehicles.find((v) => v.id === id);
    return v.occupants.length === 2 && v.occupants.every((s) => s.transition?.phase === "seated");
  }, bike.id);
  const state = () => page.evaluate((id) => {
    const p = window.game.getState().playerPos, r = window.ridePose(id);
    const ray = new window.rapier.Ray({ x: p[0], y: p[1] + 0.5, z: p[2] }, { x: 0, y: -1, z: 0 });
    return { inside: window.gang.getState().inside, ride: r && { x: r.x, y: r.y, z: r.z }, player: p,
      ground: !!window.rapierWorld.castRay(ray, 4, true), warning: window.vehicleInput.getState().boundaryWarning,
      seated: window.mobility.getState().vehicles.find((v) => v.id === id).occupants.length, gate: window.gang.getState().data?.layout.gate, pending: window.game.getState().pendingTeleport };
  }, bike.id);
  const drive = async (until) => {
    await page.keyboard.down("KeyW");
    try { await page.waitForFunction(until, null, { timeout: 8000 }); }
    catch (e) { await page.keyboard.up("KeyW"); await page.screenshot({ path: output + "/stuck.png" }); throw new Error(`stuck: ${JSON.stringify(await state())} ${e.message}`); }
    await page.keyboard.up("KeyW");
    await page.keyboard.down("Space"); await page.waitForTimeout(600); await page.keyboard.up("Space");
    await page.waitForTimeout(1200);
  };
  // Line up on the southbound lane just inside the city gate, then drive through it.
  await page.evaluate((id) => window.vehicleJumps.set(id, { x: -31.6, y: 0, z: -55, yaw: Math.PI, speed: 0 }), bike.id);
  await page.waitForTimeout(500);
  await drive(() => window.gang.getState().inside !== null);
  const inGang = await state();
  await page.screenshot({ path: output + "/in-gang.png" });
  report.inGang = inGang;
  assert.equal(inGang.inside, 1);
  assert.equal(inGang.seated, 2, "still driving after the crossing");
  assert(Math.abs(inGang.ride.x - 6000) < 6 && inGang.ride.z > 2990 && inGang.ride.z < 3020, `ride in the gang lane: ${JSON.stringify(inGang)}`);
  assert(Math.hypot(inGang.player[0] - inGang.ride.x, inGang.player[2] - inGang.ride.z) < 2, `player rides with it: ${JSON.stringify(inGang)}`);
  assert(inGang.ground, "gang ground under the player");
  assert.equal(inGang.warning, false, "gang counts as driveable area");
  await rider.waitForFunction(() => window.gang.getState().inside === 1 && window.game.getState().playerPos[0] > 5900, null, { timeout: 10000 });
  const passengerInGang = await rider.evaluate(() => ({ inside: window.gang.getState().inside, player: window.game.getState().playerPos, pending: window.game.getState().pendingTeleport }));
  assert.equal(passengerInGang.pending, null);
  await rider.screenshot({ path: output + "/passenger-in-gang.png" });
  report.passengerInGang = passengerInGang;
  // Back out: face the lane gate (−z) and drive past it.
  await page.evaluate((id) => window.vehicleJumps.set(id, { x: 6000, y: 0, z: 2994, yaw: Math.PI, speed: 0 }), bike.id);
  await page.waitForTimeout(500);
  await drive(() => window.gang.getState().inside === null);
  const back = await state();
  await page.screenshot({ path: output + "/back-in-city.png" });
  report.back = back;
  assert.equal(back.seated, 2, "still driving after leaving the gang");
  assert(Math.abs(back.ride.x + 28.4) < 4 && back.ride.z > -60 && back.ride.z < -35, `ride back at the city gate: ${JSON.stringify(back)}`);
  assert(back.ground, "city ground under the player");
  await rider.waitForFunction(() => window.gang.getState().inside === null && Math.abs(window.game.getState().playerPos[0]) < 100, null, { timeout: 10000 });
  await page.keyboard.press("KeyF");
  await page.waitForFunction((id) => {
    const v = window.mobility.getState().vehicles.find((v) => v.id === id);
    return !v.occupants.length && Math.abs(v.pose.x - 11) < .01 && Math.abs(v.pose.z - 5.7) < .01;
  }, bike.id, { timeout: 10000 });
  await rider.waitForFunction((id) => !window.mobility.getState().vehicles.find((v) => v.id === id).occupants.length, bike.id);
  report.parked = await page.evaluate(() => window.mobility.getState().vehicles.slice(2, 4).map((v) => ({ pose: v.pose, occupants: v.occupants })));
  assert.equal(report.parked.length, 2);
  assert.equal(report.parked[1].pose.x, 13.3);
  assert((await page.evaluate(() => window.game.getState().playerPos[2])) < -30, "Driver stays at the exit, not at bike parking");
  assert((await rider.evaluate(() => window.game.getState().playerPos[2])) < -30, "Passenger stays at the exit");
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify({ report, errors }, null, 2));
  console.log("PASS: driver and passenger cross both portals, then the empty shared bike returns to parking");
} finally {
  await browser?.close();
  await server.close();
  php.kill();
  await unlink(database).catch(() => {});
}
