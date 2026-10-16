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
const output = process.env.SWIM_QA_OUTPUT || "/tmp/toko-swim-qa";
const port = Number(process.env.SWIM_QA_PORT || 4261);
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
  ]) {
    const label = mobile ? "mobile-landscape" : "desktop";
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/?world`);
    await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
    if (mobile) {
      await page.getByRole("button", { name: "Jelajah", exact: true }).tap();
      await page.getByRole("button", { name: /Pantai Cung/ }).tap();
    } else {
      await page.getByRole("button", { name: "Jelajah", exact: true }).click();
      await page.getByRole("button", { name: /Pantai Cung/ }).click();
    }
    assert.equal(await page.evaluate(() => window.game.getState().waypoint), "venue-beach");
    const physicsHz = await page.evaluate(() => window.obbyQA.physicsHz);
    const expectedPhysicsHz = mobile ? 40 : 60;
    assert(
      Math.abs(physicsHz - expectedPhysicsHz) < 0.001,
      `${label}: Rapier must use production ${expectedPhysicsHz} Hz, measured ${physicsHz}`,
    );
    const cdp = mobile ? await page.context().newCDPSession(page) : null;
    const jumpBounds = mobile ? await page.locator("[data-mobile-jump]").boundingBox() : null;
    let heldKey = null;
    let touchPoint = null;
    let origin = null;
    const stop = async () => {
      if (heldKey) await page.keyboard.up(heldKey);
      heldKey = null;
      if (touchPoint)
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchPoint = null;
      origin = null;
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
    };
    const move = async (axis, sign) => {
      if (!mobile) {
        const key = axis === "x" ? (sign > 0 ? "d" : "a") : sign > 0 ? "s" : "w";
        if (heldKey === key) return;
        await stop();
        heldKey = key;
        await page.keyboard.down(key);
      } else {
        await stop();
        const ring = await page.locator("[data-mobile-joystick]").boundingBox();
        origin = { x: ring.x + ring.width / 2, y: ring.y + ring.height / 2 };
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ id: 1, ...origin }],
        });
        const active = await page.locator("[data-mobile-joystick]").boundingBox();
        origin = { x: active.x + active.width / 2, y: active.y + active.height / 2 };
        touchPoint = {
          id: 1,
          x: origin.x + (axis === "x" ? sign * 40 : 0),
          y: origin.y + (axis === "z" ? sign * 40 : 0),
        };
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [touchPoint],
        });
      }
    };
    const jump = async () => {
      if (!mobile) await page.keyboard.press("Space");
      else if (!touchPoint) await page.locator("[data-mobile-jump]").tap();
      else {
        const rect = jumpBounds;
        const point = { id: 2, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [...(touchPoint ? [touchPoint] : []), point],
        });
        // Keep both fingers down through flight; touchEnd releases all CDP contacts.
      }
    };
    const sample = () => page.evaluate(() => window.obbyQA.sample);
    const walkTo = async (axis, value) => {
      const before = await sample();
      if (Math.abs(before[axis] - value) < 0.07) return;
      const sign = Math.sign(value - before[axis]);
      await move(axis, sign);
      await page.waitForFunction(
        ({ axis, value, sign }) => sign * (window.obbyQA.sample[axis] - value) >= -0.04,
        { axis, value, sign },
        { timeout: 4000 },
      );
      await stop();
    };
    // One initial placement on the dry approach; all transitions below use real keyboard/touch input.
    await page.evaluate(() => window.obbyQA.place(-45, 0.84, -29));
    await page.waitForFunction(() => Math.abs(window.obbyQA.sample.x + 45) < 0.1);
    await page.waitForTimeout(700);
    const dry = await sample();
    assert(!dry.anim?.startsWith("Swim"));
    await page.screenshot({ path: `${output}/${label}-dry.png` });
    await walkTo("z", -32.8);
    await page.waitForTimeout(500);
    const shallow = await sample();
    assert(!shallow.anim?.startsWith("Swim"), "shallow water remains walkable");
    assert(shallow.y < dry.y - 0.15, "character follows the actual sloping seabed");
    await page.screenshot({ path: `${output}/${label}-shallow.png` });
    await walkTo("z", -38);
    await page.waitForFunction(() => window.obbyQA.sample.anim === "SwimIdle");
    await page.waitForTimeout(2500);
    const floating = await sample();
    assert(Math.abs(floating.y + 0.18) < 0.09, "idle buoyancy holds the surface");
    await page.screenshot({ path: `${output}/${label}-swim.png` });
    const strokeStart = await sample();
    await jump();
    await page.waitForTimeout(600);
    const stroke = await page.evaluate(
      (at) => window.obbyQA.samples.filter((s) => s.at >= at),
      strokeStart.at,
    );
    assert(
      Math.max(...stroke.map((s) => s.y)) > strokeStart.y + 0.08,
      "existing jump input paddles upward",
    );
    assert(
      stroke.every((s) => s.anim === "Swim" || s.anim === "SwimIdle"),
      "paddle does not flash a land jump",
    );
    await walkTo("x", -42);
    await walkTo("z", -31.2);
    await page.waitForTimeout(500);
    assert(!(await sample()).anim?.startsWith("Swim"), "swim exits in shallows");
    await walkTo("z", -29);
    await page.waitForTimeout(500);
    const exited = await sample();
    assert(
      exited.y > 0.7 && !exited.anim?.startsWith("Swim"),
      "exit returns to grounded locomotion",
    );
    await jump();
    await page.waitForFunction(() => window.obbyQA.sample.vy > 2, null, { timeout: 2500 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${output}/${label}-exit.png` });
    // Water below a solid pier must not activate swimming. Walk off its end into deep water.
    await walkTo("z", -27.8);
    await walkTo("x", -48);
    await walkTo("z", -35.5);
    assert(!(await sample()).anim?.startsWith("Swim"), "standing on pier is dry");
    await walkTo("z", -39);
    await page.waitForFunction(() => window.obbyQA.sample.anim?.startsWith("Swim"));
    await walkTo("x", -53.5);
    await page.waitForTimeout(500);
    assert((await sample()).anim?.startsWith("Swim"), "the former west rim is now open sea");
    await walkTo("x", -61.5);
    await page.waitForTimeout(500);
    const boundary = await sample();
    assert(
      boundary.x < -60 && boundary.anim?.startsWith("Swim"),
      "swimmers pass the old world wall into the ocean",
    );
    await page.evaluate(() => window.obbyQA.place(-90, 0.5, -85));
    await page.waitForFunction(() => window.obbyQA.sample.anim === "SwimIdle");
    await page.waitForTimeout(700);
    assert(
      Math.abs((await sample()).y + 0.18) < 0.09,
      "open ocean beyond the coastal mesh still supports swimming",
    );
    await page.evaluate(() => window.obbyQA.place(-30, 1.5, -90));
    await page.waitForTimeout(1200);
    const offshoreRoad = await sample();
    assert(
      offshoreRoad.y > 0.7 && !offshoreRoad.anim?.startsWith("Swim"),
      "offshore road has a solid deck",
    );
    await page.evaluate(() => window.obbyQA.place(-34.2, 1.5, -90));
    await page.waitForTimeout(1200);
    assert(
      (await sample()).y > 0.7 && !(await sample()).anim?.startsWith("Swim"),
      "offshore sidewalk has a solid deck",
    );
    await page.evaluate(() => window.obbyQA.place(-42, 0.85, -28));
    await page.evaluate(() => (window.obbyQA.beachOverview = true));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${label}-beach-overview.png` });
    assert.deepEqual(errors, []);
    if (mobile) assert.equal(await page.locator("[data-mobile-jump]").count(), 1);
    report.push({
      label,
      passed: true,
      physicsHz,
      dry,
      shallow,
      floating,
      exited,
      boundary,
      paddleRise: Math.max(...stroke.map((s) => s.y)) - strokeStart.y,
      pierDry: true,
      openOcean: true,
      offshoreRoad,
      offshoreSidewalkDry: true,
      errors,
    });
    await page.close();
  }
} catch (error) {
  for (const context of browser?.contexts() ?? [])
    for (const page of context.pages()) {
      await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
      await writeFile(
        `${output}/failure-state.json`,
        JSON.stringify(
          await page
            .evaluate(() => ({
              state: window.obby?.getState(),
              sample: window.obbyQA?.sample,
              samples: window.obbyQA?.samples?.slice(-120),
            }))
            .catch(() => ({})),
          null,
          2,
        ),
      );
    }
  throw error;
} finally {
  await browser?.close();
  await server.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(
  `PASS swimming desktop/mobile: dry, shallow, buoyancy, paddle, pier and exits; ${output}`,
);
