// Isolated real HUD components, mocked transport; no live account required.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/hud";
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-wardrobe-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/services/aiApi/npc.functions", replacement: qa + "/npc-api.ts" },
      { find: "@tanstack/react-start", replacement: qa + "/server-fn.ts" },
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/game/core/api.functions", replacement: qa + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4221, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });

const { readFile, writeFile } = await import("node:fs/promises");
const catalog = JSON.parse(await readFile(root + "/src/identity/wardrobe-catalog.json", "utf8"));
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
  page.on("pageerror", (e) => console.error(e));
  await page.goto("http://127.0.0.1:4221/explorer.html");
  await page.waitForFunction(() => window.qaStats?.calls > 10);
  await mkdir(root + "/public/assets/wardrobe", { recursive: true });
  for (const item of catalog) {
    await page.evaluate((item) => {
      const a = {
        version: 2,
        colors: item.colors,
        headwear: "none",
        back: "none",
        ...(item.preset ?? { [item.slot]: item.id }),
      };
      window.qa.setAppearance(a);
      window.qa.setAngle(item.slot === "back" ? Math.PI + 0.25 : 0.25);
      const head = ["headwear", "hairDecoration", "eyewear", "audio"].includes(item.slot),
        foot = item.slot === "footwear";
      window.qaCamera.position.set(
        0,
        head ? 0.6 : foot ? -0.61 : 0.18,
        head ? 1.6 : foot ? 1.1 : 3.1,
      );
      window.qaCamera.lookAt(0, head ? 0.6 : foot ? -0.62 : 0, 0);
    }, item);
    await page.waitForTimeout(150);
    await page.screenshot({ path: root + "/public/assets/wardrobe/" + item.id + ".png" });
  }
  console.log("Generated static real-mesh thumbnails:", catalog.length);
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
