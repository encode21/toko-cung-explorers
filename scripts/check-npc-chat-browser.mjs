// Production chat UI + production PHP services, using an isolated local SQLite database.
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
const qa = root + "/tests/fixtures/npc-chat";
const output = process.env.QA_OUTPUT ?? "/tmp/cungchat-browser-qa";
const db = `${tmpdir()}/tokocung-npc-qa-${process.pid}.sqlite`;
await mkdir(output, { recursive: true });
const phpPort = 18487;
const php = spawn(
  "php",
  ["-S", `127.0.0.1:${phpPort}`, "tests/Fixtures/world-npc-chat-router.php"],
  {
    cwd: backend,
    env: { ...process.env, APP_ENV: "testing", WORLD_QA_DB: db },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
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
    proxy: { "/qa": `http://127.0.0.1:${phpPort}` },
  },
});
let browser;
let page;
const errors = [];
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", async (r) => {
    if (r.url().includes("/qa/") && r.status() >= 400) console.error(await r.text());
  });
  await page.goto(server.resolvedUrls.local[0]);
  const open = async () => {
    await page.locator('[data-conversation="npc-pak-sabar"]').click();
    await page.getByRole("log").waitFor();
  };
  await open();
  await page.getByRole("button", { name: "Sapa Pak Sabar", exact: true }).click();
  await page
    .getByRole("button", { name: "Catat namanya di buku kecil, Pak.", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cocokkan nama sebelum menyapa, jangan menebak.", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Boleh, pinjamkan Rp10.000 dari kas warung.", exact: true })
    .waitFor();
  await page.screenshot({ path: output + "/desktop-loan.png" });
  await page.evaluate(() => {
    window.loseNextNpcResponse = true;
  });
  await page
    .getByRole("button", { name: "Boleh, pinjamkan Rp10.000 dari kas warung.", exact: true })
    .click();
  await page.getByRole("button", { name: "Coba kirim lagi", exact: true }).click();
  await page.getByText("Sudah ngobrol hari ini. Lanjut pada hari game berikutnya.").waitFor();
  const ledger = await (
    await page.request.post(server.resolvedUrls.local[0] + "qa/ledger", { data: {} })
  ).json();
  assert.equal(ledger.filter((l) => l.type === "NPC_LOAN_OUT").length, 1);
  assert.equal(ledger.filter((l) => l.type === "NPC_CHAT_REWARD").length, 1);
  assert.equal(ledger.find((l) => l.type === "NPC_LOAN_OUT").amount, -10000);
  const history = await page.locator(".npc-chat-history .warung-chat-bubble").allTextContents();
  await page.getByRole("button", { name: "Kembali ke daftar chat" }).click();
  await open();
  await page.getByText("Sudah ngobrol hari ini. Lanjut pada hari game berikutnya.").waitFor();
  assert.deepEqual(
    await page.locator(".npc-chat-history .warung-chat-bubble").allTextContents(),
    history,
  );
  await page.reload();
  await open();
  await page.getByText("Sudah ngobrol hari ini. Lanjut pada hari game berikutnya.").waitFor();
  assert.deepEqual(
    await page.locator(".npc-chat-history .warung-chat-bubble").allTextContents(),
    history,
  );
  for (const viewport of [
    { width: 390, height: 740 },
    { width: 740, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: output + `/history-${viewport.width}x${viewport.height}.png` });
    const fit = await page.locator(".phone-app-screen").evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { right: b.right, bottom: b.bottom, overflow: el.scrollWidth - el.clientWidth };
    });
    assert.ok(
      fit.right <= viewport.width + 1 && fit.bottom <= viewport.height + 1 && fit.overflow <= 1,
      JSON.stringify(fit),
    );
  }
  await page.setViewportSize({ width: 390, height: 740 });
  await page.request.post(server.resolvedUrls.local[0] + "qa/history", { data: {} });
  await page.reload();
  await open();
  const log = page.getByRole("log");
  await page.getByRole("button", { name: "Pesan sebelumnya" }).waitFor();
  await log.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.getByRole("button", { name: "Pesan sebelumnya" }).click();
  await page.getByText("Catat namanya di buku kecil, Pak.", { exact: false }).first().waitFor();
  assert.equal(
    await page.locator(".npc-chat-history .warung-chat-bubble").count(),
    history.length + 50,
  );
  assert.ok(
    await log.evaluate((el) => el.scrollTop > 0),
    "prepending older messages preserves position",
  );
  await page.request.post(server.resolvedUrls.local[0] + "qa/advance", { data: { days: 1 } });
  await page.reload();
  await open();
  await page.getByRole("button", { name: "Sapa Pak Sabar", exact: true }).click();
  await page
    .getByRole("button", { name: "Lanjutkan rencana itu, saya dukung.", exact: true })
    .waitFor();
  await page.screenshot({ path: output + "/mobile-next-day.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: persistent choices, response-loss retry, one loan/reward, next-day continuation, pagination, desktop/portrait/landscape layout.",
  );
  console.log(output);
} catch (e) {
  console.error(phpLog.slice(-2000));
  console.error(errors);
  if (page) {
    console.error(await page.locator("body").innerText());
    await page.screenshot({ path: output + "/failure.png" });
  }
  throw e;
} finally {
  await browser?.close();
  await server.close();
  php.kill("SIGTERM");
  await new Promise((resolve) => (php.exitCode !== null ? resolve() : php.once("exit", resolve)));
  await rm(db, { force: true });
}
