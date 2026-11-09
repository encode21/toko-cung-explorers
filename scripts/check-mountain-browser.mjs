// Real physics, Player, mountain scenery and HUD; only backend transport is substituted.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = root + "/tests/fixtures/mountain";
const output = process.env.MOUNTAIN_QA_OUTPUT || "/tmp/tokocung-mountain-qa";
const port = Number(process.env.MOUNTAIN_QA_PORT || 4258);
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: fixture,
  cacheDir: "/tmp/tokocung-mountain-vite-cache",
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
      { find: "@/services/world/client", replacement: fixture + "/client.ts" },
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
let browser;
const report = [];
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
    await page.goto(`http://127.0.0.1:${port}/${mobile ? "" : "?world"}`);
    await page.waitForFunction(() => window.mountainQA?.ready, null, { timeout: 90000 });
    const plan = await page.evaluate(() => window.plan);
    assert(
      Math.abs((await page.evaluate(() => window.mountainQA.physicsHz)) - (mobile ? 40 : 60)) <
        0.01,
    );

    const place = async (point, offset = 1.05) => {
      await page.evaluate(
        ({ point, offset }) =>
          window.game.getState().requestTeleport([point[0], point[1] + offset, point[2]]),
        { point, offset },
      );
      await page.waitForFunction(
        (point) => {
          const s = window.mountainQA.sample;
          return (
            !window.game.getState().pendingTeleport &&
            Math.hypot(s.x - point[0], s.z - point[2]) < 0.2 &&
            Math.abs(s.vy) < 0.15
          );
        },
        point,
        { timeout: 6000 },
      );
    };
    const assertArrival = async (location) => {
      const [x, y, z] = plan[location].spawn;
      await page.waitForFunction(
        ({ x, z }) => {
          const p = window.mountainQA.sample;
          return (
            !window.mountain.getState().flight &&
            !window.game.getState().pendingTeleport &&
            Math.hypot(p.x - x, p.z - z) < 0.3
          );
        },
        { x, z },
        { timeout: 8000 },
      );
      // Region subscribers rerender after teleport; a transient destination is not an arrival.
      await page.waitForTimeout(800);
      const state = await page.evaluate(() => ({
        body: window.mountainQA.sample,
        position: window.game.getState().playerPos,
        pending: window.game.getState().pendingTeleport,
        action: window.currentAction()?.id,
      }));
      assert(
        Math.hypot(state.body.x - x, state.body.z - z) < 0.3,
        `${location}: body stays at destination after rerender`,
      );
      assert(Math.abs(state.body.y - y) < 0.2, `${location}: body rests on arrival pad`);
      assert(
        Math.hypot(state.position[0] - x, state.position[2] - z) < 0.3,
        `${location}: HUD position matches physics`,
      );
      assert.equal(state.pending, null);
      assert.equal(state.action, `helicopter:${location}`);
    };
    const cdp = mobile ? await page.context().newCDPSession(page) : null;
    let activeTouch = null;
    let walkKey = null;
    const startMove = async (dx, dz) => {
      if (!mobile) {
        walkKey = dx > 0 ? "d" : dx < 0 ? "a" : dz < 0 ? "w" : "s";
        return page.keyboard.down(walkKey);
      }
      const rect = await page.locator("[data-mobile-joystick]").boundingBox();
      const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 1, ...center }],
      });
      activeTouch = { id: 1, x: center.x + dx * 38, y: center.y + dz * 38 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [activeTouch] });
    };
    const startWalkLeft = () => startMove(-1, 0);
    const stopWalk = async () => {
      if (mobile) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      else if (walkKey) await page.keyboard.up(walkKey);
      activeTouch = null;
      walkKey = null;
    };
    const jumpNow = async () => {
      if (!mobile) return page.keyboard.press("Space");
      const b = await page.locator("[data-mobile-jump]").boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [activeTouch, { id: 2, x: b.x + b.width / 2, y: b.y + b.height / 2 }],
      });
      // CDP touchEnd releases every contact; keep both fingers down until landing.
    };
    const openMap = async () => {
      await page.getByRole("button", { name: "Perbesar peta" }).click();
    };
    const closeMap = async () => {
      await page.locator("[data-game-close]").last().click();
      await page.waitForFunction(
        () => !window.hud.getState().sheet && !window.gameUi.getState().panels,
      );
    };

    // City details stay nested under one of precisely two world destinations.
    await openMap();
    assert.equal(await page.locator("[data-map-view='world'] [data-destination]").count(), 2);
    await page.screenshot({ path: `${output}/${label}-world-map.png` });
    await page.getByRole("button", { name: "Lihat Pusat Kota", exact: true }).click();
    await page.locator("[data-map-view='city']").waitFor();
    await page.getByRole("button", { name: "Buka legenda peta" }).click();
    assert(
      (await page.getByRole("button", { name: "Toko Cung", exact: true }).count()) > 0,
      "city POIs preserved",
    );
    await closeMap();

    // On desktop the arrival pad is tested against the complete existing city collision.
    await place(plan.city.boarding);
    await page.waitForFunction(() => window.currentAction()?.id.startsWith("helicopter:"));
    await page.screenshot({ path: `${output}/${label}-city-helipad.png` });
    if (mobile) await page.locator("[data-context-action] button").first().click();
    else await page.keyboard.press("f");
    await page.waitForFunction(() => !!window.mountain.getState().flight);
    const flight = await page.evaluate(() => {
      const before = window.mountain.getState().flight.startedAt;
      window.boardHelicopter("city");
      window.boardHelicopter("city");
      return {
        before,
        after: window.mountain.getState().flight.startedAt,
        touchActive: window.touchDrive.getState().active,
      };
    });
    assert.equal(flight.before, flight.after, "duplicate boarding cannot restart the flight");
    assert.equal(flight.touchActive, false, "travel clears analog movement");
    await page.waitForFunction(
      () =>
        window.mountain.getState().flashlightOwned &&
        !window.mountain.getState().flight &&
        window.mountainQA.sample.x > 300,
      null,
      { timeout: 8000 },
    );
    await assertArrival("mountain");
    assert.equal(await page.evaluate(() => window.mountain.getState().checkpoint), 0);
    await page.screenshot({ path: `${output}/${label}-basecamp.png` });

    // Walk a real inclined section with keyboard / genuine joystick pointer input.
    const start = plan.trail[1],
      end = plan.trail[2];
    await place(start);
    const initialHeight = await page.evaluate(() => window.mountainQA.sample.y);
    await startWalkLeft();
    await page.waitForFunction((x) => window.mountainQA.sample.x <= x + 1, end[0], {
      timeout: 15000,
    });
    await stopWalk();
    const climbed = await page.evaluate(() => window.mountainQA.sample.y);
    assert(climbed > initialHeight + 2.8, "capsule climbs the real ramp without jumping or rescue");

    const challengesPassed = [];
    for (const challenge of plan.challenges) {
      const platforms = challenge.platforms,
        first = platforms[0],
        last = platforms.at(-1);
      const dx = Math.round(Math.sin(first.yaw)),
        dz = Math.round(Math.cos(first.yaw));
      await place([first.x, first.y, first.z]);
      if (challenge.kind === "stones") {
        for (let i = 0; i < platforms.length - 1; i++) {
          const a = platforms[i],
            b = platforms[i + 1];
          await startMove(dx, dz);
          await page.waitForFunction(
            ({ a, dx, dz }) => {
              const p = window.mountainQA.sample;
              return (p.x - a.x) * dx + (p.z - a.z) * dz >= 0.55;
            },
            { a, dx, dz },
            { timeout: 5000 },
          );
          await jumpNow();
          await page.waitForFunction(
            ({ b, dx, dz }) => {
              const p = window.mountainQA.sample;
              return (
                Math.abs((p.x - b.x) * dx + (p.z - b.z) * dz) < 0.9 &&
                Math.abs(p.y - b.y - 0.83) < 0.22 &&
                Math.abs(p.vy) < 0.3
              );
            },
            { b, dx, dz },
            { timeout: 5000 },
          );
          await stopWalk();
        }
      } else {
        await startMove(dx, dz);
        await page.waitForFunction(
          ({ last, dx, dz }) => {
            const p = window.mountainQA.sample;
            return (
              (p.x - last.x) * dx + (p.z - last.z) * dz >= -0.3 &&
              Math.abs(p.y - last.y - 0.83) < 0.25
            );
          },
          { last, dx, dz },
          { timeout: 16000 },
        );
        await stopWalk();
      }
      challengesPassed.push({
        kind: challenge.kind,
        segment: challenge.segment,
        platforms: platforms.length,
      });
      await page.screenshot({ path: `${output}/${label}-challenge-${challenge.segment}.png` });
    }
    // A missing jump must fall into a real gap and rescue to the last checkpoint.
    const gap = plan.challenges.find((c) => c.kind === "stones").platforms;
    await page.evaluate(
      ({ a, b }) => window.mountainQA.place([(a.x + b.x) / 2, a.y - 1, (a.z + b.z) / 2]),
      { a: gap[0], b: gap[1] },
    );
    await page.waitForFunction(
      () => Math.hypot(window.mountainQA.sample.x - 365, window.mountainQA.sample.z - 65) < 0.4,
      null,
      { timeout: 6000 },
    );
    await place([355, 20, 18]);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${output}/${label}-waterfall-bridge.png` });

    // Dropping onto a later landmark cannot skip the ordered checkpoint sequence.
    await place(plan.summit.position);
    assert.equal(await page.evaluate(() => window.mountain.getState().completed), false);
    assert.equal(await page.evaluate(() => window.mountain.getState().checkpoint), 0);
    for (const checkpoint of plan.checkpoints) {
      await place([
        checkpoint.position[0] + 5,
        checkpoint.position[1],
        checkpoint.position[2] - 3.5,
      ]);
      await page.waitForFunction(
        (id) => window.mountain.getState().checkpoint === id,
        checkpoint.id,
        { timeout: 5000 },
      );
      const pulse = await page.evaluate(() => window.mountain.getState().pulseAt);
      await page.waitForTimeout(250);
      assert.equal(
        await page.evaluate(() => window.mountain.getState().pulseAt),
        pulse,
        "stationary contact does not replay the CP effect",
      );
    }
    const last = plan.checkpoints.at(-1).position;
    // Move the physical body off the last terrace and let gravity trigger the production rescue.
    await page.evaluate(
      (last) => window.mountainQA.place([last[0] + 58, last[1] + 3, last[2]]),
      last,
    );
    await page.waitForFunction(
      (last) => {
        const p = window.mountainQA.sample;
        return Math.hypot(p.x - last[0], p.z - last[2]) < 0.4 && Math.abs(p.vy) < 0.2;
      },
      last,
      { timeout: 6000 },
    );
    assert.equal(await page.evaluate(() => window.mountain.getState().checkpoint), 4);

    await page.getByRole("button", { name: "Pakai senter", exact: true }).click();
    await page.waitForFunction(() => window.mountainQA.sample.flashlightVisible);
    await page.getByRole("button", { name: "Nyalakan senter", exact: true }).click();
    await page.waitForFunction(() => window.mountainQA.sample.flashlightIntensity > 0);
    await page.screenshot({ path: `${output}/${label}-flashlight.png` });
    await page.getByRole("button", { name: "Matikan senter", exact: true }).click();
    await page.waitForFunction(() => window.mountainQA.sample.flashlightIntensity === 0);
    await page.getByRole("button", { name: "Simpan senter", exact: true }).click();
    await page.waitForFunction(() => !window.mountainQA.sample.flashlightVisible);
    const hud = await page.locator("[data-mountain-hud]").boundingBox();
    assert(
      hud.x >= 0 && hud.y >= 0 && hud.x + hud.width <= width && hud.y + hud.height <= height,
      "mountain controls fit viewport",
    );
    if (mobile) {
      for (const selector of ["[data-mobile-jump]", "[data-mobile-joystick]"]) {
        const control = await page.locator(selector).boundingBox();
        const overlaps =
          hud.x < control.x + control.width &&
          hud.x + hud.width > control.x &&
          hud.y < control.y + control.height &&
          hud.y + hud.height > control.y;
        assert.equal(overlaps, false, `mountain HUD clears ${selector}`);
      }
    }
    await place(plan.summit.position);
    await page.waitForFunction(() => window.mountain.getState().completed);
    await page.getByRole("dialog", { name: "Puncak tercapai!" }).waitFor();
    await page.locator(".quest-confetti").waitFor();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${output}/${label}-summit-celebration.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.locator(".quest-confetti").evaluate((el) => getComputedStyle(el).display),
      "none",
    );
    await page.waitForFunction(() => {
      const water = window.three.scene.getObjectByName("MountainWaterfall");
      return (
        water.children.find((c) => c.material?.isShaderMaterial).material.uniforms.time.value === 0
      );
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const summitPulse = await page.evaluate(() => window.mountain.getState().pulseAt);
    await page.getByRole("button", { name: "Tetap di puncak", exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator(".mountain-complete-modal").count(), 0);
    assert.equal(
      await page.evaluate(() => window.mountain.getState().pulseAt),
      summitPulse,
      "summit celebration is one-shot",
    );
    await page.screenshot({ path: `${output}/${label}-summit.png` });
    await page.evaluate(() => {
      window.mountainQA.overview = true;
    });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${output}/${label}-mountain-overview.png` });
    await page.evaluate(() => {
      window.mountainQA.overview = false;
    });
    await openMap();
    assert.equal(await page.locator("[data-map-view='world'] [data-destination]").count(), 2);
    await page.getByRole("button", { name: "Lihat Pegunungan", exact: true }).click();
    await page.locator("[data-map-view='mountain']").waitFor();
    await page.screenshot({ path: `${output}/${label}-mountain-map.png` });
    await closeMap();

    await page.getByRole("button", { name: "Kembali ke basecamp", exact: true }).click();
    await assertArrival("mountain");
    assert.equal(await page.evaluate(() => window.mountain.getState().checkpoint), 0);
    assert.equal(await page.evaluate(() => window.mountain.getState().completed), false);

    // Complete another run to exercise the return action directly inside the celebration.
    for (const cp of plan.checkpoints) {
      await place(cp.position);
      await page.waitForFunction((id) => window.mountain.getState().checkpoint === id, cp.id);
    }
    await place(plan.summit.position);
    await page.getByRole("dialog", { name: "Puncak tercapai!" }).waitFor();
    await page.getByRole("button", { name: "Kembali ke basecamp", exact: true }).click();
    await assertArrival("mountain");
    assert.equal(await page.locator(".mountain-complete-modal").count(), 0);
    assert.equal(await page.locator(".quest-confetti").count(), 0);
    assert.equal(await page.evaluate(() => window.mountain.getState().checkpoint), 0);

    await place(plan.mountain.boarding);
    await page.waitForFunction(() => window.currentAction()?.id.startsWith("helicopter:"));
    if (mobile) await page.locator("[data-context-action] button").first().click();
    else await page.keyboard.press("f");
    await page.waitForFunction(
      () => !window.mountain.getState().flight && window.mountainQA.sample.x < 200,
      null,
      { timeout: 8000 },
    );
    await assertArrival("city");
    // Repeat genuine F/touch boarding in both directions, without repositioning the body.
    for (let trip = 0; trip < 2; trip++) {
      for (const destination of ["mountain", "city"]) {
        if (mobile) await page.locator("[data-context-action] button").first().click();
        else await page.keyboard.press("f");
        await page.waitForFunction(() => !!window.mountain.getState().flight);
        await assertArrival(destination);
      }
    }
    assert.equal(await page.evaluate(() => window.mountain.getState().flashlightOn), false);
    await place(plan.city.boarding);
    await page.waitForFunction(() => window.currentAction()?.id.startsWith("helicopter:"));
    if (mobile) await page.locator("[data-context-action] button").first().click();
    else await page.keyboard.press("f");
    await page.waitForFunction(() => !!window.mountain.getState().flight);
    await page.evaluate(() => window.channels.setState({ playing: false }));
    await page.waitForTimeout(2900);
    assert.equal(await page.evaluate(() => window.mountain.getState().flight), null);
    assert.equal(await page.evaluate(() => window.game.getState().pendingTeleport), null);
    assert(
      await page.evaluate(() => window.mountainQA.sample.x < 200),
      "leaving cancels delayed arrival",
    );
    assert.deepEqual(errors, []);
    report.push({
      label,
      viewport: { width, height },
      passed: true,
      cityCollision: !mobile,
      climbHeight: climbed - initialHeight,
      checkpoints: 4,
      summit: true,
      roundTrip: true,
      repeatedRoundTrips: 3,
      stableArrivalAfterRegionRender: true,
      cancellation: true,
      flashlight: true,
      challengesPassed,
      checkpointWithoutMarkerContact: true,
      summitConfettiAndReturn: true,
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
              state: window.mountain?.getState(),
              game: window.game?.getState(),
              sample: window.mountainQA?.sample,
              samples: window.mountainQA?.samples.slice(-80),
              action: window.currentAction?.(),
              ui: window.gameUi?.getState(),
              text: document.body.innerText,
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
  `PASS mountain physics, travel, ordered CPs, rescue, flashlight, two-location map desktop/mobile; ${output}`,
);
