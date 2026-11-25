// Real Player, camera, city geometry and traffic height regression checks.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/obby";
const output = process.env.GANG_LIFE_QA_OUTPUT || "/tmp/toko-gang-life-qa";
const port = Number(process.env.GANG_LIFE_QA_PORT || 4255);
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
    port,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();
const report = [];
let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 740, height: 360 } : { width: 1280, height: 720 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const frames = async (n) => {
      const start = await page.evaluate(() => window.obbyQA.frames);
      await page.waitForFunction(({ start, n }) => window.obbyQA.frames >= start + n, { start, n });
    };
    await page.goto(`http://127.0.0.1:${port}?world`);
    await page.waitForFunction(() => window.obbyQA?.ready);
    await page.evaluate(() => window.obbyQA.place(15.8, 0.83, 12.4));
    await frames(90);
    await page.evaluate(() => {
      window.obbyQA.samples = [];
    });
    await page.keyboard.down("a");
    await page.waitForFunction(() => window.obbyQA.sample.x < 5.7);
    await page.keyboard.up("a");
    const stairs = await page.evaluate(() => window.obbyQA.samples);
    assert(stairs.at(-1).y > 4, "player can still climb while holding the same direction");
    assert(
      Math.abs(stairs.at(-1).z - 12.4) < 0.4,
      "camera reframing must not redirect movement off stairs",
    );
    const maxJump = Math.max(
      ...stairs.slice(1).map((s, i) => Math.abs(s.camera[1] - stairs[i].camera[1])),
    );
    assert(maxJump < 0.8, `no sudden camera height clamp at stair entry: ${maxJump}`);
    await frames(90);
    await page.screenshot({ path: `${output}/${mobile ? "mobile" : "desktop"}-stairs.png` });

    await page.goto(`http://127.0.0.1:${port}?gang&gang-life`);
    await page.waitForFunction(() => window.obbyQA?.ready);
    await page.evaluate(() => window.startGangLifeFixture());
    await page.waitForFunction(() => window.three.scene.getObjectByName("GangResident:sayur"));
    await page.evaluate(() => {
      window.obbyQA.bridgeOverview = { eye: [6014, 11, 3025], target: [5992, 1, 3010] };
    });
    await frames(30);
    const labels = await page.evaluate(() => {
      const a = [];
      window.three.scene.traverse((o) => {
        if (o.name.startsWith("EntryRing:")) a.push(o.name);
      });
      return a;
    });
    assert(labels.includes("EntryRing:Masuk Warung Sari"));
    assert(labels.includes("EntryRing:Ke Toko Pindah · Kota #3"));
    await page.evaluate(() => window.npcScript.setState({ id: "gang-sayur" }));
    await frames(2);
    const stopped = await page.evaluate(() =>
      window.three.scene.getObjectByName("GangResident:sayur").position.toArray(),
    );
    await frames(120);
    const held = await page.evaluate(() =>
      window.three.scene.getObjectByName("GangResident:sayur").position.toArray(),
    );
    assert.deepEqual(held, stopped);
    await page.evaluate(() => window.npcScript.setState({ id: null }));
    await frames(5);
    const resumed = await page.evaluate(() =>
      window.three.scene.getObjectByName("GangResident:sayur").position.toArray(),
    );
    const resumedDistance = Math.hypot(...resumed.map((v, i) => v - stopped[i]));
    assert(
      resumedDistance > 0 && resumedDistance < 0.45,
      `NPC resumes from paused position: ${resumedDistance}`,
    );
    await page.evaluate(() => window.setDeliveryEta(Date.now() + 15000));
    await frames(5);
    const delivery = await page.evaluate(() => {
      const root = window.three.scene.getObjectByName("DeliveryTrip:37");
      const truck = root.getObjectByName("DeliveryVehicle");
      const p = truck.getWorldPosition(truck.position.clone());
      return {
        visible: root.visible,
        porter: root.getObjectByName("DeliveryPorter").visible,
        position: p.toArray(),
        blocked: window.spotBlocked(p.x, p.z, false, 1.15),
        traffic: window.deliveryTraffic(),
      };
    });
    assert(delivery.visible && delivery.porter);
    assert(delivery.blocked, "delivery truck has a solid body in its visible location");
    assert.equal(delivery.traffic.length, 1, "truck participates in traffic collision avoidance");
    await page.screenshot({ path: `${output}/${mobile ? "mobile" : "desktop"}-gang-delivery.png` });
    await page.evaluate(() => {
      window.obbyQA.bridgeOverview = { eye: [6000, 5.5, 3024], target: [6017, 2.8, 3010] };
    });
    await frames(2);
    await page.screenshot({ path: `${output}/${mobile ? "mobile" : "desktop"}-shop-status.png` });
    await page.evaluate(() => window.setDeliveryEta(Date.now() - 136000));
    await frames(3);
    assert.equal(
      await page.evaluate(() => window.deliveryTraffic().length),
      0,
      "departed truck releases the road",
    );

    await page.goto(`http://127.0.0.1:${port}?warung-delivery`);
    await page.waitForFunction(() => window.obbyQA?.ready);
    await page.evaluate(() => window.startWarungDeliveryFixture());
    await page.waitForFunction(() => window.three.scene.getObjectByName("DeliveryTrip:37"));
    await page.evaluate(() => {
      const root = window.three.scene.getObjectByName("WarungScene");
      window.obbyQA.bridgeOverview = {
        eye: [root.position.x, 3.1, root.position.z - 4.15],
        target: [root.position.x, 0.7, root.position.z + 1],
      };
      window.setDeliveryEta(Date.now() + 16000);
    });
    await frames(10);
    assert(await page.evaluate(() => window.three.scene.getObjectByName("DeliveryPorter").visible));
    await page.screenshot({
      path: `${output}/${mobile ? "mobile" : "desktop"}-serving-delivery.png`,
    });
    assert.deepEqual(errors, []);
    report.push({ mobile, maxCameraHeightJump: maxJump, resumedDistance, delivery });
    await page.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    `PASS stair movement/camera, NPC conversation pause/resume, gang signs/markers, delivery outside and while serving. ${output}`,
  );
} finally {
  await browser?.close();
  await server.close();
}
