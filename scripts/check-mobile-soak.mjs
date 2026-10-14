import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url)),
  out = "/tmp/toko-mobile-soak";
await mkdir(out, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/performance",
  publicDir: root + "/public",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
    "import.meta.env.VITE_REACTIVE_WORLD_SOURCE": JSON.stringify("OFF"),
  },
  resolve: {
    alias: [
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/services/world/client", replacement: root + "/tests/fixtures/hud/client.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port: 4241,
    strictPort: true,
    hmr: false,
    watch: null,
    fs: { allow: [root] },
  },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel:
    process.env.SOAK_BROWSER_CHANNEL === "chromium"
      ? undefined
      : process.env.SOAK_BROWSER_CHANNEL || "chrome",
});
const errors = [],
  samples = [];
try {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.message);
  });
  await page.goto("http://127.0.0.1:4241");
  await page.waitForFunction(() => window.perfStats?.calls > 100, null, { timeout: 120000 });
  await page.waitForTimeout(15000);
  await page.screenshot({ path: out + "/start.png" });
  const start = Date.now(),
    duration = Number(process.env.SOAK_SECONDS || 1800) * 1000;
  while (Date.now() - start < duration) {
    await page.waitForTimeout(10000);
    const stats = await page.evaluate(() => window.perfStats);
    samples.push({ seconds: (Date.now() - start) / 1000, ...stats });
    if (samples.length % 6 === 0) {
      await writeFile(out + "/samples.json", JSON.stringify({ errors, samples }, null, 2));
      console.log(JSON.stringify(samples.at(-1)));
    }
  }
  await page.screenshot({ path: out + "/end.png" });
  await page.evaluate(() => window.perfControl.pauseRoute());
  const cycles = [];
  for (let i = 0; i < Number(process.env.SOAK_CYCLES || 10); i++) {
    await page.evaluate(() => window.perfControl.setMounted(false));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.perfControl.setMounted(true));
    await page.waitForTimeout(5000);
    cycles.push(await page.evaluate(() => window.perfStats));
  }
  await page.waitForTimeout(10000);
  const afterCycles = await page.evaluate(() => window.perfStats);
  const median = (a) => {
    a.sort((x, y) => x - y);
    return a[Math.floor(a.length / 2)] ?? null;
  };
  const early = median(
    samples.filter((s) => s.seconds >= 300 && s.seconds <= 600).map((s) => s.fps),
  );
  const late = median(samples.filter((s) => s.seconds >= 1500).map((s) => s.fps));
  const report = {
    environment:
      "Headless desktop Chromium, mobile viewport; real world geometry, NPCs and traffic; scripted camera, isolated transport. Not a physical iPhone or live multiplayer.",
    errors,
    earlyMedianFps: early,
    lateMedianFps: late,
    degradation: early && late ? (early - late) / early : null,
    afterCycles,
    cycles,
    samples,
  };
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ early, late, afterCycles, errors }));
} finally {
  await browser.close();
  await server.close();
}
