import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = root + "/docs/qa/pahlawan-2026";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/pahlawan",
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/hud/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4237, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4237/");
  await page.waitForFunction(() => window.qa?.colliderCount?.() > 20, null, { timeout: 60000 });
  await page.waitForFunction(
    () => window.qa.scene.getObjectByName("national-day-pahlawan")?.children[1]?.textRenderInfo,
  );
  const exists = (name) => page.evaluate((name) => !!window.qa.scene.getObjectByName(name), name);
  assert(await exists("national-day-pahlawan"));
  assert(await exists("pahlawan-quest-flag"));
  const colliders = await page.evaluate(() => window.qa.colliderCount());
  const batches = await page.evaluate(() => {
    const group = window.qa.scene.getObjectByName("national-day-pahlawan");
    return group.children
      .filter((c) => c.isInstancedMesh)
      .map((c) => ({ instances: c.count, shadows: c.castShadow }));
  });
  assert.deepEqual(batches, [{ instances: 34, shadows: false }]);
  await page.screenshot({ path: output + "/mobile-active.png" });
  await page.evaluate(() => window.qa.event("INACTIVE"));
  await page.waitForFunction(() => !window.qa.scene.getObjectByName("national-day-pahlawan"));
  assert.equal(await exists("pahlawan-quest-flag"), false);
  assert.equal(await page.evaluate(() => window.qa.colliderCount()), colliders);
  await page.screenshot({ path: output + "/mobile-inactive.png" });
  for (const [status, theme, offset] of [
    ["ACTIVE", "kemerdekaan", 0],
    ["ACTIVE", "pahlawan", 100000],
    ["ACTIVE", "pahlawan", -100000],
  ]) {
    await page.evaluate(([s, t, o]) => window.qa.event(s, t, o), [status, theme, offset]);
    assert.equal(await exists("national-day-pahlawan"), false);
  }
  await page.evaluate(() => {
    window.qa.event();
    window.qa.marker(true, "pahlawan", 3);
  });
  await page.waitForFunction(() => !!window.qa.scene.getObjectByName("pahlawan-quest-flag"));
  await page.waitForFunction(
    () =>
      window.qa.scene.getObjectByName("quest-objective-marker")?.children[1]?.textRenderInfo
        ?.parameters?.text === "✦ Petunjuk",
  );
  await page.evaluate(() => window.qa.view([-9, 5, 22], [-14.5, 1.4, 14.8]));
  await page.screenshot({ path: output + "/mobile-trivia-flag.png" });
  await page.evaluate(() => window.qa.marker(false, "other"));
  await page.waitForFunction(() => !window.qa.scene.getObjectByName("pahlawan-quest-flag"));
  await page.evaluate(() => {
    window.qa.marker();
    window.qa.expireLease();
  });
  await page.waitForFunction(() => !window.qa.scene.getObjectByName("national-day-pahlawan"));
  assert.equal(await exists("pahlawan-quest-flag"), false);

  // Capsule clearance and a connected walking route through the actual static colliders.
  const clearance = await page.evaluate(() => {
    const qa = window.qa;
    const step = 0.5,
      minX = -18,
      maxX = 44,
      minZ = -18,
      maxZ = 16;
    const key = (x, z) => `${x},${z}`;
    const visited = new Set([key(0, 12)]),
      queue = [[0, 12]];
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      for (const [dx, dz] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          k = key(nx, nz);
        if (
          nx < minX ||
          nx > maxX ||
          nz < minZ ||
          nz > maxZ ||
          visited.has(k) ||
          qa.blocked(nx, nz)
        )
          continue;
        visited.add(k);
        queue.push([nx, nz]);
      }
    }
    return qa.targets.map((t) => ({
      id: t.id,
      position: t.position,
      blocked: qa.blocked(t.position.x, t.position.z),
      reachable: queue.some(([x, z]) => Math.hypot(x - t.position.x, z - t.position.z) < 0.5),
    }));
  });
  for (const target of clearance) {
    assert.equal(target.blocked, false, `${target.id}: capsule must be clear`);
    assert.equal(target.reachable, true, `${target.id}: must be reachable from spawn`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    window.qa.event();
    window.qa.marker();
    window.qa.view([27, 20, 36], [5, 2, 2]);
  });
  await page.waitForFunction(() => !!window.qa.scene.getObjectByName("national-day-pahlawan"));
  await page.waitForTimeout(300);
  await page.screenshot({ path: output + "/desktop-active.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => {
    window.qa.marker(true, "pahlawan", 5);
    window.qa.view([46, 8, 23], [41, 2, 0]);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: output + "/mobile-plaza.png" });
  assert.deepEqual(errors, []);
  await writeFile(
    output + "/checks.json",
    JSON.stringify(
      {
        viewport: [844, 390],
        decorationBatches: batches,
        collidersUnchanged: colliders,
        targets: clearance,
        browserErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS Pahlawan: schedule/theme/lease, on/off, ordinary + TRIVIA markers, one decoration batch, unchanged colliders, six reachable targets, mobile + desktop screenshots",
  );
} finally {
  await browser.close();
  await server.close();
}
