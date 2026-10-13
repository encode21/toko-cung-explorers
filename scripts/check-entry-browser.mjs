// Real landing/auth screens and router, isolated authentication responses; no live accounts.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/entry";
const output = process.env.ENTRY_QA_OUTPUT || "/tmp/toko-entry-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: "@/auth/useSession", replacement: qa + "/session.ts" },
      { find: "@/services/world/client", replacement: qa + "/world.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom"],
  },
  server: { host: "127.0.0.1", port: 4223, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const check = async (page, mode, scrollAllowed = false) => {
  const result = await page.evaluate(() => {
    const content = document.querySelector(".adventure-content");
    const scroller = document.querySelector(".entry-form-scroll");
    const primary =
      document.querySelector("button[type=submit]") ??
      document.querySelector(".entry-start-actions a");
    const r = primary.getBoundingClientRect();
    return {
      pageOverflow:
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
      contentOverflow:
        content.scrollHeight > content.clientHeight + 1 ||
        content.scrollWidth > content.clientWidth + 1,
      formScroll: scroller && scroller.scrollHeight > scroller.clientHeight + 1,
      primary: { x: r.x, y: r.y, right: r.right, bottom: r.bottom },
      height: document.querySelector(".world-viewport").getBoundingClientRect().height,
    };
  });
  assert(
    !result.pageOverflow && !result.contentOverflow,
    `${mode}: outer overflow ${JSON.stringify(result)}`,
  );
  if (!scrollAllowed)
    assert(!result.formScroll, `${mode}: default form needs scroll ${JSON.stringify(result)}`);
  assert(
    result.primary.y >= 0 && result.primary.bottom <= result.height + 1,
    `${mode}: primary action clipped`,
  );
};
try {
  for (const [width, height] of [
    [667, 375],
    [740, 360],
    [844, 390],
    [932, 430],
    [1024, 768],
    [1280, 720],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width !== 1280,
      isMobile: width !== 1280,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4223/");
    await page.getByRole("link", { name: "Mulai Petualangan" }).waitFor();
    await check(page, "landing");
    await page.screenshot({ path: `${output}/${width}x${height}-landing.png` });
    await page.getByRole("button", { name: "Cara bermain" }).click();
    await page.getByRole("button", { name: "Tutup Petualangan pertamamu" }).click();
    await page.getByRole("link", { name: "Mulai Petualangan" }).click();
    await page.getByLabel("Nomor telepon", { exact: true }).waitFor();
    await check(page, "login");
    await page.screenshot({ path: `${output}/${width}x${height}-login.png` });
    await page.getByLabel("Nomor telepon", { exact: true }).fill("081234567890");
    await page.getByLabel("PIN game", { exact: true }).fill("123456");
    await page.locator("button[type=submit]").click();
    await page.getByRole("alert").filter({ hasText: "Nomor atau PIN" }).waitFor();
    await page.getByRole("button", { name: "Pemain Baru", exact: true }).click();
    await check(page, "register");
    await page.screenshot({ path: `${output}/${width}x${height}-register.png` });
    await page.getByLabel("Nama pemain", { exact: true }).fill("Penjelajah");
    await page.getByLabel("PIN game baru", { exact: true }).fill("123456");
    await page.getByLabel("Konfirmasi PIN game", { exact: true }).fill("654321");
    await page.locator("button[type=submit]").click();
    await page.getByRole("alert").filter({ hasText: "Konfirmasi PIN tidak sama" }).waitFor();
    await page.getByLabel("Konfirmasi PIN game", { exact: true }).fill("123456");
    await page.getByLabel("Nomor telepon", { exact: true }).fill("081234567801");
    await page.locator("button[type=submit]").click();
    await page.getByLabel("Kode verifikasi", { exact: true }).waitFor();
    await check(page, "existing account", true);
    await page.getByRole("button", { name: "Kirim kode ke notifikasi App", exact: true }).click();
    await page.getByText("Kode terkirim ke notifikasi App.").waitFor();
    await page.getByRole("button", { name: "Kembali ke masuk" }).click();
    await page.getByRole("button", { name: "Lupa PIN game?" }).click();
    await check(page, "reset", true);
    await page.screenshot({ path: `${output}/${width}x${height}-reset.png` });
    // Exercise the VisualViewport resize contract; this is not an OS keyboard test.
    await page.getByLabel("PIN game baru", { exact: true }).focus();
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { value: 180, configurable: true });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(
      () => document.querySelector(".world-viewport").getBoundingClientRect().height === 180,
    );
    await page.waitForFunction(() => {
      const field = document.activeElement.getBoundingClientRect();
      const area = document.querySelector(".entry-form-scroll").getBoundingClientRect();
      return field.top >= area.top && field.bottom <= area.bottom;
    });
    await check(page, "keyboard", true);
    await page.screenshot({ path: `${output}/${width}x${height}-keyboard.png` });
    await page.evaluate(() => {
      delete visualViewport.height;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(
      () => document.querySelector(".world-viewport").getBoundingClientRect().height > 180,
    );
    await page.getByRole("link", { name: "Halaman depan" }).click();
    await check(page, "return landing");
    await context.close();
    console.log(
      `PASS ${width}x${height}: landing/login/register, help, validation, existing account, reset, keyboard resize, back navigation`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
