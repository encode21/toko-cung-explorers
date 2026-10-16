import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/obby",
  output = "/tmp/toko-obby-qa";
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
    port: 4247,
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (error) => {
  errors.push(error.message);
  console.error(error.message);
});
try {
  await page.goto("http://127.0.0.1:4247/?world");
  await page.waitForFunction(() => window.obbyQA?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    window.obby.getState().reset();
    window.obbyQA.place(29, 0.85, -8.5);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: output + "/world-plaza-sign.png" });
  const walk = async (key, axis, destination, greater) => {
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(
        ({ axis, destination, greater }) =>
          greater
            ? window.obbyQA.sample[axis] >= destination
            : window.obbyQA.sample[axis] <= destination,
        { axis, destination, greater },
        { timeout: 12000 },
      );
    } finally {
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(150);
  };
  await walk("a", "x", 26.2, false);
  await walk("w", "z", -17.5, false);
  await page.screenshot({ path: output + "/world-entrance-sidewalk.png" });
  await walk("d", "x", 30.3, true);
  await page.waitForFunction(() => window.obby.getState().status === "active", null, {
    timeout: 5000,
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: output + "/world-obby-start.png" });
  const result = await page.evaluate(() => ({
    position: window.game.getState().playerPos,
    obby: window.obby.getState(),
    renderCalls: window.three.gl.info.render.calls,
    camera: window.three.camera.position.toArray(),
    samples: window.obbyQA.samples.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      support: p.support,
      camera: p.camera,
    })),
  }));
  result.cameraDistance = Math.hypot(
    ...result.camera.map((value, index) => value - result.position[index]),
  );
  assert(result.cameraDistance > 4, "Start camera retains a readable third-person distance");
  // Collision/navigation were exercised above. Place on the next tested platform to inspect framing.
  await page.evaluate(() => {
    const p = window.obbyQA.platforms[1];
    window.obbyQA.place(p.x, p.top + 0.84, p.z);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: output + "/world-obby-step1.png" });
  const stepCamera = await page.evaluate(() => ({
    position: window.game.getState().playerPos,
    camera: window.three.camera.position.toArray(),
  }));
  stepCamera.distance = Math.hypot(
    ...stepCamera.camera.map((value, index) => value - stepCamera.position[index]),
  );
  assert(stepCamera.distance > 4, "Step 1 camera stays clear of the Plaza wall");
  result.stepCamera = stepCamera;
  assert.equal(result.obby.status, "active");
  assert.deepEqual(errors, []);
  await page.evaluate(() => {
    window.obbyQA.overview = true;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: output + "/construction-overview.png" });
  await page.evaluate(() => {
    window.obbyQA.overview = false;
  });
  await writeFile(
    output + "/world-entry-report.json",
    JSON.stringify(
      {
        passed: true,
        route: [
          [29, -8.5],
          [26.2, -8.5],
          [26.2, -17.5],
          [30.3, -17.5],
        ],
        ...result,
      },
      null,
      2,
    ),
  );
  const upperViews = [];
  for (const index of [5, 10, 18, 26, 34, 42, 50, 58]) {
    await page.evaluate((index) => {
      const p = window.obbyQA.platforms[index];
      window.obby.getState().reset();
      window.obbyQA.place(p.x, p.top + 0.84, p.z);
    }, index);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: output + `/construction-stage-${index}.png` });
    const view = await page.evaluate(
      (index) => ({
        index,
        platform: window.obbyQA.platforms[index],
        sample: window.obbyQA.sample,
        renderCalls: window.three.gl.info.render.calls,
      }),
      index,
    );
    assert.equal(view.sample.support, view.platform.id, "full-world platform remains standable");
    upperViews.push(view);
  }
  await writeFile(output + "/construction-upper-views.json", JSON.stringify(upperViews, null, 2));
  await rm(output + "/world-entry-failure.png", { force: true });
  console.log(
    "PASS world Plaza sign, sidewalk, stage wall, entry ramp, Start activation and camera framing",
    JSON.stringify({
      renderCalls: result.renderCalls,
      startDistance: result.cameraDistance,
      stepDistance: stepCamera.distance,
    }),
  );
} catch (error) {
  await page.screenshot({ path: output + "/world-entry-failure.png" });
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
