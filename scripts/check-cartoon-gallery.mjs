import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = root + "/docs/qa/cartoon-world/gallery";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + "/tests/fixtures/cartoon-world",
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
  server: { host: "127.0.0.1", port: 4245, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4245/");
  await page.waitForFunction(() => window.qa?.kind);
  await page.waitForTimeout(2200);
  for (const kind of ["car", "mpv", "pickup", "angkot", "motorcycle", "scooter", "van", "truck"]) {
    await page.evaluate((kind) => window.qa.kind(kind), kind);
    await page.waitForTimeout(600);
    for (const side of ["three-quarter", "front", "side", "rear"]) {
      await page.evaluate((side) => window.qa.view(side), side);
      await page.waitForTimeout(200);
      await page.screenshot({ path: output + "/" + kind + "-" + side + ".png" });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    output + "/gallery.json",
    JSON.stringify({ errors, models: 8, rigs: ["Base", "Explorer"], views: 4 }, null, 2),
  );
} finally {
  await browser.close();
  await server.close();
}
