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
      () => window.obbyQA?.ready && window.mobility?.getState().vehicles?.length === 11,
      null,
      { timeout: 30000 },
    );
  }
  report.shopParking = [];
  for (const slot of [2, 3]) {
    const v = await driver.evaluate(slot=>window.mobility.getState().vehicles[slot], slot);
    assert(Math.abs(v.pose.x - (slot===2?11:13.3))<.01 && Math.abs(v.pose.z-5.7)<.01,"two public bikes start at shop");
    // Walking up from the sidewalk (no exact door placement) must offer "Naik" as the primary action.
    for (const at of [[v.pose.x + 1.4, .93, v.pose.z], [v.pose.x, .93, v.pose.z + 2.6], [v.pose.x - 1.4, .93, v.pose.z]]) {
      await driver.evaluate(p=>window.obbyQA.place(...p),at);
      await driver.waitForTimeout(500);
      const ids = await driver.evaluate(()=>window.contextActionIds());
      assert.equal(ids[0], "vehicle:mount", `shop bike ${slot} at ${at}: ${JSON.stringify(ids)}`);
    }
    for (const [page,seat] of [[driver,0],[rider,1]]) {
      const door = await page.evaluate(({id,seat})=>window.vehicleDoor(id,seat),{id:v.id,seat});
      assert(door, `shop bike ${slot}: seat ${seat} has clear access`);
      await page.evaluate(p=>window.obbyQA.place(...p),door);
    }
    await driver.waitForTimeout(650);
    await driver.keyboard.press("KeyF");
    await driver.waitForFunction(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants[0]?.transition?.phase==="seated",v.id);
    await driver.getByRole("button",{name:"Ajak bonceng",exact:true}).click();
    await rider.getByRole("button",{name:"Terima",exact:true}).click();
    await driver.waitForFunction(id=>{const v=window.mobility.getState().vehicles.find(v=>v.id===id);return v.occupants.length===2&&v.occupants.every(s=>s.transition?.phase==="seated");},v.id);
    await driver.screenshot({path:`${output}/shop-bike-${slot}-boarded.png`});
    const start=await driver.evaluate(id=>window.ridePose(id),v.id);
    await driver.keyboard.down("KeyW"); await driver.waitForTimeout(850); await driver.keyboard.up("KeyW");
    await driver.keyboard.down("Space"); await driver.waitForTimeout(650); await driver.keyboard.up("Space");
    const end=await driver.evaluate(id=>window.ridePose(id),v.id);
    assert(Math.hypot(end.x-start.x,end.z-start.z)>.4,`shop bike drives out of its bay: ${JSON.stringify({start,end,input:await driver.evaluate(()=>window.vehicleInput.getState()),seat:await driver.evaluate(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants,v.id)})}`);
    await driver.keyboard.press("KeyF");
    await driver.waitForFunction(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants.length===0,v.id);
    await rider.waitForFunction(id=>window.mobility.getState().vehicles.find(v=>v.id===id).occupants.length===0,v.id);
    report.shopParking.push({slot,model:v.model,start,end,partyExit:true});
  }
  console.log("PASS: both shop bikes board two players, drive out and release passengers");
  await writeFile(output+"/parking.json",JSON.stringify(report.shopParking,null,2));
  await driver.evaluate(async()=>{await fetch("/mobility-api/qa/vehicles",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});await window.mobilityCommand("read");});
  // The tall roof overlaps the camera sweep origin; random hatchbacks hide that regression.
  execFileSync("php", ["-r", '(new PDO("sqlite:".$argv[1]))->exec("UPDATE world_vehicles SET model = CASE WHEN slot = 0 THEN \'mpv\' ELSE \'sport-bike\' END WHERE slot IN (0,2)");', database]);
  await driver.evaluate(() => window.mobilityCommand("read"));
  await rider.waitForTimeout(1200);
  if (!process.env.QA_MOTORS_ONLY) {
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
  for (const kind of ["convertible", "bajaj", "jeepney", "sport", "double-cabin"]) {
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
  }
  const bike = await driver.evaluate(() => window.mobility.getState().vehicles[2]);
  assert.equal(bike.model,"sport-bike","touch scenario uses Sport");
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
  await driver.bringToFront();
  const actions = Object.fromEntries(
    ["nos", "horn", "exit"].map((action) => [
      action,
      driver.locator(`[data-vehicle-drive-action="${action}"]`),
    ]),
  );
  const bounds = {
    nos: await actions.nos.boundingBox(),
    horn: await actions.horn.boundingBox(),
    exit: await actions.exit.boundingBox(),
    gauge: await driver.locator(".vehicle-gauge").boundingBox(),
    stick: await driver.locator("[data-mobile-joystick]").boundingBox(),
  };
  const overlaps = (a, b) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const [name, box] of Object.entries(bounds)) {
    assert(box, `${name} is visible`);
    assert(box.x >= 0 && box.x + box.width <= 844 && box.y >= 0 && box.y + box.height <= 390);
    for (const [other, peer] of Object.entries(bounds))
      if (name !== other && peer) assert(!overlaps(box, peer), `${name}/${other} do not overlap`);
  }
  for (const action of ["nos", "horn", "exit"])
    assert(bounds[action].width >= 44 && bounds[action].height >= 44, `${action} meets touch size`);
  assert.equal(await driver.locator("[data-mobile-gas], [data-mobile-brake], [data-mobile-reverse]").count(), 0);

  await driver.evaluate((id) => {
    window.vehicleJumps.set(id, { ...window.ridePose(id), x: 84, z: 19, yaw: Math.PI / 2, speed: 0 });
    window.qaHornCount = 0;
    window.qaHornBus = new BroadcastChannel("world-vehicles-qa");
    window.qaHornBus.onmessage = ({ data }) => {
      if (data.event === "horn") window.qaHornCount++;
    };
  }, bike.id);
  await driver.waitForFunction((id) => window.ridePose(id).x >= 83, bike.id);
  const beforeBike = await driver.evaluate((id) => window.ridePose(id), bike.id);
  const cdp = await context.newCDPSession(driver);
  const center = (box, id) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2, id });
  const stick = center(bounds.stick, 1);
  const horn = center(bounds.horn, 2);
  const nos = center(bounds.nos, 3);
  const gas = { ...stick, y: stick.y - 54 };
  const touch = (type, ...touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });

  await touch("touchStart", stick);
  await touch("touchMove", { ...gas, x: gas.x + 21 });
  await driver.waitForFunction(() => {
    const { throttle, steer } = window.vehicleInput.getState();
    return throttle > 0.7 && steer > 0.2;
  });
  await driver.waitForFunction((before) => Math.abs(window.ridePose(before.id).yaw - before.yaw) > 0.025, {
    id: bike.id,
    yaw: beforeBike.yaw,
  });
  await touch("touchMove", { ...gas, x: gas.x - 21 });
  await driver.waitForFunction(() => window.vehicleInput.getState().steer < -0.2);
  await touch("touchMove", gas);
  await touch("touchStart", gas, horn, nos);
  await driver.waitForFunction(() => {
    const { throttle, boostUntil } = window.vehicleInput.getState();
    return throttle > 0.9 && boostUntil > performance.now() && window.qaHornCount > 0;
  });
  await driver.waitForFunction((id) => window.ridePose(id).speed > 10.15, bike.id);
  const boostedBike = await driver.evaluate((id) => window.ridePose(id), bike.id);
  assert(boostedBike.speed <= 11.8, "NOS stays within server speed limits");
  assert(await actions.nos.isDisabled(), "NOS cannot stack while active or recharging");
  await touch("touchEnd");
  await driver.waitForFunction(() => window.vehicleInput.getState().throttle === 0);
  await touch("touchStart", stick);
  await touch("touchMove", { ...stick, y: stick.y + 54 });
  await driver.waitForFunction(() => window.vehicleInput.getState().brake);
  await driver.waitForFunction((id) => window.ridePose(id).speed < -0.2, bike.id);
  const afterBike = await driver.evaluate((id) => window.ridePose(id), bike.id);
  assert(Math.hypot(afterBike.x - beforeBike.x, afterBike.z - beforeBike.z) > 1);
  await driver.evaluate(() => window.dispatchEvent(new Event("blur")));
  await driver.waitForFunction(() => {
    const { throttle, steer } = window.vehicleInput.getState();
    return throttle === 0 && steer === 0;
  });
  await touch("touchCancel");
  await actions.nos.waitFor({ state: "visible" });
  await driver.waitForFunction(() => !document.querySelector('[data-vehicle-drive-action="nos"]').disabled);
  report.multitouch = { analog: true, hornWithThrottle: true, nos: true, reverse: true, blur: true };
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
  report.bike = { beforeBike, boostedBike, afterBike, controls: bounds, disconnectEjected: true };
  assert.deepEqual(errors, []);
  await writeFile(output + "/report.json", JSON.stringify({ report, errors }, null, 2));
  console.log(
    "PASS: server consent, synchronized passenger, analog steering, NOS, horn, braking and reverse",
  );
} finally {
  await browser?.close();
  await server.close();
  php.kill();
  await writeFile("/tmp/world-vehicles-qa-backend.log", phpLog);
  await unlink(database).catch(() => {});
}
