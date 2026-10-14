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
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-hud-qa/screenshots";
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
const errors = [];
const sizes = [
  [667, 375],
  [740, 360],
  [844, 390],
  [932, 430],
  [1024, 768],
  [1280, 720],
];
const checkPanel = async (page, label) => {
  const panel = page.locator("[data-game-panel]").last();
  await panel.waitFor();
  await panel.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const bounds = await panel.boundingBox();
  const viewport = page.viewportSize();
  assert(
    bounds.x >= -1 &&
      bounds.y >= -1 &&
      bounds.x + bounds.width <= viewport.width + 1 &&
      bounds.y + bounds.height <= viewport.height + 1,
    `${label}: panel overflow ${JSON.stringify(bounds)}`,
  );
  const close = panel.locator("[data-game-close]");
  await panel.locator(":scope > .game-scroll").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const cb = await close.boundingBox();
  assert(
    cb.y >= bounds.y && cb.y + cb.height <= bounds.y + bounds.height + 1,
    `${label}: close outside panel`,
  );
  assert.equal(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
    false,
    `${label}: page scroll`,
  );
  assert.equal(
    await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 2),
    false,
    `${label}: horizontal panel overflow`,
  );
  return panel;
};
const closePanel = async (page) => {
  await page.locator("[data-game-panel]").last().locator("[data-game-close]").click();
};
const checkSideMenus = async (page, label) => {
  const dock = page.locator("[data-world-dock]");
  const viewport = page.viewportSize();
  const bounds = [];
  const trackers = await page.locator("[data-hud-trackers] > [data-hud-control]:visible").all();
  for (const [side, actions] of [
    ["left", ["daily-missions", "shop", "quests"]],
    ["right", ["explore", "daily-login", "phone"]],
  ]) {
    const menu = dock.locator(`nav[data-side-menu="${side}"]`);
    assert.equal(await menu.locator("[data-side-action]").count(), 3);
    for (const action of actions) {
      const button = menu.locator(`[data-side-action="${action}"]`);
      const rect = await button.boundingBox();
      assert(rect, `${label}: ${action} is visible`);
      assert(rect.width >= 44 && rect.height >= 44, `${label}: ${action} has a 44px touch target`);
      assert(
        rect.x >= -1 &&
          rect.y >= -1 &&
          rect.x + rect.width <= viewport.width + 1 &&
          rect.y + rect.height <= viewport.height + 1,
        `${label}: ${action} fits the viewport`,
      );
      assert(
        side === "left" ? rect.x < viewport.width / 2 : rect.x > viewport.width / 2,
        `${label}: ${action} is on the ${side} side`,
      );
      for (const tracker of trackers) {
        const other = await tracker.boundingBox();
        assert(
          rect.x + rect.width <= other.x + 1 ||
            other.x + other.width <= rect.x + 1 ||
            rect.y + rect.height <= other.y + 1 ||
            other.y + other.height <= rect.y + 1,
          `${label}: ${action} stays clear of the quest/mission tracker`,
        );
      }
      bounds.push({ action, ...rect });
    }
  }
  for (let index = 0; index < bounds.length; index++) {
    const rect = bounds[index];
    for (const other of bounds.slice(index + 1)) {
      assert(
        rect.x + rect.width <= other.x + 1 ||
          other.x + other.width <= rect.x + 1 ||
          rect.y + rect.height <= other.y + 1 ||
          other.y + other.height <= rect.y + 1,
        `${label}: ${rect.action} and ${other.action} do not overlap`,
      );
    }
  }
};
const checkMapCanvas = async (page, label) => {
  await page.waitForFunction(() => {
    const stage = document.querySelector(".game-map-stage");
    const canvas = stage?.querySelector('canvas[aria-label="Peta Toko Cung"]');
    if (!canvas) return false;
    const bounds = stage.getBoundingClientRect();
    const drawn = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return (
      Math.abs(bounds.x - drawn.x) <= 2 &&
      Math.abs(bounds.y - drawn.y) <= 2 &&
      Math.abs(bounds.width - drawn.width) <= 2 &&
      Math.abs(bounds.height - drawn.height) <= 2 &&
      Math.abs(canvas.width - drawn.width * dpr) <= 2 &&
      Math.abs(canvas.height - drawn.height * dpr) <= 2
    );
  });
  const stage = await page.locator(".game-map-stage").boundingBox();
  const viewport = page.viewportSize();
  assert(
    stage.width > 0 &&
      stage.height > 0 &&
      stage.x >= -1 &&
      stage.y >= -1 &&
      stage.x + stage.width <= viewport.width + 1 &&
      stage.y + stage.height <= viewport.height + 1,
    `${label}: map canvas fits its available stage without overflow`,
  );
  return stage;
};
const checkFullscreenMap = async (page, label) => {
  const map = page.locator(".game-map-sheet");
  const bounds = await map.boundingBox();
  const viewport = page.viewportSize();
  assert(
    Math.abs(bounds.x) <= 1 &&
      Math.abs(bounds.y) <= 1 &&
      Math.abs(bounds.width - viewport.width) <= 2 &&
      Math.abs(bounds.height - viewport.height) <= 2,
    `${label}: map fills the entire game viewport`,
  );
  assert.equal(await map.getAttribute("aria-modal"), "true");
  assert.equal(await page.locator(".game-modal-backdrop").count(), 1);
  assert.equal(await map.locator(".game-world-map").count(), 1);
  const toggle = map.getByRole("button", { name: "Buka legenda peta", exact: true });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await map.locator(".game-map-drawer").isVisible(), false);
  assert.equal(
    await toggle.evaluate((el) => {
      const drawer = document.getElementById(el.getAttribute("aria-controls"));
      return drawer?.classList.contains("game-map-drawer") && drawer.hidden;
    }),
    true,
    `${label}: legend toggle controls its collapsed drawer`,
  );
  return checkMapCanvas(page, label);
};
try {
  for (const [width, height] of process.env.GUIDANCE_QA_ONLY ? [] : sizes) {
    const touch = width !== 1280;
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4221/");
    await page.locator("[data-player-status]").waitFor();
    console.log(`Checking ${width}x${height}`);
    const name = `${width}x${height}`;
    await checkSideMenus(page, name);
    const profileBounds = await page.locator("[data-player-status]").boundingBox();
    const utilityBounds = await page.locator("[data-utility-bar]").boundingBox();
    const minimapBounds = await page.getByRole("button", { name: "Perbesar peta" }).boundingBox();
    assert(utilityBounds.x >= profileBounds.x + profileBounds.width, "utilities beside profile");
    assert(utilityBounds.x + utilityBounds.width < minimapBounds.x, "utilities clear of minimap");
    await page.getByRole("button", { name: /Point — buka progression/ }).click();
    await checkPanel(page, `${name} wallet`);
    await closePanel(page);
    await page.getByRole("button", { name: "Notifikasi", exact: true }).click();
    await checkPanel(page, `${name} notifications`);
    await page.getByText("Belum ada aktivitas NPC yang tercatat di sesi ini.").waitFor();
    assert.equal(await page.getByText("Transaksi kasir", { exact: true }).count(), 0);
    await page.evaluate(() => {
      window.hud.getState().pushEvent("QA dummy scheduled event", "ops");
      window.hud.getState().pushEvent("Nakama gudang menaruh dus di palet", "npc", "Nakama Gudang");
    });
    await page.getByText("Nakama gudang menaruh dus di palet", { exact: true }).waitFor();
    assert.equal(await page.getByText("QA dummy scheduled event", { exact: true }).count(), 0);

    await closePanel(page);

    await page.locator('[data-side-action="daily-missions"]').click();
    const dailyPanel = await checkPanel(page, `${name} daily missions empty`);
    assert.equal(await dailyPanel.getAttribute("aria-modal"), "true");
    await dailyPanel.getByText("Belum ada misi harian tersedia.", { exact: true }).waitFor();
    await page.locator('.daily-mission-panel[aria-busy="false"]').waitFor();
    assert.equal(await dailyPanel.locator(".daily-mission-item").count(), 0);
    await dailyPanel.getByRole("button", { name: "Muat ulang", exact: true }).click();
    await page.locator('.daily-mission-panel[aria-busy="false"]').waitFor();
    const originalSnapshot = await page.evaluate(() => {
      const original = structuredClone(window.core.getState().snapshot);
      const snapshot = structuredClone(original);
      const daily = snapshot.quests.find((quest) => quest.id === snapshot.active.quest_id);
      daily.repeat_policy = "DAILY";
      snapshot.quests.push(
        {
          ...daily,
          id: "daily-completed",
          title: "QA Misi selesai hari ini",
          available: false,
          reason: "Sudah selesai hari ini.",
        },
        {
          ...daily,
          id: "daily-yesterday",
          title: "QA Misi selesai kemarin",
          category: "DAILY",
          repeat_policy: "ONCE",
        },
        { ...daily, id: "world-only", category: "WORLD", repeat_policy: "ONCE" },
      );
      snapshot.history = [
        {
          ...snapshot.active,
          id: "completed-today",
          quest_id: "daily-completed",
          status: "COMPLETED",
          progress: [1],
          completed_at: new Date().toISOString(),
          xp_awarded: 42,
          point_awarded: 7,
        },
        {
          ...snapshot.active,
          id: "completed-yesterday",
          quest_id: "daily-yesterday",
          status: "COMPLETED",
          progress: [1],
          completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          xp_awarded: 42,
          point_awarded: 7,
        },
      ];
      window.core.setState({ snapshot });
      return original;
    });
    await dailyPanel.locator('.daily-mission-item[data-state="active"]').waitFor();
    assert.equal(await dailyPanel.locator(".daily-mission-item").count(), 3);
    const dailyProgress = dailyPanel.getByRole("progressbar", { name: "Misi harian selesai" });
    assert.equal(await dailyProgress.getAttribute("value"), "1");
    assert.equal(await dailyProgress.getAttribute("max"), "3");
    const completedDaily = dailyPanel.locator('[data-quest-id="daily-completed"]');
    assert.equal(await completedDaily.getAttribute("data-state"), "completed");
    assert.match(await completedDaily.getByLabel("Hadiah diterima").innerText(), /\+42\s*XP/);
    assert.match(await completedDaily.getByLabel("Hadiah diterima").innerText(), /\+7\s*Point/);
    assert.equal(await completedDaily.getByRole("button", { name: "Selesai" }).isDisabled(), true);
    const previousDaily = dailyPanel.locator('[data-quest-id="daily-yesterday"]');
    assert.equal(await previousDaily.getAttribute("data-state"), "locked");
    assert.equal(await previousDaily.getByRole("button", { name: "Mulai" }).isDisabled(), true);
    await checkPanel(page, `${name} daily missions populated`);
    await page.screenshot({ path: `${output}/${name}-daily-missions.png` });
    await dailyPanel.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    await page.locator(".daily-mission-panel").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.hud.getState().tracker), "quest");
    assert.equal(await page.evaluate(() => window.core.getState().snapshot.active.id), "run");
    await checkSideMenus(page, `${name} expanded quest`);
    await page.locator('[data-side-action="daily-missions"]').click();
    await page.locator('.daily-mission-panel[aria-busy="false"]').waitFor();
    await page.evaluate(() => {
      const snapshot = structuredClone(window.core.getState().snapshot);
      snapshot.active.progress = [1];
      window.core.setState({ snapshot });
    });
    await dailyPanel.locator('.daily-mission-item[data-state="claim"]').waitFor();
    assert.equal(
      await dailyPanel.getByRole("button", { name: "Klaim hadiah", exact: true }).isEnabled(),
      true,
      `${name}: claiming is offered only after the active objectives are complete`,
    );
    assert.equal(
      await page.evaluate(() => window.core.getState().snapshot.wallet.current_balance),
      originalSnapshot.wallet.current_balance,
      `${name}: viewing and following daily missions never assigns credits locally`,
    );
    await closePanel(page);
    await page.evaluate((snapshot) => {
      window.core.setState({ snapshot });
      window.hud.setState({ tracker: null });
    }, originalSnapshot);

    await page.locator('[data-side-action="daily-login"]').click();
    const loginPanel = await checkPanel(page, `${name} daily login`);
    assert.equal(await loginPanel.getAttribute("aria-modal"), "true");
    await loginPanel.getByText("Segera hadir", { exact: true }).waitFor();
    assert.equal(await loginPanel.locator(".daily-login-calendar li").count(), 7);
    await loginPanel
      .getByText("Hadiah login harian belum tersedia. Jadwal dan hadiah akan muncul di sini.")
      .waitFor();
    assert.equal(await loginPanel.getByRole("button", { name: /klaim|ambil hadiah/i }).count(), 0);
    assert.equal(
      await page.evaluate(() => window.core.getState().snapshot.wallet.current_balance),
      originalSnapshot.wallet.current_balance,
      `${name}: unavailable login rewards do not change the wallet`,
    );
    await page.screenshot({ path: `${output}/${name}-daily-login.png` });
    await loginPanel.getByRole("button", { name: "Oke", exact: true }).click();
    await page.locator(".daily-login-panel").waitFor({ state: "hidden" });
    await page.waitForFunction(() =>
      document.activeElement?.matches('[data-side-action="daily-login"]'),
    );
    await page.locator('[data-side-action="shop"]').click();
    await checkPanel(page, `${name} shop shortcut`);
    await page.locator(".game-shop-panel").waitFor();
    await closePanel(page);

    await page.evaluate(() =>
      window.net.setState({
        chat: [
          {
            id: "chat-1",
            from: "bob",
            name: "Budi",
            text: "Ketemu di depan toko, yuk!",
            at: Date.now() - 2000,
          },
          {
            id: "chat-2",
            from: "sari",
            name: "Sari",
            text: "Aku sedang mencari petunjuk di gudang.",
            at: Date.now() - 1000,
          },
          {
            id: "chat-3",
            from: "bob",
            name: "Budi",
            text: "Oke, nanti lanjut quest bersama.",
            at: Date.now(),
          },
        ],
      }),
    );
    for (const button of ["Perbesar peta", "Jelajah", "Chat"]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await checkPanel(page, `${name} ${button}`);
      if (button === "Perbesar peta") {
        const fullStage = await checkFullscreenMap(page, `${name} minimap entry`);
        await page.getByRole("button", { name: "Buka legenda peta", exact: true }).click();
        const toggle = page.getByRole("button", { name: "Tutup legenda peta", exact: true });
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
        const drawer = page.locator(".game-map-drawer");
        await drawer.waitFor({ state: "visible" });
        await drawer.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        const openStage = await checkMapCanvas(page, `${name} map legend open`);
        const drawerBounds = await drawer.boundingBox();
        assert(
          drawerBounds.x >= -1 &&
            drawerBounds.x + drawerBounds.width <= openStage.x + 2 &&
            openStage.width < fullStage.width,
          `${name}: the left legend reserves space for the resized map`,
        );
        for (const tabName of ["Informasi Wilayah", "Penduduk", "Pemain di Sekitar"]) {
          const tab = drawer.getByRole("tab", { name: tabName, exact: true });
          await tab.click();
          assert.equal(await tab.getAttribute("aria-selected"), "true");
          assert.equal(await drawer.getByRole("tabpanel").count(), 1);
          if (tabName === "Pemain di Sekitar") {
            await drawer.getByText("Belum ada pemain lain di sekitarmu.", { exact: true }).waitFor();
            assert.equal(await drawer.getByText("Budi", { exact: true }).count(), 0);
          }
          await checkPanel(page, `${name} map ${tabName}`);
        }
        await drawer.getByRole("tab", { name: "Informasi Wilayah", exact: true }).click();
        await page.screenshot({ path: `${output}/${name}-map-legend.png` });
        await toggle.click();
        await drawer.waitFor({ state: "hidden" });
        assert.equal(
          await page
            .getByRole("button", { name: "Buka legenda peta", exact: true })
            .getAttribute("aria-expanded"),
          "false",
        );
        const restoredStage = await checkMapCanvas(page, `${name} map legend closed`);
        assert(
          Math.abs(restoredStage.width - fullStage.width) <= 2,
          `${name}: collapsing the legend restores the map width`,
        );
        assert.equal(
          await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
          "Buka legenda peta",
          `${name}: collapsing the legend keeps focus on its toggle`,
        );
      }
      if (button === "Chat") {
        const chatSheet = page.locator(".game-chat-sheet");
        await chatSheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        const cb = await chatSheet.boundingBox();
        assert(
          cb.x <= 1 && cb.y <= 1 && cb.height >= height - 2 && cb.width < width,
          `${name}: chat fills the left side and leaves some world visible`,
        );
        assert.equal(await chatSheet.getAttribute("aria-modal"), "true");
        assert.equal(await page.locator(".game-modal-backdrop").count(), 1);
        const composer = await page.getByRole("textbox", { name: "Pesan chat" }).boundingBox();
        const tablist = await chatSheet.getByRole("tablist").boundingBox();
        const messages = await chatSheet.locator(".game-chat-messages:visible").boundingBox();
        assert(composer.height >= 40, `${name}: composer remains easy to tap`);
        assert(
          composer.y >= cb.y + cb.height - 84 && composer.y + composer.height <= cb.y + cb.height,
          `${name}: composer stays at the bottom of the drawer`,
        );
        assert(
          tablist.y + tablist.height <= messages.y && messages.y + messages.height <= composer.y,
          `${name}: tabs sit above history and history stays clear of the composer`,
        );
        assert.notEqual(
          await chatSheet.evaluate((el) => getComputedStyle(el).backgroundColor),
          "rgba(0, 0, 0, 0)",
          `${name}: chat has its own readable panel background`,
        );
        const activeTab = chatSheet.getByRole("tab", { name: "Dunia", exact: true });
        assert.equal(await activeTab.getAttribute("aria-selected"), "true");
        assert.equal(await chatSheet.getByRole("tabpanel").count(), 1);
        assert.equal(
          await activeTab.evaluate((el) => {
            const panel = document.getElementById(el.getAttribute("aria-controls"));
            return panel?.getAttribute("aria-labelledby") === el.id && !panel.hidden;
          }),
          true,
          `${name}: selected tab is linked to its visible panel`,
        );
        assert.equal(await chatSheet.locator(".game-chat-line:visible").count(), 3);
        assert.equal(await chatSheet.locator(".game-chat-avatar:visible").count(), 3);
        assert.equal(await chatSheet.locator(".game-chat-bubble:visible").count(), 3);
        await page.screenshot({ path: `${output}/${name}-chat-slide.png` });
      }

      await closePanel(page);
      if (button === "Perbesar peta")
        await page.waitForFunction(() =>
          document.activeElement?.matches('button[aria-label="Perbesar peta"]'),
        );
    }
    await page.getByRole("button", { name: "Perbesar peta", exact: true }).click();
    await checkPanel(page, `${name} minimap entry`);
    await checkFullscreenMap(page, `${name} minimap entry`);
    await page.keyboard.press("Escape");
    await page.locator(".game-map-sheet").waitFor({ state: "hidden" });
    await page.waitForFunction(() =>
      document.activeElement?.matches('button[aria-label="Perbesar peta"]'),
    );
    await page.getByRole("button", { name: "Chat", exact: true }).click();
    if (width === 1280) {
      const tabs = page.locator(".game-chat-sheet").getByRole("tab");
      const assertSelectedTab = async (label) => {
        const selected = tabs.filter({ hasText: label });
        assert.equal(await selected.getAttribute("aria-selected"), "true");
        assert.equal(await selected.getAttribute("tabindex"), "0");
        assert.equal(await selected.evaluate((el) => document.activeElement === el), true);
        assert.equal(await page.locator('.game-chat-sheet [role="tab"][tabindex="0"]').count(), 1);
      };
      await page.getByRole("tab", { name: "Dunia", exact: true }).focus();
      for (const [key, label] of [
        ["ArrowRight", "Pemain"],
        ["ArrowLeft", "Dunia"],
        ["Home", "Sekitar"],
        ["End", "Sistem"],
        ["ArrowRight", "Sekitar"],
        ["ArrowLeft", "Sistem"],
        ["Home", "Sekitar"],
        ["ArrowRight", "Dunia"],
      ]) {
        await page.keyboard.press(key);
        await assertSelectedTab(label);
      }
      const input = page.getByRole("textbox", { name: "Pesan chat" });
      const countBefore = await page.evaluate(() => window.net.getState().chat.length);
      await input.fill("   ");
      assert.equal(await page.getByRole("button", { name: "Kirim", exact: true }).isDisabled(), true);
      await input.press("Enter");
      assert.equal(
        await page.evaluate(() => window.net.getState().chat.length),
        countBefore,
        "whitespace-only chat is not sent",
      );
      await input.fill("x".repeat(199));
      await input.press("End");
      await input.press("z");
      await input.press("z");
      assert.equal(
        (await input.inputValue()).length,
        200,
        "chat input limits messages to 200 characters",
      );
      await input.press("Enter");
      assert.equal(await input.inputValue(), "", "successful submission clears the composer");
      assert.equal(
        await page.evaluate(() => window.net.getState().chat.at(-1).text),
        "x".repeat(199) + "z",
        "message is retained through the existing chat transport",
      );
    }
    await page.mouse.click(width - 12, height / 2);
    await page.locator(".game-chat-sheet").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.net.getState().chatOpen), false);
    await page.waitForFunction(() => document.activeElement?.matches("[data-chat-preview]"));
    await page.getByRole("button", { name: "Chat", exact: true }).click();
    await page.getByRole("tab", { name: "Pemain", exact: true }).click();
    await page.getByRole("button", { name: /Budi/ }).click();
    await checkPanel(page, `${name} nested player`);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("[data-game-panel]").count(), 1);
    if (width === 1280)
      await page.waitForFunction(() => document.activeElement?.matches(".game-chat-player"));
    await closePanel(page);
    await page.getByRole("button", { name: "Buka profil dan progression" }).click();
    await checkPanel(page, `${name} profile`);
    await page.getByRole("button", { name: "Edit profil", exact: true }).click();
    await page.getByRole("textbox", { name: "Nama tampilan" }).fill("Nama panjang QA");
    await checkPanel(page, `${name} edit profile`);
    await page.getByRole("button", { name: "Batal edit" }).click();
    await page.getByRole("button", { name: "Koleksi", exact: true }).click();
    await checkPanel(page, `${name} inventory`);
    await page.getByRole("button", { name: "Karakter & peran" }).click();
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("button", { name: "Pakaian", exact: true }).click();
    await checkPanel(page, `${name} designer`);
    await page.getByRole("button", { name: "Aksesori", exact: true }).click();
    await page.getByRole("button", { name: "Kembali ke profil" }).click();
    assert.equal(await page.evaluate(() => window.profile.getState().appearanceDraft), null);
    await closePanel(page);
    await page.getByRole("button", { name: "Quest", exact: true }).click();
    await checkPanel(page, `${name} quest journal`);
    const questDrawer = page.locator(".game-quest-drawer");
    const qb = await questDrawer.boundingBox();
    assert(
      qb.x < 20 && qb.width < width * 0.85,
      "quest drawer opens at left and leaves world visible",
    );
    assert.equal(await page.locator(".game-modal-backdrop").count(), 0);
    await page.screenshot({ path: `${output}/${name}-quest-drawer.png` });

    await page.getByRole("button", { name: "Batalkan quest", exact: true }).click();
    await checkPanel(page, `${name} cancel confirmation`);
    await page.getByRole("button", { name: "Tetap lanjut", exact: true }).click();
    await page.getByRole("button", { name: "Riwayat", exact: true }).click();
    await closePanel(page);
    await page.locator('[data-side-action="phone"]').click();
    await checkPanel(page, `${name} phone apps`);
    await page.locator("[data-phone-panel]").waitFor();
    await page.getByRole("button", { name: "Pengaturan game" }).click();
    await checkPanel(page, `${name} settings`);
    await page.getByLabel("Ukuran UI").selectOption("comfortable");
    await checkPanel(page, `${name} comfortable settings`);
    await page.getByLabel("Ukuran UI").selectOption("compact");
    await closePanel(page);
    await page.locator('[data-side-action="phone"]').click();
    await page.getByRole("button", { name: "Atur volume musik & efek" }).click();
    await page.locator("[data-phone-audio]").waitFor();
    await checkPanel(page, `${name} audio`);
    await page.getByRole("button", { name: "Bisukan semua" }).click();
    await page.getByRole("button", { name: "Aktifkan suara" }).click();
    await page.getByRole("button", { name: "Kembali ke aplikasi", exact: true }).click();
    await page.getByRole("button", { name: "Peta", exact: true }).click();
    await checkPanel(page, `${name} phone map`);
    await checkFullscreenMap(page, `${name} phone map`);
    await closePanel(page);
    await page.waitForFunction(() =>
      document.activeElement?.matches('button[aria-label="Perbesar peta"]'),
    );
    await page.evaluate(() =>
      window.game.setState({
        overlay: "dialogue",
        activeNpc: "npc-nakama-warehouse",
        dialogue: [{ role: "npc", text: "Percakapan panjang. ".repeat(100) }],
      }),
    );
    await checkPanel(page, `${name} NPC`);
    // Simulate the visualViewport event used by a software keyboard (not an OS keyboard).
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 180 });
      window.visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(
      () => document.querySelector(".world-viewport").getBoundingClientRect().height === 180,
    );
    const keyboardPanel = await checkPanel(page, `${name} keyboard viewport`);
    const keyboardBounds = await keyboardPanel.boundingBox();
    assert(keyboardBounds.y + keyboardBounds.height <= 181);
    await closePanel(page);
    await page.evaluate(() => {
      delete window.visualViewport.height;
      window.visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(
      () => document.querySelector(".world-viewport").getBoundingClientRect().height > 180,
    );
    for (const sheet of ["feed", "archive", "help"]) {
      await page.evaluate((sheet) => window.hud.getState().setSheet(sheet), sheet);
      await checkPanel(page, `${name} ${sheet}`);
      await closePanel(page);
    }
    await page.evaluate(() => {
      window.dungeon.setState({
        data: {
          config: { entrance: [0, 0, 0], spawn: [0, 0, 0], objectives: [], chapters: [] },
          quests: [],
          instance: null,
        },
      });
      window.hud.setState({ principalPanel: "missions" });
    });
    await checkPanel(page, `${name} principal missions`);
    await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
    await page.getByText("Belum ada catatan. Selesaikan misi untuk masuk peringkat.").waitFor();
    await checkPanel(page, `${name} leaderboard`);
    await closePanel(page);
    await page.evaluate(() => window.dungeon.setState({ data: null }));
    await page.evaluate(() => {
      const snapshot = window.core.getState().snapshot;
      snapshot.quests[0].objectives[0].secret = {
        archiveId: "qa",
        archiveIndex: 1,
        title: "Jejak rahasia",
        interactionType: "TRIVIA",
        question: "Temukan jawaban yang sesuai dengan petunjuk di ruangan.",
        answers: ["Jawaban pertama", "Jawaban kedua", "Jawaban ketiga"],
        discoveryText: "Petunjuk panjang. ".repeat(30),
      };
      window.core.setState({ snapshot: { ...snapshot } });
      window.secret.setState({ open: false, objectiveIndex: null, feedback: null });
    });
    assert.equal(
      await page.locator("[data-quest-interaction]").count(),
      0,
      "no quest action outside radius",
    );
    await page.evaluate(() => window.game.setState({ playerPos: [12, 0.83, 12] }));
    await page.getByRole("button", { name: "Selidiki jejak", exact: true }).waitFor();
    assert.equal(
      await page.locator("[data-mobile-action]").count(),
      0,
      "quest action replaces unrelated nearby control",
    );
    await page.screenshot({ path: `${output}/${name}-quest-action.png` });
    if (touch) await page.getByRole("button", { name: "Selidiki jejak", exact: true }).click();
    else await page.keyboard.press("f");
    await checkPanel(page, `${name} secret`);
    await closePanel(page);
    await page.getByRole("button", { name: "Selidiki jejak", exact: true }).waitFor();
    await page.evaluate(() => window.game.setState({ playerPos: [0, 0.83, 0] }));
    await page.locator("[data-quest-interaction]").waitFor({ state: "hidden" });

    await page.evaluate(() =>
      window.dialogue.getState().open({
        name: "Koordinator",
        role: "Gudang",
        kind: "talk",
        lines: [
          { speaker: "npc", text: "Cerita misi panjang. ".repeat(100) },
          { speaker: "player", text: "Baik!" },
        ],
      }),
    );
    await checkPanel(page, `${name} dungeon dialogue`);
    await closePanel(page);
    await page.evaluate(() =>
      window.completion.setState({
        result: {
          title: "Quest selesai",
          theme: "rahasia-dunia",
          xpAwarded: 100,
          clueXp: 50,
          pointAwarded: 50,
          durationSeconds: 125,
        },
      }),
    );
    await checkPanel(page, `${name} completion`);
    await closePanel(page);
    await page.evaluate(() => {
      const id = window.connectionId;
      window.club.setState({
        inside: true,
        data: {
          members: {
            [id]: { name: "Cung", dance: null },
            bob: { name: "Budi", dance: { id: "disco", startedAt: Date.now(), groupId: "bob" } },
          },
          activeDjId: id,
          queue: [{ id: "q", mediaId: "cung-underground-set" }],
          requests: [{ id: "r", mediaId: "cung-underground-set" }],
          waiting: [],
          playbackStatus: "paused",
          mediaId: "cung-underground-set",
          positionSeconds: 0,
          provider: "mock",
        },
      });
      window.editor.setState({
        targets: [
          {
            id: "booth",
            type: "DJ_BOOTH",
            active: true,
            position: { x: 0, y: 0, z: 0 },
            radius: 3,
            tags: [],
          },
        ],
      });
      window.hud.getState().setSheet("dance");
    });
    await checkPanel(page, `${name} dance`);
    await page.screenshot({ path: `${output}/${name}-dance.png` });
    await closePanel(page);
    await page.evaluate(() => window.hud.getState().setSheet("club"));
    await checkPanel(page, `${name} club`);
    await page.getByRole("button", { name: "Antrean", exact: true }).click();
    await page.getByRole("button", { name: "DJ Console", exact: true }).click();
    await checkPanel(page, `${name} DJ`);
    await page.screenshot({ path: `${output}/${name}-dj.png` });
    await closePanel(page);
    await page.evaluate(() => window.club.setState({ inside: false, data: null }));
    // Exercise the same canvas wheel hook used by Player, with UI lock and bounds.
    await page.evaluate(() => window.zoom.setState({ distance: 1 }));
    if (!touch) {
      await page.mouse.move(width / 2, height / 2);
      await page.mouse.wheel(0, 120);
      await page.waitForFunction(() => window.zoom.getState().distance > 1);
      await page.mouse.wheel(0, -120);
      await page.waitForFunction(() => Math.abs(window.zoom.getState().distance - 1) < 0.001);
      await page.getByRole("button", { name: "Chat", exact: true }).click();
      await page.locator("[data-zoom-canvas]").dispatchEvent("wheel", { deltaY: 120 });
      assert(Math.abs((await page.evaluate(() => window.zoom.getState().distance)) - 1) < 0.001);
      await closePanel(page);
    }
    if (touch) {
      const bounds = await page.locator("[data-mobile-look]").boundingBox();
      const pinchSession = await context.newCDPSession(page);
      const a = {
        id: 10,
        x: Math.round(bounds.x + 50),
        y: Math.round(bounds.y + bounds.height / 2),
      };
      const b = { id: 11, x: a.x + 70, y: a.y };
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [a, b],
      });
      b.x += 60;
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [a, b],
      });
      await page.waitForFunction(() => window.zoom.getState().distance < 0.8);
      assert.equal(
        await page.evaluate(() => window.touchDrive.getState().lookX),
        0,
        "pinch must not rotate",
      );
      b.x -= 60;
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [a, b],
      });
      await page.waitForFunction(() => window.zoom.getState().distance > 0.9);
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      b.x = a.x + 35;
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [a, b],
      });
      b.x = a.x + 210;
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [a, b],
      });
      await page.waitForFunction(() => window.zoom.getState().distance === 0.5);
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [a, b],
      });
      b.x = a.x + 35;
      await pinchSession.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [a, b],
      });
      await page.waitForFunction(() => window.zoom.getState().distance === 1.6);
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.equal(
        await page.getByRole("button", { name: /Perbesar tampilan|Perkecil tampilan/ }).count(),
        0,
      );
      await page.locator("[data-mobile-move-zone]").waitFor();
      const left = await page.locator("[data-mobile-move-zone]").boundingBox();
      const right = await page.locator("[data-mobile-look]").boundingBox();
      const joystick = page.locator("[data-mobile-joystick]");
      const idleBounds = await joystick.boundingBox();
      const checkJoystickIdle = async (reason) => {
        await page.waitForFunction(() => {
          const stick = document.querySelector("[data-mobile-joystick]");
          const direction = stick?.querySelector(".mmo-joystick-direction");
          return (
            stick?.dataset.active === "false" &&
            stick.dataset.moving === "false" &&
            direction &&
            getComputedStyle(direction).opacity === "0"
          );
        });
        assert(
          (await joystick.evaluate((el) => Number(getComputedStyle(el).opacity))) > 0,
          `${name}: idle analog remains visible after ${reason}`,
        );
        const currentBounds = await joystick.boundingBox();
        assert(
          Math.abs(currentBounds.x - idleBounds.x) < 1 &&
            Math.abs(currentBounds.y - idleBounds.y) < 1,
          `${name}: analog returns to its default corner after ${reason}`,
        );
        assert.equal(await page.evaluate(() => window.touchDrive.getState().active), false);
      };
      const checkJoystickDirection = async () => {
        await page.waitForFunction(() => {
          const stick = document.querySelector("[data-mobile-joystick]");
          const direction = stick?.querySelector(".mmo-joystick-direction");
          return (
            stick?.dataset.moving === "true" &&
            direction &&
            Number(getComputedStyle(direction).opacity) > 0
          );
        });
        const direction = await page.evaluate(() => {
          const state = window.touchDrive.getState();
          const arc = document.querySelector(".mmo-joystick-direction");
          const rotation = arc.getAttribute("transform").match(/rotate\(\s*([-\d.]+)/);
          return {
            actual: rotation ? Number(rotation[1]) : NaN,
            expected: (Math.atan2(state.moveY, state.moveX) * 180) / Math.PI,
          };
        });
        assert(
          Math.abs(direction.actual - direction.expected) < 1,
          `${name}: cyan arc follows movement direction ${JSON.stringify(direction)}`,
        );
      };
      await checkJoystickIdle("initial render");
      assert.equal(await joystick.locator(".mmo-joystick-cardinals path").count(), 4);
      await page.screenshot({ path: `${output}/${name}-analog-idle.png` });
      const session = await context.newCDPSession(page);
      const move = {
        x: Math.round(left.x + left.width * 0.4),
        y: Math.round(left.y + left.height * 0.55),
        id: 1,
      };
      const look = {
        x: Math.round(right.x + right.width * 0.5),
        y: Math.round(right.y + right.height * 0.5),
        id: 2,
      };
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [move] });
      assert.equal(await joystick.getAttribute("data-moving"), "false");
      move.x += 25;
      move.y -= 18;
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [move] });
      await checkJoystickDirection();
      await joystick
        .locator(".mmo-joystick-disc")
        .evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
      const movingRing = await joystick.locator(".mmo-joystick-ring").boundingBox();
      const chat = await page.locator("[data-chat-preview]").boundingBox();
      assert(movingRing.width > idleBounds.width * 1.3, `${name}: moving analog expands`);
      assert(
        movingRing.x >= 0 &&
          movingRing.y >= 0 &&
          movingRing.x + movingRing.width <= width &&
          movingRing.y + movingRing.height <= chat.y,
        `${name}: moving analog remains in the viewport and clear of chat`,
      );
      await page.screenshot({ path: `${output}/${name}-analog-active.png` });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [move, look],
      });
      look.x += 30;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [move, look],
      });
      await page.waitForFunction(() => window.touchDrive.getState().lookX !== 0, null, {
        timeout: 3000,
      });
      const input = await page.evaluate(() => {
        const s = window.touchDrive.getState();
        return { move: s.moveX, look: s.lookX };
      });
      assert(
        input.move > 0 && input.look !== 0,
        `${name}: independent multitouch ${JSON.stringify(input)}`,
      );
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [look] });
      assert((await page.evaluate(() => window.touchDrive.getState().moveX)) > 0);
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.equal(await page.evaluate(() => window.touchDrive.getState().active), false);
      await checkJoystickIdle("release");

      // Exercise the opposite quadrant and interrupted gestures, without leaving movement stuck.
      const interruptedMove = {
        x: Math.round(left.x + left.width * 0.4),
        y: Math.round(left.y + left.height * 0.55),
        id: 3,
      };
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [interruptedMove],
      });
      interruptedMove.x -= 25;
      interruptedMove.y += 18;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [interruptedMove],
      });
      await checkJoystickDirection();
      await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      await checkJoystickIdle("cancellation");

      interruptedMove.id = 4;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [interruptedMove],
      });
      interruptedMove.x += 25;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [interruptedMove],
      });
      await checkJoystickDirection();
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await checkJoystickIdle("window blur");
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("dialog", { name: "Putar perangkat" }).waitFor();
      assert.equal(await page.locator("[data-game-ui-root]").getAttribute("inert"), "");
      await page.setViewportSize({ width, height });
      await page.getByRole("dialog", { name: "Putar perangkat" }).waitFor({ state: "hidden" });
      assert.equal(
        await page.evaluate(() => window.mounts),
        1,
        "rotation must not remount session",
      );
    }
    await page.waitForFunction(
      ({ width, height }) => {
        const r = document.querySelector(".world-viewport").getBoundingClientRect();
        return Math.abs(r.width - width) < 1 && Math.abs(r.height - height) < 1;
      },
      { width, height },
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await checkSideMenus(page, `${name} after gameplay`);
    const chatBounds = await page.locator("[data-chat-preview]").boundingBox();
    if (touch) {
      const moveBounds = await page.locator("[data-mobile-move-zone]").boundingBox();
      assert(moveBounds.y + moveBounds.height <= chatBounds.y, `${name}: analog clear of chat`);
    }
    await page.screenshot({ path: `${output}/${name}-hud.png` });
    await context.close();
  }
  const historyPage = await browser.newPage({ viewport: { width: 844, height: 390 } });
  historyPage.on("pageerror", (e) => errors.push(e.message));
  await historyPage.goto("http://127.0.0.1:4221/");
  await historyPage.locator("[data-chat-preview]").waitFor();
  await historyPage.evaluate(() =>
    window.net.setState({
      chat: Array.from({ length: 30 }, (_, n) => ({
        id: `history-${n}`,
        from: "bob",
        name: "Budi",
        text: `Pesan riwayat ${n}`,
        at: Date.now() - (n === 29 ? 8500 : 60000 - n * 1000),
      })),
    }),
  );
  await historyPage.locator(".mmo-chat-history time").waitFor();
  assert.match(await historyPage.locator(".mmo-chat-history time").innerText(), /\d{2}[.:]\d{2}/);
  await historyPage.locator(".mmo-chat-history").waitFor({ state: "hidden", timeout: 5000 });
  assert.equal(
    await historyPage.evaluate(() => window.net.getState().chat.length),
    30,
    "expiry preserves messages",
  );
  await historyPage.getByRole("button", { name: "Chat", exact: true }).click();
  assert.equal(
    await historyPage.locator(".game-chat-messages:visible .game-chat-line time").count(),
    30,
    "click restores timestamped history",
  );
  const history = historyPage.getByLabel("Riwayat chat", { exact: true });
  assert(
    await history.evaluate((el) => el.scrollHeight > el.clientHeight),
    "history is scrollable",
  );
  await history.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
  });
  await historyPage.evaluate(() =>
    window.net.setState((s) => ({
      chat: [
        ...s.chat,
        {
          id: "fresh-message",
          from: "bob",
          name: "Budi",
          text: "Pesan terbaru",
          at: Date.now(),
        },
      ],
    })),
  );
  await historyPage
    .locator(".game-chat-messages:visible")
    .getByText("Pesan terbaru", { exact: true })
    .waitFor();
  assert.equal(
    await history.evaluate((el) => el.scrollTop),
    0,
    "new messages preserve reading position",
  );
  await closePanel(historyPage);
  await historyPage
    .locator(".mmo-chat-history")
    .getByText("Pesan terbaru", { exact: false })
    .waitFor();
  assert.equal(
    await historyPage.locator(".mmo-chat-history time").count(),
    1,
    "expired history stays hidden on closing",
  );
  await historyPage.close();
  console.log(
    "PASS chat timestamps, automatic expiry, retained scrollable history and stable reading position",
  );
  const preview = await browser.newPage({ viewport: { width: 844, height: 390 } });
  preview.on("pageerror", (e) => errors.push(e.message));
  await preview.goto("http://127.0.0.1:4221/?guidance");
  await preview.waitForFunction(
    () => window.guidanceScene?.getObjectByName("quest-foot-guidance")?.visible,
  );
  await preview.evaluate(() => {
    const snapshot = structuredClone(window.core.getState().snapshot);
    snapshot.quests[0].objectives[0].position = [4, 0, -3];
    window.core.setState({ snapshot });
  });
  await preview.waitForFunction(
    () =>
      Math.abs(
        window.guidanceScene.getObjectByName("quest-direction").rotation.y - Math.atan2(4, -3),
      ) < 0.001,
  );
  const markerY = await preview.evaluate(
    () => window.guidanceScene.getObjectByName("quest-foot-guidance").position.y,
  );
  assert(Math.abs(markerY - 0.11) < 0.001, "guidance rests at the feet");
  const arrowTrail = await preview.evaluate(async () => {
    const direction = window.guidanceScene.getObjectByName("quest-direction");
    const trail = direction.getObjectByName("quest-arrow-trail");
    if (!trail?.isInstancedMesh) return { instanced: false };
    const colors = trail.geometry.getAttribute("color");
    const palette = new Map();
    for (let index = 0; index < (colors?.count ?? 0); index++) {
      const color = [colors.getX(index), colors.getY(index), colors.getZ(index)];
      palette.set(color.map((value) => value.toFixed(5)).join(","), color);
    }
    let meshes = 0;
    direction.traverse((object) => {
      if (object.isMesh) meshes++;
    });
    const before = Array.from(trail.instanceMatrix.array);
    const version = trail.instanceMatrix.version;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const after = Array.from(trail.instanceMatrix.array);
    return {
      instanced: true,
      count: trail.count,
      meshes,
      palette: [...palette.values()],
      colorsMatchVertices: colors?.count === trail.geometry.getAttribute("position").count,
      matricesChanged: before.some((value, index) => Math.abs(value - after[index]) > 1e-6),
      matricesUploaded: trail.instanceMatrix.version > version,
      forwardPositions: Array.from({ length: trail.count }, (_, index) => after[index * 16 + 14]),
      opacityCount: trail.geometry.getAttribute("trailOpacity").count,
      materialStrength: trail.material.uniforms?.strength?.value ?? 0,
    };
  });
  assert.equal(arrowTrail.instanced, true, "ground arrows use one InstancedMesh");
  assert.equal(arrowTrail.count, 18, "the trail has eighteen reusable arrow instances");
  assert.equal(arrowTrail.meshes, 1, "arrows do not allocate a separate mesh per marker");
  assert.equal(arrowTrail.opacityCount, 18, "each arrow fades independently at trail edges");
  assert(
    arrowTrail.materialStrength > 0.01,
    "animation updates the mounted shader material's strength, not a detached uniform descriptor",
  );
  assert.equal(arrowTrail.colorsMatchVertices, true);
  assert.equal(arrowTrail.palette.length, 2, "arrow geometry contains orange and white regions");
  assert(
    arrowTrail.palette.some(([r, g, b]) => r > 0.95 && g > 0.2 && g < 0.6 && b < 0.3) &&
      arrowTrail.palette.some(([r, g, b]) => r > 0.85 && g > 0.85 && b > 0.85),
    "the trail keeps its orange centre and white border in linear vertex colors",
  );
  assert(
    arrowTrail.matricesChanged && arrowTrail.matricesUploaded,
    "arrow instance transforms advance and are uploaded across two animation frames",
  );
  for (let index = 1; index < arrowTrail.forwardPositions.length; index++)
    assert(
      Math.abs(arrowTrail.forwardPositions[index] - arrowTrail.forwardPositions[index - 1] - 1.35) <
        1e-5,
      "rendered arrow instances retain uniform forward spacing",
    );
  const orangeTrailPixels = await preview.evaluate(async () => {
    const renderer = window.guidanceRenderer;
    const scene = window.guidanceScene;
    const trail = scene.getObjectByName("quest-arrow-trail");
    const capture = async () => {
      renderer.render(scene, window.guidanceCamera);
      const image = new Image();
      image.src = renderer.domElement.toDataURL();
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const wasVisible = trail.visible;
    try {
      trail.visible = false;
      const baseline = await capture();
      trail.visible = wasVisible;
      const rendered = await capture();
      let count = 0;
      for (let index = 0; index < rendered.length; index += 4) {
        const r = rendered[index],
          g = rendered[index + 1],
          b = rendered[index + 2];
        if (
          r > 200 &&
          g >= 80 && g <= 190 &&
          b >= 40 && b <= 140 &&
          r - g > 45 &&
          Math.abs(r - baseline[index]) +
            Math.abs(g - baseline[index + 1]) +
            Math.abs(b - baseline[index + 2]) > 20
        )
          count++;
      }
      return count;
    } finally {
      trail.visible = wasVisible;
    }
  });
  assert(
    orangeTrailPixels > 20,
    `the canvas renders orange arrow interiors: ${orangeTrailPixels} pixels added by the trail`,
  );
  await preview.screenshot({ path: `${output}/quest-ground-guidance.png` });
  await preview.evaluate(() => window.game.setState({ playerPos: [1, 0.83, 2] }));
  await preview.waitForFunction(
    () =>
      Math.abs(window.guidanceScene.getObjectByName("quest-foot-guidance").position.x - 1) <
        0.001 &&
      Math.abs(
        window.guidanceScene.getObjectByName("quest-direction").rotation.y - Math.atan2(3, -5),
      ) < 0.001,
  );
  // Move the rendered player every frame while its 150ms store snapshot stays fixed.
  const motion = await preview.evaluate(async () => {
    const actor = window.guidanceScene.getObjectByName("Player");
    const feet = window.guidanceScene.getObjectByName("quest-foot-guidance");
    const arrow = window.guidanceScene.getObjectByName("quest-direction");
    let maxLag = 0,
      maxStep = 0,
      maxAngleError = 0,
      movedFrames = 0;
    let lastX = feet.position.x,
      lastZ = feet.position.z;
    for (let n = 1; n <= 90; n++) {
      // A right-angle walking path. Keep the objective fixed throughout the turn.
      actor.position.x = 1 + Math.min(n, 45) / 45;
      actor.position.z = 2 - Math.max(0, n - 45) / 45;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const step = Math.hypot(feet.position.x - lastX, feet.position.z - lastZ);
      maxStep = Math.max(maxStep, step);
      if (step > 0.0001) movedFrames++;
      maxLag = Math.max(
        maxLag,
        Math.hypot(feet.position.x - actor.position.x, feet.position.z - actor.position.z),
      );
      const expected = Math.atan2(4 - feet.position.x, -3 - feet.position.z);
      maxAngleError = Math.max(
        maxAngleError,
        Math.abs(
          Math.atan2(Math.sin(expected - arrow.rotation.y), Math.cos(expected - arrow.rotation.y)),
        ),
      );
      lastX = feet.position.x;
      lastZ = feet.position.z;
    }
    return {
      maxLag,
      maxStep,
      maxAngleError,
      movedFrames,
      storedX: window.game.getState().playerPos[0],
    };
  });
  assert.equal(motion.storedX, 1, "render-only guidance never writes player state");
  assert(
    motion.maxLag < 0.15 && motion.maxStep < 0.08 && motion.movedFrames >= 85,
    `continuous following without 150ms snapping: ${JSON.stringify(motion)}`,
  );
  assert(motion.maxAngleError < 0.12, `accurate aim during turns: ${JSON.stringify(motion)}`);
  console.log("Guidance movement", motion);
  await preview.evaluate(() => window.game.setState({ playerPos: [4, 0.83, -3] }));
  await preview.waitForFunction(
    () => window.guidanceScene.getObjectByName("quest-direction").visible === false,
  );
  assert.equal(
    await preview.evaluate(() => {
      const trail = window.guidanceScene.getObjectByName("quest-arrow-trail");
      let visible = true;
      for (let object = trail; object; object = object.parent) visible &&= object.visible;
      const alpha = trail.geometry.getAttribute("trailOpacity");
      return !visible && Array.from(alpha.array).every((value) => value === 0);
    }),
    true,
    "arriving at the objective hides the complete trail and clears every arrow opacity",
  );
  await preview.evaluate(() => {
    const s = structuredClone(window.core.getState().snapshot);
    s.active.status = "COMPLETED";
    window.core.setState({ snapshot: s });
  });
  await preview.waitForFunction(() => !window.guidanceScene.getObjectByName("quest-foot-guidance"));
  await preview.goto("http://127.0.0.1:4221/?guidance&road");
  await preview.waitForFunction(() => window.guidanceScene?.getObjectByName("ConnectedAsphalt"));
  await preview.evaluate(() => {
    window.game.setState({ playerPos: [0, 0.79, 20] });
    const snapshot = structuredClone(window.core.getState().snapshot);
    snapshot.quests[0].objectives[0].position = [4, 0, 14];
    window.core.setState({ snapshot });
  });
  await preview.waitForFunction(
    () => window.guidanceScene.getObjectByName("quest-foot-guidance")?.position.z === 20,
  );
  // At the real physics floor, the old marker Y=.015 sat below asphalt .042 and zebra .0675.
  await preview.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const changedPixels = await preview.evaluate(async () => {
    const source = window.guidanceRenderer.domElement;
    const img = new Image();
    img.src = source.toDataURL();
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const foot = window.guidanceScene
      .getObjectByName("quest-foot-guidance")
      .position.clone()
      .project(window.guidanceCamera);
    const x = Math.round(((foot.x + 1) * canvas.width) / 2),
      y = Math.round(((1 - foot.y) * canvas.height) / 2);
    const data = ctx.getImageData(x - 70, y - 35, 140, 70).data;
    window.guidanceScene.getObjectByName("quest-foot-guidance").visible = false;
    window.guidanceRenderer.render(window.guidanceScene, window.guidanceCamera);
    const clean = new Image();
    clean.src = source.toDataURL();
    await clean.decode();
    ctx.drawImage(clean, 0, 0);
    const baseline = ctx.getImageData(x - 70, y - 35, 140, 70).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4)
      if (
        Math.abs(data[i] - baseline[i]) +
          Math.abs(data[i + 1] - baseline[i + 1]) +
          Math.abs(data[i + 2] - baseline[i + 2]) >
        20
      )
        count++;
    window.guidanceScene.getObjectByName("quest-foot-guidance").visible = true;
    return count;
  });
  assert(
    changedPixels > 40 && changedPixels < 140 * 70 * 0.3,
    `thin translucent guidance readable over road paint: ${changedPixels} changed pixels`,
  );
  await preview.screenshot({ path: `${output}/quest-guidance-crosswalk.png` });
  await preview.goto("http://127.0.0.1:4221/?guidance&bright");
  await preview.waitForFunction(
    () => window.guidanceScene?.getObjectByName("quest-foot-guidance")?.visible,
  );
  await preview.evaluate(() => {
    const snapshot = structuredClone(window.core.getState().snapshot);
    snapshot.quests[0].objectives[0].position = [4, 0, -3];
    window.core.setState({ snapshot });
  });
  await preview.waitForFunction(
    () =>
      Math.abs(
        window.guidanceScene.getObjectByName("quest-direction").rotation.y - Math.atan2(4, -3),
      ) < 0.001,
  );
  await preview.screenshot({ path: `${output}/quest-guidance-bright.png` });
  await preview.evaluate(() => {
    const snapshot = structuredClone(window.core.getState().snapshot);
    snapshot.quests[0].objectives[0].position = [0, 0, -6];
    window.core.setState({ snapshot });
    window.guidanceCamera.position.set(0, 2.8, 8);
    window.guidanceCamera.lookAt(0, 0.8, 0);
  });
  await preview.waitForFunction(
    () =>
      Math.abs(
        Math.abs(window.guidanceScene.getObjectByName("quest-direction").rotation.y) - Math.PI,
      ) < 0.001,
  );
  const occlusion = await preview.evaluate(async () => {
    const renderer = window.guidanceRenderer;
    const scene = window.guidanceScene;
    const camera = window.guidanceCamera;
    const foot = scene.getObjectByName("quest-foot-guidance");
    const halo = scene.getObjectByName("quest-objective-halo");
    const capture = async () => {
      renderer.render(scene, camera);
      const img = new Image();
      img.src = renderer.domElement.toDataURL();
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    foot.visible = halo.visible = false;
    const clean = await capture();
    foot.visible = halo.visible = true;
    const actual = await capture();
    const materials = [];
    for (const group of [foot, halo])
      group.traverse((obj) => {
        if (obj.material) materials.push(obj.material);
      });
    const usesDepth = materials.every((material) => material.depthTest && !material.depthWrite);
    materials.forEach((material) => {
      material.depthTest = false;
    });
    const oldBehavior = await capture();
    materials.forEach((material) => {
      material.depthTest = true;
    });
    const torso = scene.getObjectByName("guidance-test-body");
    const center = torso.getWorldPosition(torso.position.clone()).project(camera);
    const cx = Math.floor(((center.x + 1) * renderer.domElement.width) / 2);
    const cy = Math.floor(((1 - center.y) * renderer.domElement.height) / 2);
    const index = (cy * renderer.domElement.width + cx) * 4;
    const bodyColor = [clean[index], clean[index + 1], clean[index + 2]];
    let bodyPixels = 0,
      coveredNow = 0,
      coveredBefore = 0;
    for (let i = 0; i < clean.length; i += 4) {
      // Flat blue test torso: exclude antialiased silhouette pixels.
      if (
        Math.abs(clean[i] - bodyColor[0]) > 2 ||
        Math.abs(clean[i + 1] - bodyColor[1]) > 2 ||
        Math.abs(clean[i + 2] - bodyColor[2]) > 2
      )
        continue;
      bodyPixels++;
      if (
        Math.abs(actual[i] - clean[i]) +
          Math.abs(actual[i + 1] - clean[i + 1]) +
          Math.abs(actual[i + 2] - clean[i + 2]) >
        12
      )
        coveredNow++;
      if (
        Math.abs(oldBehavior[i] - clean[i]) +
          Math.abs(oldBehavior[i + 1] - clean[i + 1]) +
          Math.abs(oldBehavior[i + 2] - clean[i + 2]) >
        12
      )
        coveredBefore++;
    }
    renderer.render(scene, camera);
    return { bodyPixels, coveredNow, coveredBefore, usesDepth };
  });
  assert(
    occlusion.bodyPixels > 50 && occlusion.coveredBefore > 5,
    `occlusion test reproduces old overlap: ${JSON.stringify(occlusion)}`,
  );
  assert(
    occlusion.usesDepth && occlusion.coveredNow === 0,
    `guidance never paints over torso: ${JSON.stringify(occlusion)}`,
  );
  console.log("PASS guidance occlusion", occlusion);
  await preview.screenshot({ path: `${output}/quest-guidance-character-occlusion.png` });
  await preview.evaluate(() => {
    window.net
      .getState()
      .pushChat({
        id: "bubble-local",
        from: window.connectionId,
        name: "Kamu",
        text: "Halo! Ayo lanjut quest di toko.",
        at: Date.now(),
      });
    window.net
      .getState()
      .pushChat({
        id: "bubble-other",
        from: "bubble-remote",
        name: "Budi",
        text: "Aku ikut!",
        at: Date.now(),
      });
  });
  await preview.waitForFunction(
    () =>
      window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`) &&
      window.guidanceScene.getObjectByName("chat-bubble-bubble-remote"),
  );
  await preview.waitForFunction(() => {
    const group = window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`);
    let ready = false;
    group.traverse((o) => {
      if (o.text === "Halo! Ayo lanjut quest di toko." && o.textRenderInfo) ready = true;
    });
    return ready;
  });
  await preview.screenshot({ path: `${output}/player-chat-bubbles.png` });
  await preview.evaluate(() => {
    const actor = window.guidanceScene.getObjectByName("Player");
    actor.position.x += 1;
    const bubble = window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`);
    const world = bubble.getWorldPosition(bubble.position.clone());
    if (Math.abs(world.x - actor.position.x) > 0.001)
      throw new Error("bubble detached from player");
    window.net
      .getState()
      .pushChat({
        id: "bubble-replace",
        from: window.connectionId,
        name: "Kamu",
        text: "Pesan pengganti",
        at: Date.now() - 7000,
      });
  });
  await preview.waitForFunction(() => {
    const bubble = window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`);
    let replaced = false;
    bubble?.traverse((o) => {
      if (o.text === "Pesan pengganti") replaced = true;
    });
    return replaced;
  });
  await preview.waitForFunction(
    () => !window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`),
    null,
    { timeout: 5000 },
  );
  assert(
    await preview.evaluate(() => window.net.getState().chat.some((m) => m.id === "bubble-replace")),
    "bubble expiry preserves chat history",
  );
  console.log(
    "PASS local/remote chat bubbles, rendered text, following, replacement and timed expiry",
  );
  await preview.close();
  assert.deepEqual(errors, []);
  console.log(
    process.env.GUIDANCE_QA_ONLY
      ? "PASS focused guidance and chat history checks (mock transport)."
      : "PASS six landscape sizes: panels, nested profile/designer/quest, inventory, settings/audio, secret, dialogue, rewards, club/DJ, multitouch, orientation state preservation. Mock transport; not real-device or multiplayer certification.",
  );
} finally {
  await browser.close();
  await server.close();
}
