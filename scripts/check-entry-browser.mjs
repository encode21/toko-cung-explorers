// Real landing/auth screens and router, isolated authentication responses; no live accounts.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/entry";
const output = process.env.ENTRY_QA_OUTPUT || "/tmp/toko-entry-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  cacheDir: root + "/.cache/entry-qa",
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
// Local visual review through the browser UI, without launching browser automation.
if (process.argv.includes("--serve")) {
  console.log("Entry fixture: http://127.0.0.1:4223/");
  console.log("Branded loading previews: /preparing and /loading-world");
  console.log("States: ?session=loading|active|guest-error|guest-busy");
  console.log(
    "Auth states: /auth?session=auth-success|auth-busy|pin-request-error (default: auth errors)",
  );
  const close = async () => {
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  await new Promise(() => {});
}
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const typeDigits = async (page, label, digits) => {
  await page.getByLabel(label, { exact: true }).click();
  await page.locator(".entry-keypad").waitFor();
  await page.getByRole("button", { name: "Kosongkan" }).click();
  for (const digit of digits) {
    await page.locator(".entry-keypad").getByRole("button", { name: digit, exact: true }).click();
  }
};

const check = async (page, mode, scrollAllowed = false) => {
  const result = await page.evaluate(() => {
    const content = document.querySelector(".adventure-content");
    const scroller = document.querySelector(".entry-form-scroll");
    const primary =
      document.querySelector("button[type=submit]") ??
      document.querySelector(".entry-start-actions a, .entry-start-actions button") ??
      document.querySelector('.entry-title-shell [role="status"]');
    const phone = document.querySelector('[data-entry-keypad="phone"]');
    const keypad = document.querySelector(".entry-keypad");
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
      phoneReady: !phone || (phone.readOnly && phone.getAttribute("inputmode") === "none"),
      keypadVisible: !!keypad && keypad.getBoundingClientRect().height > 0,
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
    `${mode}: primary action or status clipped`,
  );
  if (mode === "login" || mode === "register") {
    assert(result.phoneReady, `${mode}: numeric field not locked from soft keyboard`);
    assert(!result.keypadVisible, `${mode}: keypad should stay hidden until field focus`);
  }
};

const checkLanding = async (
  page,
  { mode = "landing", labels = ["Masuk", "Coba sebagai tamu"], disabled = false } = {},
) => {
  await check(page, mode);
  const result = await page.locator(".entry-title-shell").evaluate((shell) => {
    const controls = [...shell.querySelectorAll("a, button")].filter(
      (element) => element.getClientRects().length > 0,
    );
    return {
      labels: controls.map((element) => element.textContent.trim()),
      disabled: controls.map((element) => element.matches(":disabled")),
      clipped: controls.some((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.left < 0 ||
          bounds.top < 0 ||
          bounds.right > innerWidth + 1 ||
          bounds.bottom > innerHeight + 1 ||
          bounds.height < 44
        );
      }),
      legacyPanels: shell.querySelectorAll(".entry-welcome-card, .entry-world-preview").length,
    };
  });
  assert.deepEqual(result.labels, labels, `${mode}: unexpected entry choices`);
  assert.deepEqual(
    result.disabled,
    labels.map(() => disabled),
    `${mode}: incorrect busy state`,
  );
  assert(!result.clipped, `${mode}: entry choices clipped or smaller than touch target`);
  assert.equal(result.legacyPanels, 0, `${mode}: old menu cards remain`);
};

const checkTitleStatus = async (page, status) => {
  await page.getByRole("status").filter({ hasText: status }).waitFor();
  await checkLanding(page, { mode: status, labels: [] });
  assert.equal(
    await page.locator(".world-viewport").count(),
    1,
    `${status}: nested game viewports`,
  );
  assert.equal(
    await page.locator(".entry-title-logo img").count(),
    1,
    `${status}: missing title logo`,
  );
  assert.equal(
    await page.locator(".adventure-backdrop").count(),
    1,
    `${status}: missing title artwork`,
  );
  assert.equal(
    await page.locator(".adventure-panel, .lobby-card, .game-loading-panel").count(),
    0,
    `${status}: legacy loading card remains`,
  );
};

const checkAuth = async (page, mode, labels) => {
  await check(page, mode, true);
  const panel = page.locator(".entry-auth-panel");
  assert.equal(await panel.count(), 1, `${mode}: auth should have one focused panel`);
  assert.equal(
    await page.locator(".entry-intro, .entry-account-tabs, .entry-hustle, .entry-guest").count(),
    0,
  );
  assert.equal(await panel.locator("input").count(), labels.length, `${mode}: unexpected fields`);
  for (const label of labels) {
    await page.getByLabel(label, { exact: true }).waitFor();
  }
  await page.getByRole("link", { name: "Kembali ke halaman depan", exact: true }).waitFor();
};

const requestPinCode = async (page) => {
  assert.equal(await page.getByLabel("Kode verifikasi", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Kirim kode ke App", exact: true }).click();
  await page.getByLabel("Kode verifikasi", { exact: true }).waitFor();
  await page.getByRole("status").filter({ hasText: "Kode terkirim ke notifikasi App." }).waitFor();
  assert(await page.getByRole("button", { name: /Kirim ulang dalam \d+ dtk/ }).isDisabled());
};

try {
  // Portrait entry and state transitions stay separate from landscape auth/keypad coverage.
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1280, 720],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 600,
      isMobile: width < 600,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("http://127.0.0.1:4223/?session=loading");
    await checkTitleStatus(page, "Memuat sesi pemain…");

    await page.goto("http://127.0.0.1:4223/preparing");
    await checkTitleStatus(page, "Menyiapkan profil…");
    await page.screenshot({ path: `${output}/${width}x${height}-preparing.png` });
    await page.goto("http://127.0.0.1:4223/loading-world");
    await checkTitleStatus(page, "Memuat dunia…");
    await page.screenshot({ path: `${output}/${width}x${height}-loading-world.png` });

    await page.goto("http://127.0.0.1:4223/?session=active");
    const resume = page.getByRole("link", { name: "Lanjutkan bermain", exact: true });
    await resume.waitFor();
    await checkLanding(page, { mode: "active", labels: ["Lanjutkan bermain"] });
    await resume.click();
    await page.getByTestId("world-destination").waitFor();
    assert.equal(await page.getByTestId("world-destination").getAttribute("data-guest"), "false");

    await page.goto("http://127.0.0.1:4223/?session=guest-busy");
    await page.getByRole("button", { name: "Coba sebagai tamu", exact: true }).click();
    await checkTitleStatus(page, "Menyiapkan profil…");

    await page.goto("http://127.0.0.1:4223/?session=guest-error");
    await page.getByRole("button", { name: "Coba sebagai tamu", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Mode tamu belum bisa dibuka" }).waitFor();
    await checkLanding(page, { mode: "guest error" });
    // The same button remains usable after the failed request.
    await page.getByRole("button", { name: "Coba sebagai tamu", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Mode tamu belum bisa dibuka" }).waitFor();
    await checkLanding(page, { mode: "guest retry" });
    await page.screenshot({ path: `${output}/${width}x${height}-guest-error.png` });

    await page.goto("http://127.0.0.1:4223/");
    await page.getByRole("link", { name: "Masuk", exact: true }).waitFor();
    await checkLanding(page);
    await page.screenshot({ path: `${output}/${width}x${height}-landing.png` });
    await page.getByRole("button", { name: "Coba sebagai tamu", exact: true }).click();
    await page.getByTestId("world-destination").waitFor();
    assert.equal(await page.getByTestId("world-destination").getAttribute("data-guest"), "true");
    await context.close();
    console.log(
      `PASS ${width}x${height}: entry choices, branded loading/profile/world, resume, guest busy/error/retry/success`,
    );
  }

  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [667, 375],
    [740, 360],
    [844, 390],
    [932, 430],
    [1024, 500],
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
    await page.getByRole("link", { name: "Masuk", exact: true }).waitFor();
    await checkLanding(page);
    await page.screenshot({ path: `${output}/${width}x${height}-landing.png` });
    await page.getByRole("link", { name: "Masuk", exact: true }).click();
    await page.getByLabel("Nomor telepon", { exact: true }).waitFor();
    await checkAuth(page, "login", ["Nomor telepon", "PIN game"]);
    await page.screenshot({ path: `${output}/${width}x${height}-login.png` });
    await typeDigits(page, "Nomor telepon", "081234567890");
    await typeDigits(page, "PIN game", "123456");
    // Keep full-height inputs: both login fields fit in landscape; portrait may scroll to the active field.
    const squeezed = await page.evaluate(() => {
      const area = document.querySelector(".entry-form-scroll").getBoundingClientRect();
      const landscape = matchMedia("(orientation: landscape)").matches;
      return [...document.querySelectorAll(".entry-input")]
        .map((input) => ({
          rect: input.getBoundingClientRect(),
          active: input === document.activeElement,
        }))
        .filter(
          ({ rect: r, active }) =>
            r.height < 43 ||
            ((landscape || active) && (r.top < area.top - 1 || r.bottom > area.bottom + 1)),
        )
        .map(({ rect }) => rect)
        .map((r) => ({ top: r.top, bottom: r.bottom, height: r.height }));
    });
    assert.deepEqual(squeezed, [], `${width}x${height}: inputs clipped beside keypad`);
    await page.screenshot({ path: `${output}/${width}x${height}-login-keypad.png` });
    await page.locator("button[type=submit]").click();
    await page.getByRole("alert").filter({ hasText: "Nomor atau PIN" }).waitFor();
    await page.getByRole("button", { name: "Daftar baru", exact: true }).click();
    await checkAuth(page, "register", [
      "Nama pemain",
      "Nomor telepon",
      "PIN game baru",
      "Konfirmasi PIN game",
    ]);
    await page.screenshot({ path: `${output}/${width}x${height}-register.png` });
    await page.getByLabel("Nama pemain", { exact: true }).fill("Penjelajah");
    await typeDigits(page, "PIN game baru", "123456");
    await typeDigits(page, "Konfirmasi PIN game", "654321");
    await page.locator("button[type=submit]").click();
    await page.getByRole("alert").filter({ hasText: "Konfirmasi PIN tidak sama" }).waitFor();
    await typeDigits(page, "Konfirmasi PIN game", "123456");
    await typeDigits(page, "Nomor telepon", "081234567801");
    await page.locator("button[type=submit]").click();
    await page.getByRole("heading", { name: "Buat PIN game", exact: true }).waitFor();
    await checkAuth(page, "existing account", ["Nomor telepon"]);
    assert.equal(
      await page.getByLabel("Nomor telepon", { exact: true }).inputValue(),
      "081234567801",
    );
    await requestPinCode(page);
    await checkAuth(page, "setup code", [
      "Kode verifikasi",
      "PIN game baru",
      "Konfirmasi PIN game",
    ]);
    await typeDigits(page, "Kode verifikasi", "123456");
    await typeDigits(page, "PIN game baru", "123456");
    await typeDigits(page, "Konfirmasi PIN game", "123456");
    await page.getByRole("button", { name: "Simpan PIN", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Kode verifikasi tidak sesuai" }).waitFor();
    await page.getByRole("button", { name: "Ubah nomor", exact: true }).click();
    await checkAuth(page, "change number", ["Nomor telepon"]);
    await page.getByRole("button", { name: "Kembali ke masuk" }).click();
    await page.getByRole("button", { name: "Lupa PIN game?" }).click();
    await checkAuth(page, "reset phone", ["Nomor telepon"]);
    await page.screenshot({ path: `${output}/${width}x${height}-reset.png` });
    // A fresh route avoids carrying the fixture's setup resend cooldown into reset.
    await page.goto("http://127.0.0.1:4223/auth");
    await page.getByRole("button", { name: "Lupa PIN game?" }).click();
    await typeDigits(page, "Nomor telepon", "081234567890");
    await requestPinCode(page);
    await checkAuth(page, "reset code", [
      "Kode verifikasi",
      "PIN game baru",
      "Konfirmasi PIN game",
    ]);
    // Exercise the VisualViewport resize contract; numeric fields use hardware keypad (no OS keyboard).
    await page.getByLabel("PIN game baru", { exact: true }).click();
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, "height", { value: 180, configurable: true });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(
      () => document.querySelector(".world-viewport").getBoundingClientRect().height === 180,
    );
    await page.getByLabel("PIN game baru", { exact: true }).click();
    await page.waitForFunction(() => {
      const field = document.activeElement?.getBoundingClientRect?.();
      const area = document.querySelector(".entry-form-scroll")?.getBoundingClientRect?.();
      if (!field || !area) return false;
      return field.top >= area.top - 1 && field.bottom <= area.bottom + 1;
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
    await page.getByRole("link", { name: "Kembali ke halaman depan", exact: true }).click();
    await page.getByRole("link", { name: "Masuk", exact: true }).waitFor();
    await checkLanding(page, { mode: "return landing" });
    await context.close();
    console.log(
      `PASS ${width}x${height}: landing/login/register, validation, existing account, reset, keyboard resize, back navigation`,
    );
  }

  // Successful outcomes and pending/error states use only the local fixture account.
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const mode of ["login", "register", "link", "reset"]) {
    await page.goto("http://127.0.0.1:4223/auth?session=auth-success");
    await page.getByLabel("Nomor telepon", { exact: true }).waitFor();
    if (mode === "register") {
      await page.getByRole("button", { name: "Daftar baru", exact: true }).click();
      await page.getByLabel("Nama pemain", { exact: true }).fill("Pemain uji");
    } else if (mode === "link" || mode === "reset") {
      await page
        .getByRole("button", {
          name: mode === "link" ? "Punya akun App? Buat PIN game" : "Lupa PIN game?",
          exact: true,
        })
        .click();
    }
    await typeDigits(page, "Nomor telepon", "081234567890");
    if (mode === "link" || mode === "reset") {
      await requestPinCode(page);
      await typeDigits(page, "Kode verifikasi", "123456");
    }
    await typeDigits(page, mode === "login" ? "PIN game" : "PIN game baru", "123456");
    if (mode !== "login") await typeDigits(page, "Konfirmasi PIN game", "123456");
    await page.locator("button[type=submit]").click();
    await page.getByTestId("world-destination").waitFor();
    assert.equal(await page.getByTestId("world-destination").getAttribute("data-guest"), "false");
  }

  await page.goto("http://127.0.0.1:4223/auth?session=auth-busy");
  await typeDigits(page, "Nomor telepon", "081234567890");
  await typeDigits(page, "PIN game", "123456");
  await page.locator("button[type=submit]").click();
  await page.waitForFunction(() => document.querySelector("button[type=submit]")?.disabled);
  assert(await page.getByLabel("Nomor telepon", { exact: true }).isDisabled());
  assert(await page.getByRole("button", { name: "Daftar baru", exact: true }).isDisabled());

  await page.goto("http://127.0.0.1:4223/auth?session=pin-request-error");
  await page.getByRole("button", { name: "Lupa PIN game?", exact: true }).click();
  await typeDigits(page, "Nomor telepon", "081234567890");
  await page.getByRole("button", { name: "Kirim kode ke App", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Kode belum terkirim" }).waitFor();
  await checkAuth(page, "pin delivery error", ["Nomor telepon"]);
  assert(await page.getByRole("button", { name: "Kirim kode ke App", exact: true }).isEnabled());
  // Support-issued recovery tokens must remain usable when App notification delivery fails.
  await page.getByText("Tidak bisa membuka App?", { exact: true }).click();
  await page.getByRole("button", { name: "Sudah punya kode pemulihan", exact: true }).click();
  await checkAuth(page, "support recovery", [
    "Kode verifikasi",
    "PIN game baru",
    "Konfirmasi PIN game",
  ]);
  const recoveryToken = "abcdef0123456789".repeat(3);
  await page.getByLabel("Kode verifikasi", { exact: true }).click();
  await page.keyboard.type(recoveryToken);
  assert.equal(
    await page.getByLabel("Kode verifikasi", { exact: true }).inputValue(),
    recoveryToken,
  );
  await typeDigits(page, "PIN game baru", "123456");
  await typeDigits(page, "Konfirmasi PIN game", "123456");
  await page.getByRole("button", { name: "Simpan PIN", exact: true }).click();
  // This fixture server rejection proves the 48-hex token passed local validation and was submitted.
  await page.getByRole("alert").filter({ hasText: "Kode verifikasi tidak sesuai" }).waitFor();

  await page.goto("http://127.0.0.1:4223/auth?session=loading");
  await page.getByRole("heading", { name: "Masuk", exact: true }).waitFor();
  assert(await page.locator("button[type=submit]").isDisabled());
  assert(await page.getByLabel("Nomor telepon", { exact: true }).isDisabled());
  assert(await page.getByLabel("PIN game", { exact: true }).isDisabled());

  // Numeric fields are readonly, so their validation must run even without native form validation.
  await page.goto("http://127.0.0.1:4223/auth");
  await typeDigits(page, "Nomor telepon", "123");
  await page.locator("button[type=submit]").click();
  await page.getByRole("alert").filter({ hasText: "9–16 angka" }).waitFor();
  await typeDigits(page, "Nomor telepon", "081234567890");
  await typeDigits(page, "PIN game", "123");
  await page.locator("button[type=submit]").click();
  await page.getByRole("alert").filter({ hasText: "PIN game harus berisi 6 angka" }).waitFor();
  await context.close();
  console.log(
    "PASS auth: login/register/setup/reset success, pending login, delivery failure, support recovery, loading, readonly validation",
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
