// Real Player, camera, city geometry and traffic height regression checks.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/transit";
const output = process.env.TRANSIT_QA_OUTPUT || "/tmp/toko-transit-qa";
const port = Number(process.env.TRANSIT_QA_PORT || 4257);
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
      {
        find: "@/services/world/client",
        replacement: root + "/tests/fixtures/bus-render/client.ts",
      },
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

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const report = [];
try {
  for (const area of ["city", "gang", "interior"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}?area=${area}`);
    await page.waitForFunction(() => window.transitQA?.ready);
    const frames = async (n) => {
      const s = await page.evaluate(() => window.transitQA.frames);
      await page.waitForFunction(({ s, n }) => window.transitQA.frames > s + n, { s, n });
    };
    await frames(30);
    const blocked =
      area === "interior" ? [] : await page.evaluate(() => window.transitQA.checkRoutes());
    console.log(
      JSON.stringify({ area, blocked: blocked.slice(0, 12), blockedCount: blocked.length }),
    );
    assert.equal(blocked.length, 0, `${area} truck route must clear fixed scenery`);
    if (area === "city") {
      const busBlocked = await page.evaluate(() => window.transitQA.checkRoutes(true));
      console.log(
        JSON.stringify({ busBlocked: busBlocked.slice(0, 12), count: busBlocked.length }),
      );
      assert.equal(busBlocked.length, 0, "bus must clear scenery from bridge to Toko Cung");
    }
    const phases =
      area === "city" ? [1, 25, 265, 282] : area === "gang" ? [105, 135, 164, 200] : [135];
    for (const t of phases) {
      await page.evaluate((t) => window.transitQA.at(t), t);
      await frames(20);
      const state = await page.evaluate(() => window.transitQA.snapshot());
      if (area !== "interior" && state.position) {
        const [x, , z] = state.position;
        await page.evaluate(({ x, z }) => window.transitQA.view([x + 13, 9, z + 16], [x, 1.5, z]), {
          x,
          z,
        });
      }
      await page.screenshot({ path: `${output}/${area}-${t}.png` });
      report.push({ area, t, ...state });
      assert(state.visible, `${area} ${t}: truck must be visible`);
      assert.equal(state.traffic.length, 1, "moving and stopped truck stays solid/registered");
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await server.close();
}
