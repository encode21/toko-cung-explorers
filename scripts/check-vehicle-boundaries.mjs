import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/obby",
  output = process.env.QA_OUTPUT || "/tmp/toko-boundary-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
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
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port: 4268,
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
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4268/?world");
  await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
  assert.equal(await page.getByRole("button", { name: /Test.*Finish/i }).count(), 0);
  await page.evaluate(async (root) => {
    const load = (path) => import(`/@fs${root}src/${path}`);
    window.boundaryQA = {
      ...(await load("game/vehicles/runtime.ts")),
      ...(await load("game/vehicles/boundary.ts")),
      ...(await load("game/vehicles/definitions.ts")),
      ...(await load("game/mobility/store.ts")),
      ...(await load("net/channel-store.ts")),
    };
  }, root);
  const report = [];
  for (const [name, x, z, yaw, axis, sign] of [
    ["east", 136, 20, Math.PI / 2, "x", 1],
    ["west", -52, 20, -Math.PI / 2, "x", -1],
    ["north", -30, -52, Math.PI, "z", -1],
    ["south", -30, 52, 0, "z", 1],
  ]) {
    await page.evaluate(
      ({ name, x, z, yaw }) => {
        const q = window.boundaryQA;
        q.useMobility.setState({
          vehicles: [
            {
              id: name,
              model: "car",
              color: "#39bedc",
              revision: 1,
              pose: { x, y: 0, z, yaw, speed: 0 },
              occupants: [{ connectionId: q.connectionId, seat: 0, status: "active" }],
            },
          ],
        });
      },
      { name, x, z, yaw },
    );
    await page.waitForFunction((name) => window.boundaryQA.renderedVehicles.has(name), name);
    await page.keyboard.down("w");
    await page.waitForFunction(() => window.boundaryQA.useVehicleInput.getState().boundaryWarning);
    await page.locator(".vehicle-boundary-warning").waitFor({ state: "visible" });
    if (name === "east") {
      await page.screenshot({ path: output + "/warning-mobile.png" });
      const warning = await page.locator(".vehicle-boundary-warning").boundingBox();
      const stick = await page.locator("[data-mobile-joystick]").boundingBox();
      assert(warning.y + warning.height < stick.y, "warning must leave joystick clear");
    }
    await page.waitForFunction(
      ({ name, axis, sign, start }) => {
        const p = window.boundaryQA.renderedVehicles.get(name);
        return (p[axis] - start) * sign > 5 && p.speed === 0;
      },
      { name, axis, sign, start: axis === "x" ? x : z },
      { timeout: 15000 },
    );
    if (name === "east") await page.waitForTimeout(2000);
    await page.keyboard.up("w");
    const stopped = await page.evaluate((name) => {
      const q = window.boundaryQA,
        p = q.renderedVehicles.get(name);
      return { ...p, depth: q.boundaryDepth(p, q.VEHICLE_DEFINITIONS.car.collision.half) };
    }, name);
    if (name === "east") await page.screenshot({ path: output + "/road-limit.png" });
    assert(stopped.depth <= 0, `${name}: entire footprint stops before water`);
    // Use the dedicated reverse button through the actual multitouch surface.
    const cdp = await page.context().newCDPSession(page);
    const reverse = await page.getByRole("button", { name: "Mundur kendaraan" }).boundingBox();
    const gas = await page.getByRole("button", { name: "Gas kendaraan" }).boundingBox();
    assert(reverse && gas && reverse.width >= 44 && reverse.height >= 44);
    const touch = { x: reverse.x + reverse.width / 2, y: reverse.y + reverse.height / 2, id: 1 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await page.waitForFunction(() => window.boundaryQA.useVehicleInput.getState().reverseHeld);
    await page.waitForFunction(
      ({ name, axis, sign, start }) => {
        const p = window.boundaryQA.renderedVehicles.get(name);
        return (start - p[axis]) * sign > 2;
      },
      { name, axis, sign, start: stopped[axis] },
      { timeout: 10000 },
    );
    await page.waitForFunction(() => !window.boundaryQA.useVehicleInput.getState().boundaryWarning);
    if (name === "east") {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          touch,
          {
            x: gas.x + gas.width / 2,
            y: gas.y + gas.height / 2,
            id: 2,
          },
        ],
      });
      await page.waitForFunction(() => {
        const q = window.boundaryQA,
          input = q.useVehicleInput.getState();
        return (
          input.gasHeld &&
          input.reverseHeld &&
          input.brake &&
          Math.abs(q.renderedVehicles.get("east").speed) < 0.05
        );
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await page.waitForFunction(
      () =>
        !window.boundaryQA.useVehicleInput.getState().reverseHeld &&
        !window.boundaryQA.useVehicleInput.getState().gasHeld,
    );
    await cdp.detach();
    report.push({ name, stopped, reversed: true });
  }
  await page.evaluate(() => {
    const q = window.boundaryQA;
    q.useMobility.setState({
      vehicles: [
        {
          id: "legacy-ocean",
          model: "convertible",
          color: "#ffffff",
          revision: 1,
          pose: { x: 180, y: -0.4, z: 20, yaw: Math.PI / 2, speed: 0 },
          occupants: [{ connectionId: q.connectionId, seat: 0, status: "active" }],
        },
      ],
    });
  });
  await page.waitForFunction(() => window.boundaryQA.renderedVehicles.has("legacy-ocean"));
  await page.keyboard.down("s");
  await page.waitForFunction(
    () => window.boundaryQA.renderedVehicles.get("legacy-ocean").x < 145,
    null,
    { timeout: 20000 },
  );
  await page.keyboard.up("s");
  const recovered = await page.evaluate(() => {
    const q = window.boundaryQA;
    return {
      pose: q.renderedVehicles.get("legacy-ocean"),
      door: q.vehicleAccess.get("legacy-ocean")?.(0),
    };
  });
  assert.equal(recovered.pose.y, 0, "old sunken asphalt pose recovers to road level");
  assert(recovered.door, "driver can leave after reversing to land");
  report.push({ legacyRecovery: recovered });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => {
    const q = window.boundaryQA;
    q.useMobility.setState({
      vehicles: [
        {
          id: "large-warning",
          model: "car",
          color: "#39bedc",
          revision: 1,
          pose: { x: 140, y: 0, z: 20, yaw: Math.PI / 2, speed: 0 },
          occupants: [{ connectionId: q.connectionId, seat: 0, status: "active" }],
        },
      ],
    });
  });
  await page.locator(".vehicle-boundary-warning").waitFor({ state: "visible" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: output + "/warning-large.png" });
  for (const [width, height] of [
    [844, 390],
    [740, 360],
    [640, 320],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    const controls = [];
    for (const name of ["Gas kendaraan", "Mundur kendaraan", "Rem kendaraan"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      assert(
        b &&
          b.width >= 44 &&
          b.height >= 44 &&
          b.x >= 0 &&
          b.y >= 0 &&
          b.x + b.width <= width &&
          b.y + b.height <= height,
      );
      controls.push(b);
    }
    controls.push(await page.locator("[data-context-action] button").first().boundingBox());
    controls.push(await page.locator(".vehicle-hud").boundingBox());
    controls.push(await page.locator("[data-mobile-joystick]").boundingBox());
    for (let i = 0; i < controls.length; i++)
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i],
          b = controls[j];
        assert(
          a &&
            b &&
            !(
              a.x < b.x + b.width &&
              a.x + a.width > b.x &&
              a.y < b.y + b.height &&
              a.y + a.height > b.y
            ),
          `${width}×${height}: driving controls ${i}/${j} do not overlap`,
        );
      }
    await page.screenshot({ path: output + `/reverse-controls-${width}.png` });
  }
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify({ report, errors }, null, 2));
  console.log(
    "PASS: no Finish test button; four road limits warn and withstand held gas; touch reverse; old sunken convertible reverses from deep ocean and can exit; three touch viewport sizes",
  );
} catch (error) {
  console.log(
    await page.evaluate(() => ({
      poses: [...(window.boundaryQA?.renderedVehicles ?? [])],
      input: window.boundaryQA?.useVehicleInput.getState(),
      sample: window.obbyQA?.sample,
      vehicles: window.boundaryQA?.useMobility.getState().vehicles,
    })),
  );
  await page.screenshot({ path: output + "/failure.png" });
  throw error;
} finally {
  await browser.close();
  await server.close();
}
