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
const output = process.env.FISHING_QA_OUTPUT || "/tmp/toko-fishing-qa";
const port = Number(process.env.FISHING_QA_PORT || 4253);
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
  for (const [width, height, mobile] of [
    [1280, 720, false],
    [740, 360, true],
  ].filter(([, , mobile]) => !process.env.FISHING_QA_MOBILE_ONLY || mobile)) {
    const label = mobile ? "mobile-landscape" : "desktop";
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/?world&fishing`);
    await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
    const cdp = await page.context().newCDPSession(page);
    let held = null,
      origin = null;
    const stop = async () => {
      if (held) await page.keyboard.up(held);
      held = null;
      if (origin) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      origin = null;
      await page.waitForTimeout(120);
    };
    const move = async (axis, sign, radius = 0.9) => {
      await stop();
      if (!mobile) {
        held = axis === "x" ? (sign > 0 ? "d" : "a") : sign > 0 ? "s" : "w";
        await page.keyboard.down(held);
      } else {
        const rect = await page.locator("[data-mobile-joystick]").boundingBox();
        origin = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ id: 1, ...origin }],
        });
        const active = await page.locator("[data-mobile-joystick]").boundingBox();
        origin = { x: active.x + active.width / 2, y: active.y + active.height / 2 };
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              id: 1,
              x: origin.x + (axis === "x" ? sign * 44 * radius : 0),
              y: origin.y + (axis === "z" ? sign * 44 * radius : 0),
            },
          ],
        });
      }
    };
    const go = async (axis, target) => {
      const start = await page.evaluate(() => window.obbyQA.sample);
      const sign = Math.sign(target - start[axis]);
      await move(axis, sign);
      await page.waitForFunction(
        ({ axis, target, sign }) => sign * (window.obbyQA.sample[axis] - target) >= -0.08,
        { axis, target, sign },
        { timeout: 15000 },
      );
      await stop();
    };
    const act = async () => {
      if (mobile) await page.getByRole("button", { name: "Memancing · Fishing Spot" }).tap();
      else await page.keyboard.press("f");
      await page.waitForFunction(
        () => window.fishing.getState().open && !window.fishing.getState().busy,
      );
    };
    const press = async (name) => {
      const b =
        name === "Lempar kail"
          ? mobile
            ? page.locator("[data-mobile-fishing]")
            : page.locator("[data-fishing-hud]").getByRole("button", { name, exact: true })
          : page.getByRole("button", { name, exact: true });
      if (mobile) await b.tap();
      else await b.click();
    };
    // One setup placement, then genuine input along the unobstructed west-side route and ramp.
    await page.evaluate(() => {
      window.obbyQA.place(26.2, 0.95, -9);
      window.game.getState().setWaypoint("venue-fishing");
    });
    await go("z", -34);
    await go("x", 35);
    await go("z", -40);
    const reached = await page.evaluate(() => window.obbyQA.sample);
    assert(reached.y > 1 && reached.y < 1.2, `dock support: ${reached.y}`);
    assert.equal(await page.locator("[data-mobile-jump]").count(), mobile ? 1 : 0);
    await page.screenshot({ path: `${output}/${label}-dock.png` });
    await act();
    await page.getByLabel("Pilih pancing").selectOption("river");
    await press("Lempar kail");
    await page.waitForFunction(() => window.fishing.getState().data?.cast?.status === "waiting");
    await page.waitForTimeout(450);
    assert.equal(
      await page.evaluate(() => window.three.scene.getObjectByName("FishingTackle")?.visible),
      true,
      "rod, line and bobber visible while waiting",
    );
    if (mobile) {
      const controls = await page.locator(".fishing-actions button:visible").evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { width: r.width, height: r.height, top: r.top, bottom: r.bottom };
        }),
      );
      for (const rect of controls)
        assert(
          rect.width >= 44 && rect.height >= 44 && rect.top >= 0 && rect.bottom <= height,
          JSON.stringify(rect),
        );
      assert.equal(
        await page.locator("[data-mobile-jump]").count(),
        0,
        "jump is replaced during fishing",
      );
      const jumpRect = await page.locator("[data-mobile-fishing]").boundingBox();
      const stickRect = await page.locator("[data-mobile-joystick]").boundingBox();
      await page.screenshot({ path: `${output}/${label}-controls.png` });
      for (const rect of controls)
        assert(
          rect.bottom <= Math.min(jumpRect.y, stickRect.y),
          `fishing controls leave action and analog clear: ${JSON.stringify({ rect, jumpRect, stickRect })}`,
        );
    }
    await page.screenshot({ path: `${output}/${label}-fishing.png` });
    await page.waitForSelector('[data-fishing-phase="bite"]', { timeout: 7000 });
    if (mobile)
      assert.equal(
        await page.locator('[data-mobile-fishing][data-fishing-bite="true"]').count(),
        1,
      );
    await page.screenshot({ path: `${output}/${label}-bite.png` });
    await page.evaluate(() => {
      window.loseFishingResponse = true;
    });
    if (mobile) await page.locator("[data-mobile-fishing]").tap();
    else await page.keyboard.press("Space");
    await page.getByText("Respons terputus. Coba lagi.").waitFor();
    await press("Coba lagi");
    await page.waitForSelector('[data-fishing-phase="caught"]');
    const resultText = await page
      .locator(mobile ? "[data-fishing-catch]" : ".fishing-status")
      .innerText();
    for (const expected of ["Wader Madu", "Basic", "12.5 cm"])
      assert(resultText.includes(expected));
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => window.three.scene.getObjectByName("CaughtFish")?.visible),
      true,
      "authoritative fish is lifted from water",
    );
    await page.screenshot({ path: `${output}/${label}-catch.png` });
    await page.getByText("✓ Masuk inventory", { exact: false }).waitFor();
    await press("Koleksi ikan · 1");
    await page.getByRole("dialog").waitFor();
    await page.locator(".fishing-grid article").first().waitFor();
    assert.equal(await page.locator(".fishing-grid article").count(), 6);
    await page.screenshot({ path: `${output}/${label}-collection.png` });
    await page.getByRole("dialog").getByRole("button", { name: "Tutup" }).click();
    await page.evaluate(() => window.hud.getState().setSheet("phone"));
    await press("Inventory ikan");
    await page.getByRole("dialog").getByText("1 ekor", { exact: true }).waitFor();
    await press("Legendary");
    assert.equal(await page.locator(".fishing-grid article").count(), 1);
    await page.getByRole("dialog").getByText("Naga Danau").waitFor();
    await page.getByRole("dialog").getByRole("button", { name: "Tutup" }).click();
    await act();
    assert.equal(await page.evaluate(() => window.fishing.getState().data.collection[0].count), 1);
    // Late cast replies cannot reopen the HUD after moving away.
    await page.evaluate(() => {
      window.fishingDelay = 550;
    });
    await press("Lempar kail");
    await move("z", 1);
    await page.waitForFunction(() => !window.fishing.getState().open);
    await stop();
    await page.waitForTimeout(1250);
    assert.equal(
      await page.evaluate(
        () =>
          Object.values(window.fishingBackend.casts).filter((c) => c.status === "waiting").length,
      ),
      0,
    );
    assert.equal(await page.evaluate(() => window.fishing.getState().open), false);
    await page.evaluate(() => {
      window.fishingDelay = 60;
    });
    // Walk into the fishing lake from its eastern shore, swim, then walk out again.
    await page.evaluate(() => window.obbyQA.place(53.6, 0.9, -45));
    await page.waitForFunction(() => Math.abs(window.obbyQA.sample.x - 53.6) < 0.1);
    await go("x", 46);
    await page.screenshot({ path: `${output}/${label}-lake-entry.png` });
    await page.waitForFunction(() => window.obbyQA.sample.anim === "SwimIdle", null, {
      timeout: 5000,
    });
    const lake = await page.evaluate(() => window.obbyQA.sample);
    assert(lake.y > -0.3 && lake.y < 0.2, JSON.stringify(lake));
    await page.screenshot({ path: `${output}/${label}-lake-swim.png` });
    await go("x", 53.6);
    await page.waitForFunction(() => !window.obbyQA.sample.anim?.startsWith("Swim"));
    assert((await page.evaluate(() => window.obbyQA.sample.y)) > 0.6);
    // Existing open-space movement: actual stick edge vs middle, plus sensitivity independence.
    await page.evaluate(() => window.obbyQA.place(26.2, 0.95, -8));
    if (mobile) {
      await move("z", 1, 0.6);
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.touchDrive.getState().running), false);
      assert((await page.evaluate(() => Math.abs(window.obbyQA.sample.vz))) < 4.3);
      await stop();
      await page.evaluate(() => {
        window.settings.setState({ joystickSensitivity: 0.5 });
      });
      await move("z", -1, 1);
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(() => window.touchDrive.getState().running), true);
      assert((await page.evaluate(() => Math.abs(window.obbyQA.sample.vz))) > 7);
      const shift = async (radius) =>
        cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ id: 1, x: origin.x, y: origin.y - 44 * radius }],
        });
      await shift(0.85);
      assert.equal(await page.evaluate(() => window.touchDrive.getState().running), true);
      await shift(0.76);
      await page.waitForFunction(() => !window.touchDrive.getState().running, null, {
        timeout: 2000,
      });
      assert.equal(await page.evaluate(() => window.touchDrive.getState().running), false);
      await stop();
      assert.equal(await page.evaluate(() => window.touchDrive.getState().running), false);
      await page.evaluate(() => window.settings.setState({ joystickSensitivity: 1 }));
      await move("z", -1, 1);
    } else {
      await page.keyboard.down("Shift");
      await move("z", -1);
    }
    await page.waitForTimeout(450);
    const runPose = await page.evaluate(() => {
      const scene = window.three.scene;
      return {
        speed: Math.hypot(window.obbyQA.sample.vx, window.obbyQA.sample.vz),
        lean: scene.getObjectByName("Body")?.rotation.x,
        arm: scene.getObjectByName("RightArm")?.rotation.x,
        leg: scene.getObjectByName("RightLeg")?.rotation.x,
      };
    });
    assert(runPose.speed > 7, JSON.stringify(runPose));
    assert(runPose.lean > 0.09, JSON.stringify(runPose));
    await page.waitForTimeout(140);
    const swing = await page.evaluate(() => ({
      arm: window.three.scene.getObjectByName("RightArm")?.rotation.x,
      leg: window.three.scene.getObjectByName("RightLeg")?.rotation.x,
    }));
    assert(
      Math.abs(swing.arm - runPose.arm) > 0.1 && Math.abs(swing.leg - runPose.leg) > 0.1,
      "arms and legs visibly stride",
    );
    await page.screenshot({ path: `${output}/${label}-running.png` });
    await stop();
    if (!mobile) await page.keyboard.up("Shift");
    assert.deepEqual(errors, []);
    report.push({
      label,
      viewport: [width, height],
      physicsHz: await page.evaluate(() => window.obbyQA.physicsHz),
      dock: reached.y,
      catch: "Basic · 12.5 cm",
      retryCount: 1,
      runPose,
      errors,
    });
    await page.close();
  }
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
