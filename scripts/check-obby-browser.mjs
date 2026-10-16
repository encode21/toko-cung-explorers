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
const output = process.env.OBBY_QA_OUTPUT || "/tmp/toko-obby-qa";
const port = Number(process.env.OBBY_QA_PORT || 4247);
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
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
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
    const settleOn = async (id) => {
      await page.waitForFunction(
        (id) => {
          const s = window.obbyQA.sample;
          return s.support === id && Math.abs(s.vy) < 0.12;
        },
        id,
        { timeout: 4000 },
      );
    };
    // This is the sole initial setup teleport, to the existing west approach at ground level.
    // Entering Start and every subsequent crossing use genuine input.
    await page.evaluate(() => {
      window.obby.getState().reset();
      window.obbyQA.place(27, 0.83, -17.5);
    });
    await page.waitForFunction(() => Math.abs(window.obbyQA.sample.x - 27) < 0.01);
    const platforms = await page.evaluate(() => window.obbyQA.platforms);
    await walkTo("x", platforms[0].x);
    await settleOn(platforms[0].id);
    await page.waitForFunction(() => window.obby.getState().status === "active");
    // A stationary jump isolates the existing impulse, expressive pose and camera follow.
    const jumpStart = await sample();
    await jump();
    await page.waitForFunction(() => window.obbyQA.sample.vy > 1.5);
    await page.screenshot({ path: `${output}/${label}-jump-takeoff.png` });
    await page.waitForFunction((base) => window.obbyQA.sample.y > base + 0.75, jumpStart.y);
    await page.screenshot({ path: `${output}/${label}-jump-air.png` });
    await page.waitForFunction(() => window.obbyQA.sample.vy < -1);
    await page.screenshot({ path: `${output}/${label}-jump-fall.png` });
    await settleOn(platforms[0].id);
    const jumpEnd = await sample();
    const jumpTrace = await page.evaluate(
      ({ start, end }) => window.obbyQA.samples.filter((s) => s.at >= start && s.at <= end),
      { start: jumpStart.at, end: jumpEnd.at },
    );
    const rise = Math.max(...jumpTrace.map((s) => s.y)) - jumpStart.y;
    assert(rise > 0.8 && rise < 1.2, `existing jump height remains about 1m (${rise})`);
    const cameraStep = Math.max(
      ...jumpTrace
        .slice(1)
        .map((s, i) =>
          Math.hypot(...s.camera.map((value, axis) => value - jumpTrace[i].camera[axis])),
        ),
    );
    assert(cameraStep < 0.6, `normal jump camera has no teleport-like frame (${cameraStep})`);
    await page.screenshot({ path: `${output}/${label}-jump-land.png` });
    const crossings = [];
    for (let index = 1; index < platforms.length; index++) {
      const a = platforms[index - 1],
        b = platforms[index];
      const axis = Math.abs(b.x - a.x) > Math.abs(b.z - a.z) ? "x" : "z";
      const other = axis === "x" ? "z" : "x";
      const dimension = axis === "x" ? "width" : "depth";
      const otherDimension = axis === "x" ? "depth" : "width";
      const sign = Math.sign(b[axis] - a[axis]);
      const low = Math.max(
        a[other] - a[otherDimension] / 2 + 0.4,
        b[other] - b[otherDimension] / 2 + 0.4,
      );
      const high = Math.min(
        a[other] + a[otherDimension] / 2 - 0.4,
        b[other] + b[otherDimension] / 2 - 0.4,
      );
      assert(low <= high, `route needs a clear alignment corridor: ${a.id} -> ${b.id}`);
      await walkTo(other, (low + high) / 2);
      const sourceEdge = a[axis] + (sign * a[dimension]) / 2;
      const targetEdge = b[axis] - (sign * b[dimension]) / 2;
      const gap = sign * (targetEdge - sourceEdge);
      if (gap > 0.08 || b.top > a.top + 0.1) {
        await walkTo(axis, sourceEdge - sign * (mobile ? 0.65 : 0.4));
        await settleOn(a.id);
        const before = await sample();
        const target = targetEdge + sign * Math.min(mobile ? 0.5 : 0.65, b[dimension] / 3);
        await move(axis, sign);
        await jump();
        await page.waitForFunction(() => window.obbyQA.sample.vy > 1.5, null, { timeout: 2000 });
        await page.waitForFunction(
          ({ axis, target, sign }) => sign * (window.obbyQA.sample[axis] - target) >= -0.03,
          { axis, target, sign },
          { timeout: 2000 },
        );
        await stop();
        await settleOn(b.id);
        const after = await sample();
        assert.equal(
          after.respawns,
          before.respawns,
          `${a.id} -> ${b.id} must land without rescue`,
        );
        crossings.push({ from: a.id, to: b.id, gap: Number(gap.toFixed(2)), landed: true });
      } else {
        await walkTo(axis, b[axis]);
        await settleOn(b.id);
        crossings.push({ from: a.id, to: b.id, bridge: true, landed: true });
      }
      await page.waitForFunction((index) => window.obby.getState().step >= index, index, {
        timeout: 2500,
      });
      console.log(`${label}: ${a.id} -> ${b.id}`);
      // Natural falls from every storey preserve that checkpoint, including high falls near Start.
      if (b.kind === "checkpoint") {
        const checkpoint = await page.evaluate(() => window.obby.getState().checkpoint);
        const before = await sample();
        await move(b.x < 33 || b.x > 48 ? "x" : "z", b.x < 33 || b.z < -26 ? -1 : 1);
        await page.waitForFunction(
          (count) => window.obbyQA.sample.respawns > count,
          before.respawns,
          { timeout: 5000 },
        );
        await stop();
        await settleOn(b.id);
        assert.equal(await page.evaluate(() => window.obby.getState().checkpoint), checkpoint);
        assert.equal(await page.evaluate(() => window.obby.getState().step), index);
        await page.screenshot({ path: `${output}/${label}-${b.id}.png` });
      }
      if (index === 5) {
        await page.screenshot({ path: `${output}/${label}-course.png` });
        const tracker = page.locator("[data-obby-progress]");
        await tracker.waitFor();
        const bounds = await tracker.boundingBox();
        assert(
          bounds.x >= 0 &&
            bounds.y >= 0 &&
            bounds.x + bounds.width <= width &&
            bounds.y + bounds.height <= height,
          "progress stays inside viewport",
        );
        if (mobile) {
          assert.equal(
            await page.locator("[data-mobile-jump]").count(),
            1,
            "one existing jump control",
          );
          for (const selector of [
            "[data-mobile-jump]",
            "[data-mobile-joystick]",
            "[data-side-menu]",
          ]) {
            const control = await page.locator(selector).first().boundingBox();
            if (!control) continue;
            const overlaps =
              bounds.x < control.x + control.width &&
              bounds.x + bounds.width > control.x &&
              bounds.y < control.y + control.height &&
              bounds.y + bounds.height > control.y;
            assert.equal(overlaps, false, `progress clears ${selector}`);
          }
        }
      }
      if (b.kind === "moving") {
        const before = await page.evaluate(
          (index) => ({
            player: window.obbyQA.sample,
            platform: window.obbyQA.platform(index),
          }),
          index,
        );
        await page.waitForTimeout(3000);
        const after = await page.evaluate(
          (index) => ({
            player: window.obbyQA.sample,
            platform: window.obbyQA.platform(index),
          }),
          index,
        );
        assert.equal(after.player.support, b.id, "standing player stays on moving platform");
        assert.equal(
          after.player.respawns,
          before.player.respawns,
          "moving platform does not drop standing player",
        );
        assert(
          Math.abs(after.player.z - before.player.z - (after.platform.z - before.platform.z)) <
            0.18,
          "player rides kinematic platform displacement",
        );
      }
    }
    await page.waitForFunction(() => window.obby.getState().status === "complete");
    const completion = await page.evaluate(() => window.completion.getState().result);
    assert.equal(completion.theme, "plaza-obby");
    assert.equal(
      completion.xpAwarded + completion.clueXp + completion.pointAwarded,
      0,
      "no fictional rewards",
    );
    await page.screenshot({ path: `${output}/${label}-finish.png` });
    assert.deepEqual(errors, []);
    const frames = await page.evaluate(() => window.obbyQA.samples);
    const jumpFrames = frames.filter((s) => s.anim === "Jump");
    assert(jumpFrames.length > 3, "actual local jump animation is transmitted");
    const requests = await page.evaluate(() => window.obbyRequests);
    assert(
      !requests.some((request) => /reward|buy|claim/.test(request.operation)),
      "practice finish never mutates wallet",
    );
    report.push({
      label,
      viewport: { width, height },
      physicsHz,
      passed: true,
      entranceRamp: true,
      jumpRise: rise,
      maxStationaryJumpCameraStep: cameraStep,
      crossings,
      checkpointRescues: platforms.filter((p) => p.kind === "checkpoint").map((p) => p.id),
      finishHeight: platforms.at(-1).top,
      samples: frames.length,
      errors,
    });
    await writeFile(`${output}/${label}-samples.json`, JSON.stringify(frames));
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
  `PASS real obby desktop/mobile traversal, checkpoint rescue, finish and existing controls; ${output}`,
);
