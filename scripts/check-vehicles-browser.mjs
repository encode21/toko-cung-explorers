// Real Player + Rapier + production HUD. Only backend transport is a fixture.
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
const output = process.env.QA_OUTPUT || root + "/docs/qa/vehicles";
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
    "127.0.0.1:4519",
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
const port = 4265;
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
        target: "http://127.0.0.1:4519",
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
  const driver = await context.newPage(),
    rider = await context.newPage();
  for (const [page, name] of [
    [driver, "Pengemudi"],
    [rider, "Penumpang"],
  ]) {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", async (r) => {
      if (r.url().includes("mobility-api") && r.status() >= 400)
        console.log("HTTP", r.status(), await r.text());
    });
    await page.goto(`http://127.0.0.1:${port}/?world&vehicles&mobility&name=${name}`);
    await page.waitForFunction(
      () => window.obbyQA?.ready && window.mobility?.getState().vehicles?.length === 9,
      null,
      { timeout: 30000 },
    );
  }
  await driver.evaluate(async()=>{await fetch("/mobility-api/qa/vehicles",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});await window.mobilityCommand("read");});
  // The tall roof overlaps the camera sweep origin; random hatchbacks hide that regression.
  execFileSync("php", ["-r", '(new PDO("sqlite:".$argv[1]))->exec("UPDATE world_vehicles SET model = \'mpv\' WHERE slot = 0");', database]);
  await driver.evaluate(() => window.mobilityCommand("read"));
  await rider.waitForTimeout(1200);
  const vehicle = await driver.evaluate(() => window.mobility.getState().vehicles[0]);
  const target = await rider.evaluate(() => window.connectionId);
  for (const [p, side] of [
    [driver, 1.65],
    [rider, -1.65],
  ])
    await p.evaluate(({ v, side }) => window.obbyQA.place(v.pose.x + side, 0.93, v.pose.z), {
      v: vehicle,
      side,
    });
  await driver.waitForTimeout(1500);
  await driver.evaluate((id) => {
    const [x, y, z] = window.vehicleDoor(id, 0);
    window.doorObstacle = window.rapierWorld.createCollider(
      window.rapier.ColliderDesc.cuboid(.25, .8, .25).setTranslation(x, y, z),
    );
  }, vehicle.id);
  await driver.waitForTimeout(150);
  await driver.keyboard.press("KeyF");
  await driver.waitForTimeout(350);
  assert.equal(await driver.evaluate(() => window.mobility.getState().vehicles[0].occupants.length), 0, "Blocked door cannot reserve a seat");
  assert.equal(await driver.evaluate((id) => window.vehicleDoor(id, 0), vehicle.id), null);
  await driver.evaluate((v) => {
    window.rapierWorld.removeCollider(window.doorObstacle, true);
    window.obbyQA.place(v.pose.x + 1.65, .93, v.pose.z);
  }, vehicle);
  await driver.waitForTimeout(350);
  await driver.keyboard.press("KeyF");
  await driver.waitForTimeout(500);

  await driver.waitForFunction(() =>
    window.mobility.getState().vehicles[0].occupants.some((s) => s.seat === 0),
  );
  const enteringAt = await driver.evaluate(() => window.mobility.getState().vehicles[0].occupants[0].transition.startedAt);
  await driver.keyboard.press("KeyF");
  await driver.keyboard.press("KeyF");
  assert.equal(await driver.evaluate(() => window.mobility.getState().vehicles[0].occupants[0].transition.startedAt), enteringAt, "Repeated input keeps the original transition");
  await driver.getByRole("button", { name: "Ajak ikut", exact: true }).click();
  await rider.getByRole("button", { name: "Terima", exact: true }).waitFor();
  await rider.screenshot({ path: output + "/invitation.png" });
  await rider.getByRole("button", { name: "Terima", exact: true }).click();
  await driver.waitForFunction(
    () =>
      window.mobility.getState().vehicles[0].occupants.filter((s) => s.status === "active")
        .length === 2,
  );
  await driver.waitForFunction(() => window.mobility.getState().vehicles[0].occupants.every(s => !s.transition || s.transition.phase === "seated"));
  await driver.waitForTimeout(700);
  const cameraDistance = (page) => page.evaluate(() => {
    const v = window.mobility.getState().vehicles[0];
    const p = window.ridePose(v.id);
    return window.three.camera.position.distanceTo({ x: p.x, y: 2.3, z: p.z });
  });
  const driverCamera = await cameraDistance(driver), passengerCamera = await cameraDistance(rider);
  await driver.screenshot({ path: output + "/camera-seated.png" });
  assert(driverCamera > 5 && passengerCamera > 5, `Own roof must not collapse the camera: ${JSON.stringify({driverCamera,passengerCamera})}`);
  const cameraObstacles = {};
  for (const kind of ["wall", "other-vehicle"]) {
    await driver.evaluate((kind) => {
      const p = window.ridePose(window.mobility.getState().vehicles[0].id);
      const focus = window.three.camera.position.clone().set(p.x, 2.3, p.z);
      const direction = window.three.camera.position.clone().sub(focus).normalize();
      const point = focus.addScaledVector(direction, 3.5);
      const body = window.rapierWorld.createRigidBody(
        window.rapier.RigidBodyDesc.fixed().setTranslation(point.x, point.y, point.z),
      );
      body.userData = kind === "other-vehicle" ? { rideId: "qa-other-vehicle" } : {};
      window.rapierWorld.createCollider(window.rapier.ColliderDesc.cuboid(1, 1, .3), body);
      window.cameraObstacle = body;
    }, kind);
    await driver.waitForTimeout(900);
    cameraObstacles[kind] = await cameraDistance(driver);
    assert(cameraObstacles[kind] > 2 && cameraObstacles[kind] < 4, `${kind} must still obstruct the driving camera`);
    await driver.evaluate(() => window.rapierWorld.removeRigidBody(window.cameraObstacle));
    await driver.waitForTimeout(900);
    assert(await cameraDistance(driver) > 5, "Camera recovers after the obstacle clears");
  }
  await driver.screenshot({ path: output + "/driving-controls.png" });
  const start = await driver.evaluate((id) => window.ridePose(id), vehicle.id);
  await driver.keyboard.down("KeyW");
  await driver.waitForTimeout(1600);
  await driver.keyboard.up("KeyW");
  await driver.keyboard.down("Space");
  await driver.waitForTimeout(800);
  await driver.keyboard.up("Space");
  const end = await driver.evaluate((id) => window.ridePose(id), vehicle.id);
  assert(
    Math.hypot(end.x - start.x, end.z - start.z) > 2,
    `Vehicle must move under actual physics: ${JSON.stringify({start,end})}`,
  );
  await rider.waitForTimeout(700);
  const remote = await rider.evaluate((id) => window.ridePose(id), vehicle.id);
  assert(await cameraDistance(driver) > 5 && await cameraDistance(rider) > 5, "Camera stays outside the car while driving");
  assert(
    Math.hypot(remote.x - end.x, remote.z - end.z) < 0.6,
    "Vehicle pose converges across tabs",
  );
  const passenger = await rider.evaluate(() => window.game.getState().playerPos);
  assert(
    Math.hypot(passenger[0] - remote.x, passenger[2] - remote.z) < 1.5,
    "Passenger remains attached",
  );
  await rider.screenshot({ path: output + "/passenger.png" });
  await rider.keyboard.press("KeyE");
  await rider.waitForFunction(
    () =>
      !window.mobility
        .getState()
        .vehicles.some((v) => v.occupants.some((s) => s.connectionId === window.connectionId)),
  );
  await driver.waitForFunction(() => window.mobility.getState().vehicles[0].occupants.length === 1);
  await driver.keyboard.press("KeyF");
  await driver.waitForFunction(() => window.mobility.getState().vehicles[0].occupants.length === 0);
  await driver.waitForTimeout(1000);
  await driver.screenshot({ path: output + "/exited.png" });
  report.car = { start, end, remote, passenger, blockedDoor: true, repeatedInput: true, driverCamera, passengerCamera, cameraObstacles };
  report.newModels = {};
  for (const kind of ["convertible", "bajaj", "jeepney"]) {
    const v = await driver.evaluate(kind => window.mobility.getState().vehicles.find(v=>v.model===kind), kind);
    assert(v, kind + " is available in the shared pool");
    for (const [page, seat] of [[driver,0],[rider,1]]) {
      const door = await page.evaluate(({id,seat})=>window.vehicleDoor(id,seat), {id:v.id,seat});
      assert(door, kind + " spawn door is unobstructed");
      await page.evaluate(p=>window.obbyQA.place(...p),door);
    }
    await driver.waitForTimeout(650);
    await driver.keyboard.press("KeyF");
    await driver.waitForFunction(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants[0]?.transition?.phase==="seated", v.id);
    await driver.getByRole("button",{name:"Ajak ikut",exact:true}).click();
    await rider.getByRole("button",{name:"Terima",exact:true}).click();
    await driver.waitForFunction(id=>{const v=window.mobility.getState().vehicles.find(v=>v.id===id);return v.occupants.length===2&&v.occupants.every(s=>s.transition?.phase==="seated");},v.id);
    await driver.waitForTimeout(400);
    const start=await driver.evaluate(id=>window.ridePose(id),v.id);
    await driver.keyboard.down("KeyW");await driver.waitForTimeout(700);await driver.keyboard.up("KeyW");
    await driver.keyboard.down("Space");await driver.waitForTimeout(600);await driver.keyboard.up("Space");
    const end=await driver.evaluate(id=>window.ridePose(id),v.id);
    assert(Math.hypot(end.x-start.x,end.z-start.z)>.4,kind+" drives with actual physics");
    await driver.screenshot({path:output+"/"+kind+"-driving.png"});
    await driver.keyboard.press("KeyF");
    await rider.waitForFunction(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants.length===0,v.id);
    await driver.waitForFunction(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants.length===0,v.id);
    report.newModels[kind]={start,end,partyExit:true};
  }
  const bike = await driver.evaluate(() => window.mobility.getState().vehicles[2]);
  for (const [p, side] of [
    [driver, .85],
    [rider, -.85],
  ])
    await p.evaluate(({ v, side }) => window.obbyQA.place(v.pose.x + side, 0.93, v.pose.z - .32), {
      v: bike,
      side,
    });
  await driver.waitForTimeout(1300);
  await driver.keyboard.press("KeyE");
  await driver.waitForFunction(() => window.mobility.getState().vehicles[2].occupants.length === 1);
  await driver.getByRole("button", { name: "Ajak bonceng", exact: true }).click();
  await rider.getByRole("button", { name: "Terima", exact: true }).click();
  await driver.waitForFunction(
    () =>
      window.mobility.getState().vehicles[2].occupants.filter((s) => s.status === "active")
        .length === 2,
  );
  await driver.waitForFunction(()=>window.mobility.getState().vehicles[2].occupants.every(s=>s.transition?.phase==="seated"));
  const gas = await driver
    .getByRole("button", { name: "Gas kendaraan", exact: true })
    .boundingBox();
  const brake = await driver
    .getByRole("button", { name: "Rem kendaraan", exact: true })
    .boundingBox();
  const exit = await driver.locator("[data-context-action] button").first().boundingBox();
  assert(gas && brake && exit);
  const overlaps = (a, b) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  assert(!overlaps(gas, exit) && !overlaps(gas, brake), "Driving controls must not overlap");
  const beforeBike = await driver.evaluate((id) => window.ridePose(id), bike.id);
  const cdp = await context.newCDPSession(driver);
  const gasTouch = { x: gas.x + gas.width / 2, y: gas.y + gas.height / 2, id: 1 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [gasTouch] });
  await driver.waitForFunction(() => window.vehicleInput.getState().gasHeld);
  const stick = await driver.locator("[data-mobile-joystick]").boundingBox();
  assert(stick);
  const stickTouch = { x: stick.x + stick.width / 2, y: stick.y + stick.height / 2, id: 3 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [gasTouch, stickTouch],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [gasTouch, { ...stickTouch, x: stickTouch.x + 22 }],
  });
  await driver.waitForFunction(() => window.vehicleInput.getState().steer > 0.1);

  await driver.waitForTimeout(1100);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: brake.x + brake.width / 2, y: brake.y + brake.height / 2, id: 2 }],
  });
  await driver.waitForFunction(() => window.vehicleInput.getState().brakeHeld);
  await driver.waitForTimeout(600);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const afterBike = await driver.evaluate((id) => window.ridePose(id), bike.id);
  assert(
    Math.hypot(afterBike.x - beforeBike.x, afterBike.z - beforeBike.z) > 1,
    "Touch gas drives motorcycle",
  );
  assert(Math.abs(afterBike.speed) < 0.1, "Touch brake stops motorcycle");
  assert(Math.abs(afterBike.yaw) > 0.02, "Second touch steers while holding gas");
  await driver.screenshot({ path: output + "/motorcycle-touch.png" });
  await driver.evaluate(async () => {
    window.stopMobility();
    window.net.setState({ connected: false });
    await fetch("/mobility-api/qa/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: window.connectionId }),
    });
  });
  await rider.waitForFunction(() => window.mobility.getState().vehicles[2].occupants.length === 0);
  await rider.waitForTimeout(700);
  await rider.screenshot({ path: output + "/driver-disconnected.png" });
  report.bike = { beforeBike, afterBike, controls: { gas, brake, exit }, disconnectEjected: true };
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify({ report, errors }, null, 2));
  console.log(
    "PASS: two players, server consent, driving, synchronized passenger, brake and independent exits",
  );
} finally {
  await browser?.close();
  await server.close();
  php.kill();
  await writeFile("/tmp/world-vehicles-qa-backend.log", phpLog);
  await unlink(database).catch(() => {});
}
