import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url)),
  qa = root + "/tests/fixtures/world-entry";
const alias = [
  ["@/game/editor/store", qa + "/editor.ts"],
  ["@/auth/useSession", qa + "/session.ts"],
  ["@/net/channel-store", qa + "/channels.ts"],
  ["@/game/dungeon/store", qa + "/dungeon.ts"],
  ["@/game/engine/GameCanvas", qa + "/children.tsx"],
  ["@/ui/GameUi", qa + "/children.tsx"],
  ["@/ui/entry/WorldLobby", qa + "/children.tsx"],
  ["@/services/world/client", root + "/tests/fixtures/intro/client.ts"],
  ["@", root + "/src"],
].map(([find, replacement]) => ({ find, replacement }));
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  resolve: { alias },
  server: { host: "127.0.0.1", port: 4245, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4245/world");
  await page.locator("video").waitFor();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.resumeCalls ?? 0), 0);
  assert.equal(await page.evaluate(() => window.gameMounts ?? 0), 0);
  assert.equal(await page.getByRole("heading", { name: "Lobby", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Lewati", exact: true }).click();
  await page.getByRole("heading", { name: "Lobby", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.resumeCalls), 1);
  await page.getByRole("button", { name: "Tonton ulang cerita" }).click();
  await page.locator("video").waitFor();
  assert.equal(await page.evaluate(() => window.gameMounts ?? 0), 0);
  await page.getByRole("button", { name: "Kembali ke lobby" }).click();
  await page.getByRole("button", { name: "Masuk channel" }).click();
  await page.getByText("Game canvas", { exact: true }).waitFor();
  await page.evaluate(() => window.expireSession());
  await page.getByRole("heading", { name: "Masuk lagi", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual /world entry: intro gates lobby, dungeon resume and game mount; replay returns to lobby",
  );
} finally {
  await browser.close();
  await server.close();
}
