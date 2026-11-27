// Actual production UI and PHP services; two isolated synthetic accounts, no production access.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("..", import.meta.url));
const backend =
  process.env.WORLD_BACKEND_ROOT ?? fileURLToPath(new URL("../../toko-cung", import.meta.url));
const qa = root + "/tests/fixtures/sosmed";
const output = process.env.QA_OUTPUT ?? "/tmp/cunggram-browser-qa";
const db = tmpdir() + "/tokocung-sosmed-qa-" + process.pid + ".sqlite";
await mkdir(output, { recursive: true });
const phpPort = 18489;
const php = spawn("php", ["-S", "127.0.0.1:" + phpPort, "tests/Fixtures/world-sosmed-router.php"], {
  cwd: backend,
  env: { ...process.env, APP_ENV: "testing", WORLD_QA_DB: db },
  stdio: ["ignore", "pipe", "pipe"],
});
let phpLog = "";
php.stderr.on("data", (s) => {
  phpLog += s;
});
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
      { find: "@/services/world/client", replacement: qa + "/client.ts" },
      { find: "@/net/useWorldChannel", replacement: root + "/tests/fixtures/hud/world-channel.ts" },
      {
        find: "@/services/aiApi/npc.functions",
        replacement: root + "/tests/fixtures/hud/npc-api.ts",
      },
      { find: "@tanstack/react-start", replacement: root + "/tests/fixtures/hud/server-fn.ts" },
      { find: "@/game/core/api.functions", replacement: root + "/tests/fixtures/hud/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root] },
    proxy: { "/qa": "http://127.0.0.1:" + phpPort },
  },
});
let browser;
const errors = [];
const timeout = setTimeout(() => {
  console.error("Browser QA timed out");
  void browser?.close();
}, 180000);
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
  });
  const a = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const b = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const page of [a, b]) {
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push(e.message));
  }
  const base = server.resolvedUrls.local[0];
  await a.goto(base + "?user=1");
  await b.goto(base + "?user=2");
  await a.getByRole("button", { name: "Tulis status" }).click();
  await a.getByRole("textbox", { name: "Isi status" }).fill("Ada motor jatuh di pasar!");
  await a.evaluate(() => {
    window.loseResponse = true;
  });
  await a.getByRole("button", { name: "Bagikan", exact: true }).click();
  await a.getByRole("alert").waitFor();
  assert.equal(
    await a.getByRole("textbox", { name: "Isi status" }).inputValue(),
    "Ada motor jatuh di pasar!",
  );
  await a.getByRole("button", { name: "Bagikan", exact: true }).click();
  await a.getByText("Ada motor jatuh di pasar!", { exact: true }).waitFor();
  await b.getByRole("button", { name: "Perbarui beranda", exact: true }).click();
  await b.getByText("Ada motor jatuh di pasar!", { exact: true }).waitFor();
  assert.equal(await b.locator(".sosmed-post").count(), 1);
  await b.getByRole("button", { name: "0 komentar" }).click();
  await b.getByRole("textbox", { name: "Isi komentar" }).fill("Lokasi persisnya di mana?");
  await b.getByRole("button", { name: "Kirim", exact: true }).click();
  await b.getByText("Lokasi persisnya di mana?", { exact: true }).waitFor();
  await a.getByRole("button", { name: "Perbarui beranda", exact: true }).click();
  await a.getByRole("button", { name: "1 komentar" }).waitFor();
  await a.getByRole("button", { name: "1 komentar" }).click();
  await a.getByText("Lokasi persisnya di mana?", { exact: true }).waitFor();
  await a.getByRole("button", { name: "Balas", exact: true }).click();
  await a.getByRole("textbox", { name: "Isi balasan" }).fill("Di penyeberangan depan pasar.");
  await a.getByRole("button", { name: "Kirim", exact: true }).click();
  await a.getByText("Di penyeberangan depan pasar.", { exact: true }).waitFor();
  await b.getByRole("button", { name: "Perbarui komentar", exact: true }).click();
  await b.getByText("Di penyeberangan depan pasar.", { exact: true }).waitFor();
  await b.screenshot({ path: output + "/mobile-comments.png" });
  let backgroundReads = 0;
  const countRead = request => {
    if (request.url().endsWith("/qa/sosmed") && ["read", "comments"].includes(request.postDataJSON()?.action)) backgroundReads++;
  };
  b.on("request", countRead);
  await b.waitForTimeout(6500);
  assert.equal(backgroundReads, 0, "no per-second feed or comment polling");
  b.off("request", countRead);
  await b.reload();
  await b.getByRole("button", { name: "2 komentar" }).click();
  await b.getByText("Di penyeberangan depan pasar.", { exact: true }).waitFor();
  console.log("PASS two accounts: post retry, persistence, comment counts, threaded replies");
  const scene = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  scene.setDefaultTimeout(20000);
  scene.on("pageerror", (e) => errors.push(e.message));
  await scene.goto(base + "?user=1&scene=red-light-crash");
  await scene.waitForFunction(() => window.setSceneTime);
  await scene.getByRole("button", { name: "🔴 Rekam", exact: true }).waitFor();
  // Let models load before starting a real canvas capture.
  await scene.waitForTimeout(4000);
  await scene.evaluate(() => window.setSceneTime(7));
  await scene.getByRole("button", { name: "🔴 Rekam", exact: true }).click();
  await scene.getByRole("button", { name: "Bagikan ke CungGram" }).waitFor();
  const frames = await scene.evaluate(() => window.clip.getState().done);
  assert.equal(frames.length, 5);
  assert(new Set(frames).size > 1, "canvas frames record actual motion");
  await scene.screenshot({ path: output + "/recorded-incident.png" });
  await scene.getByRole("button", { name: "Bagikan ke CungGram" }).click();
  await scene.getByRole("textbox", { name: "Isi status" }).fill("Rekaman kejadian lampu merah.");
  await scene.getByRole("button", { name: "Bagikan", exact: true }).click();
  await scene.getByText("Rekaman kejadian lampu merah.", { exact: true }).waitFor();
  await b.getByRole("button", { name: "Perbarui beranda", exact: true }).click();
  await b.getByText("Rekaman kejadian lampu merah.", { exact: true }).waitFor();
  await b.getByRole("button", { name: "Klip", exact: true }).click();
  await b.getByAltText("Klip rekaman di Toko Cung World").waitFor();
  assert.equal(await b.locator(".sosmed-post").count(), 1);
  await b.screenshot({ path: output + "/mobile-clip.png" });
  for (const type of ["bump-fight", "parking-fight", "motorcycle-fall", "red-light-crash"]) {
    await scene.goto(base + "?user=1&scene=" + type);
    await scene.waitForFunction(() => window.setSceneTime);
    await scene.evaluate(() => window.setSceneTime(18));
    await scene.waitForTimeout(900);
    await scene.screenshot({ path: output + "/" + type + ".png" });
  }
  const witness = await browser.newPage({ viewport: { width: 900, height: 650 } });
  witness.setDefaultTimeout(20000);
  witness.on("pageerror", (e) => errors.push(e.message));
  await witness.goto(base + "?user=2&scene=red-light-crash");
  await witness.waitForFunction(() => window.setSceneTime);
  assert.deepEqual(
    await scene.evaluate(() => window.incident),
    await witness.evaluate(() => window.incident),
  );
  await Promise.all([
    scene.evaluate(() => window.setSceneTime(45)),
    witness.evaluate(() => window.setSceneTime(45)),
  ]);
  const phases = await Promise.all(
    [scene, witness].map((p) =>
      p.evaluate(() => {
        const s = window.sceneState();
        return [s.a.animation, s.b.animation, s.guard.animation, s.line, s.motor, s.truck];
      }),
    ),
  );
  assert.deepEqual(phases[0], phases[1]);
  assert.deepEqual(await scene.evaluate(() => window.testReservation()), [true, false, false]);
  await a.getByRole("button", { name: "Tulis status" }).click();
  await a.getByRole("textbox", { name: "Isi status" }).fill("Draf pribadi Sari");
  await a.evaluate(() => {
    window.profile.setState({
      profile: {
        ...window.profile.getState().profile,
        id: "00000000-0000-4000-8000-000000000002",
        displayName: "Budi",
      },
    });
  });
  assert.equal(await a.getByRole("textbox", { name: "Isi status" }).inputValue(), "");
  await a.evaluate(() => {
    window.profile.setState({
      profile: {
        ...window.profile.getState().profile,
        id: "00000000-0000-4000-8000-000000000001",
        displayName: "Sari",
      },
    });
  });
  assert.equal(
    await a.getByRole("textbox", { name: "Isi status" }).inputValue(),
    "Draf pribadi Sari",
  );
  await a.getByRole("button", { name: "Kembali ke beranda", exact: true }).click();
  console.log(
    "PASS shared server event in two clients, traffic reservation cleanup, account-scoped drafts",
  );
  await a.setViewportSize({ width: 740, height: 360 });
  await a.screenshot({ path: output + "/landscape-feed.png" });
  assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS real scene capture → publish → other account playback, four scene variants, mobile and landscape",
  );
} catch (e) {
  console.error(phpLog.slice(-2500));
  throw e;
} finally {
  clearTimeout(timeout);
  await browser?.close();
  await server.close();
  if (php.exitCode === null && php.signalCode === null) {
    php.kill();
    await new Promise((resolve) => php.once("exit", resolve));
  }
  await rm(db, { force: true });
}
