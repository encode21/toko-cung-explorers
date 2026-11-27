// Real help/book panels, isolated account and transport. Screenshots only; no playtest recording.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/hud";
const output = process.env.BOOK_QA_OUTPUT || "/tmp/toko-guide-books-qa";
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
      { find: "@/net/useWorldChannel", replacement: qa + "/world-channel.ts" },
      { find: "@/game/core/api.functions", replacement: qa + "/core-api.ts" },
      { find: "@", replacement: root + "/src" },
    ],
    dedupe: ["react", "react-dom", "three"],
  },
  server: { host: "127.0.0.1", port: 4226, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const checkPanel = async (page, selector, label) => {
  const panel = page.locator(selector);
  await panel.waitFor();
  const bounds = await panel.boundingBox(),
    viewport = page.viewportSize();
  assert(
    bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= viewport.width + 1 &&
      bounds.y + bounds.height <= viewport.height + 1,
    `${label}: viewport overflow`,
  );
  assert.equal(
    await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 2),
    false,
    `${label}: horizontal overflow`,
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    `${label}: document overflow`,
  );
};
const screenshot = async (page, name) => {
  await page.locator("[data-game-panel]").evaluateAll((panels) =>
    Promise.all(
      panels.flatMap((panel) =>
        panel
          .getAnimations({ subtree: true })
          .filter((a) => a.effect.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      ),
    ),
  );
  await page.screenshot({ path: `${output}/${name}.png` });
};
const seed = async (page, guest = false, claimed = 2) =>
  page.evaluate(
    ({ guest, claimed }) => {
      window.account.setState({ user: { id: "qa-book", name: "Tester", guest } });
      window.clearStory();
      const titles = {
        jalanan: ["Modal pertama", "Hafal jalan", "Bawa amanah", "Motor sendiri"],
        dagang: [
          "Warung Teras",
          "Kulakan + Ojol Kelaparan",
          "Tagihan pertama + Utang Bu Romlah",
          "Naik ke Kelontong + Pelanggan Setia",
          "Tangan kanan",
          "Saingan + Naik ke Toko",
          "Tetangga sebelah",
          "Jadi Agen",
        ],
      };
      const sections = Object.entries(titles).map(([id, names]) => {
        const page = id === "jalanan" ? claimed : 0;
        const pages = names.map((title) => ({
          title,
          npc: id === "jalanan" ? "Bang Dimas" : "Koko Cung",
          advice: "Yang lama dirawat, yang baru diusahakan.",
          goal:
            id === "jalanan"
              ? "Selesaikan 10 trip berturut-turut tanpa dibatalkan."
              : "Layani 5 pembeli langsung.",
        }));
        return {
          id,
          label: id,
          page,
          pageCount: pages.length,
          pages,
          current: {
            ...pages[page],
            progress: {
              type: id === "jalanan" ? "ojek_streak" : "warung_story",
              progress: 1,
              target: 10,
              done: false,
            },
          },
          pinnacle: [
            { type: "ojek_trips", label: "Trip selesai", done: false, progress: 10, target: 50 },
          ],
          pinnacleReached: false,
          completedAt: null,
          cosmetic: { id: "tshirt", label: "Kaos Mbah" },
        };
      });
      window.bookFixture = {
        enabled: true,
        text: {
          guest_book: "Daftar untuk melanjutkan Buku Mbah.",
          locked: "Dibaca besok",
          choose_path: "Mulai dari mana?",
          warung_path: "Buka warung teras",
          ojek_path: "Ojol dulu",
        },
        path: "jalanan",
        activeSection: "jalanan",
        sections,
        locked: false,
        guest,
        pageXp: 50,
        finalReadyAt: null,
        profile: { xp: 100, level: 1, title: "Pendatang" },
      };
      window.bookTransport = (op, command) => {
        window.bookCalls ??= [];
        window.bookCalls.push({ op, ...command });
        if (op === "finale") return { enabled: false };
        if (command.action === "set-active") window.bookFixture.activeSection = command.section;
        if (command.action === "claim-page") {
          const section = window.bookFixture.sections.find((s) => s.id === command.section);
          if (guest || command.page !== section.page || !section.current.progress.done)
            throw new Error("Invalid claim");
          section.page++;
          section.current =
            section.page < section.pageCount
              ? {
                  ...section.pages[section.page],
                  progress: { type: "owns", done: false, progress: 0, target: 1 },
                }
              : null;
          window.bookFixture.locked = true;
        }
        return structuredClone(window.bookFixture);
      };
    },
    { guest, claimed },
  );
try {
  for (const [width, height] of [
    [1280, 800],
    [844, 390],
    [667, 375],
    [390, 844],
    [320, 568],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4226/books.html");
    await page.waitForFunction(() => !!window.hud);
    await page.evaluate(() => {
      window.bookCalls = [];
      window.bookTransport = (op, command) => {
        window.bookCalls.push({ op, ...command });
        return { enabled: false };
      };
    });
    await page.locator('[data-side-action="beginner-guide"]').click();
    await checkPanel(page, ".beginner-guide-book", `guide ${width}`);
    assert.equal(await page.locator(".beginner-guide-card").count(), 12);
    assert(
      (await page.locator(".beginner-guide-primary").first().boundingBox()).height >= 44,
      "guide touch target",
    );
    assert.equal(await page.locator(".beginner-guide-new").count(), 12);
    assert.equal(
      await page
        .locator(".beginner-guide-book")
        .getByText(/XP|Ambil hadiah|Target akhir/)
        .count(),
      0,
    );
    await page.locator(".beginner-guide-primary").first().click();
    await checkPanel(page, ".npc-dialogue-layout", `dialogue ${width}`);
    assert.equal(
      await page.locator(".npc-dialogue-line").textContent(),
      "Buka Handphone → Usaha. Di bagian Warung, pilih Buka warung.",
    );
    await screenshot(page, `dialogue-${width}`);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".beginner-guide-new").count(), 11);
    await screenshot(page, `guide-${width}`);
    await page.keyboard.press("Escape");
    await page.locator('[data-side-action="beginner-guide"]').click();
    assert.equal(await page.locator(".beginner-guide-new").count(), 11, "seen badge persists");
    assert.deepEqual(
      await page.evaluate(() => window.bookCalls),
      [],
      "help never calls story/finale without a profile",
    );
    await page.keyboard.press("Escape");
    await seed(page);
    await page.locator('[data-side-action="kulakan-book"]').click();
    await checkPanel(page, ".kulakan-book", `book ${width}`);
    await page.getByRole("button", { name: "Ojol 2/4 Halaman" }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Halaman berikutnya", exact: true }).isDisabled(),
      true,
    );
    assert.equal(await page.locator(".kulakan-pages button").nth(3).isDisabled(), true);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("button", { name: "Halaman sebelumnya", exact: true }).click();
    assert.equal(
      await page
        .locator(".kulakan-illustration")
        .evaluate((el) => getComputedStyle(el).animationName),
      "kulakan-turn-back",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.locator(".kulakan-stamp").textContent(), " Selesai");
    assert.equal(
      await page.getByRole("button", { name: "Halaman berikutnya", exact: true }).isEnabled(),
      true,
    );
    await page.getByRole("button", { name: "Halaman berikutnya", exact: true }).click();
    await page.evaluate(() => {
      window.bookFixture.sections[0].current.progress.done = true;
      window.story.setState({ data: structuredClone(window.bookFixture) });
    });
    await page.getByRole("button", { name: "Ambil hadiah" }).click();
    await page.getByRole("button", { name: "Ojol 3/4 Halaman" }).waitFor();
    await page.getByRole("button", { name: "Halaman berikutnya", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Ambil hadiah" }).isDisabled(),
      true,
      "daily gate retained",
    );
    await page.getByText("Dibaca besok", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Warung 0/8 Halaman" }).click();
    assert.equal(await page.locator(".kulakan-pages button").count(), 8);
    assert.equal(
      await page.getByRole("button", { name: "Halaman berikutnya", exact: true }).isDisabled(),
      true,
    );
    await screenshot(page, `warung-${width}`);
    await page.getByRole("button", { name: "Ojol 3/4 Halaman" }).click();
    await page.getByRole("button", { name: "Halaman sebelumnya", exact: true }).click();
    assert.equal(
      await page
        .locator(".kulakan-illustration")
        .evaluate((el) => getComputedStyle(el).animationName),
      "kulakan-fade",
    );
    await screenshot(page, `book-${width}`);
    await page.keyboard.press("Escape");
    await seed(page, true, 0);
    await page.locator('[data-side-action="kulakan-book"]').click();
    await page.getByText("Daftar untuk melanjutkan Buku Mbah.", { exact: true }).first().waitFor();
    assert.equal(await page.getByRole("button", { name: "Ambil hadiah" }).isDisabled(), true);
    await page.keyboard.press("Escape");
    await page.locator('[data-side-action="beginner-guide"]').click();
    assert.equal(await page.locator(".beginner-guide-card").count(), 12, "guest can open help");
    await page.close();
    console.log(`PASS guide/book ${width}x${height}`);
  }
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  await server.close();
}
