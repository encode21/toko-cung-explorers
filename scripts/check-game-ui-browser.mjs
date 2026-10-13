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
try {
  if (process.env.LOBBY_QA_ONLY) {
    for (const [width, height] of sizes) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1280 });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:4221/?lobby");
      await page.getByRole("button", { name: /CHANNEL 01/ }).waitFor();
      const checkLobby = async (expanded = false) => {
        const result = await page.evaluate(() => {
          const view = document.querySelector(".world-viewport").getBoundingClientRect();
          const selectors = [
            ".adventure-content",
            ".lobby-grid",
            ".lobby-identity",
            ".lobby-channels",
            ".channel-actions",
            ".lobby-actions",
          ];
          return {
            outer:
              document.documentElement.scrollHeight > innerHeight ||
              document.documentElement.scrollWidth > innerWidth,
            boxes: selectors.map((selector) => {
              const el = document.querySelector(selector);
              const r = el.getBoundingClientRect();
              return {
                selector,
                inside:
                  r.top >= view.top &&
                  r.bottom <= view.bottom + 1 &&
                  r.left >= view.left &&
                  r.right <= view.right + 1,
              };
            }),
            listScroll:
              document.querySelector(".channel-list").scrollHeight >
              document.querySelector(".channel-list").clientHeight + 1,
            identityScroll:
              document.querySelector(".lobby-identity-scroll").scrollHeight >
              document.querySelector(".lobby-identity-scroll").clientHeight + 1,
          };
        });
        assert(
          !result.outer && result.boxes.every((b) => b.inside),
          `${width}x${height}: lobby clipped ${JSON.stringify(result)}`,
        );
        if (!expanded)
          assert(
            !result.listScroll && !result.identityScroll,
            `${width}x${height}: default lobby needs scroll ${JSON.stringify(result)}`,
          );
      };
      await checkLobby();
      await page.screenshot({ path: `${output}/${width}x${height}-lobby.png` });
      await page.getByRole("button", { name: /CHANNEL 01/ }).click();
      assert(await page.getByRole("button", { name: "Masuk Dunia", exact: true }).isEnabled());
      await page.getByRole("button", { name: "Ubah nama pemain" }).click();
      await page.getByLabel("Nama pemain", { exact: true }).fill("Nama pemain QA");
      await checkLobby(true);
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 180 });
        window.visualViewport.dispatchEvent(new Event("resize"));
      });
      await page.waitForFunction(
        () => document.querySelector(".world-viewport").getBoundingClientRect().height === 180,
      );
      await checkLobby(true);
      await page.evaluate(() => {
        delete window.visualViewport.height;
        window.visualViewport.dispatchEvent(new Event("resize"));
      });
      await page.waitForFunction(
        () => document.querySelector(".world-viewport").getBoundingClientRect().height > 180,
      );
      await page.getByRole("button", { name: "Simpan nama", exact: true }).click();
      await page.getByRole("heading", { name: "Nama pemain QA", exact: true }).waitFor();
      await page.getByText("Kredit dunia", { exact: true }).click();
      await checkLobby(true);
      await page.evaluate(() => {
        window.lobbyChannelCount = 12;
      });
      await page.getByRole("button", { name: "Segarkan", exact: true }).click();
      await page.getByRole("button", { name: /CHANNEL 012/ }).waitFor();
      await checkLobby(true);
      await page.getByRole("button", { name: "Keluar akun", exact: true }).click();
      assert(await page.evaluate(() => window.lobbySignOut));
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS lobby: six viewports, visible actions, three channels without scrolling, name editing, credits, long channel list and logout callback",
    );
  }
  for (const [width, height] of process.env.GUIDANCE_QA_ONLY || process.env.LOBBY_QA_ONLY
    ? []
    : sizes) {
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
    for (const button of ["Peta", "Jelajah", "Chat"]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await checkPanel(page, `${name} ${button}`);
      if (button === "Chat") {
        const chatSheet = page.locator(".game-chat-sheet");
        await chatSheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        const cb = await chatSheet.boundingBox();
        const dock = await page.locator("[data-world-dock]").boundingBox();
        assert(
          cb.x < width / 4 && Math.abs(cb.y + cb.height - dock.y + 8) < 4,
          `${name}: chat anchored above bottom dock, on left`,
        );
        const composer = await page.getByRole("textbox", { name: "Pesan chat" }).boundingBox();
        assert(composer.height <= 34, "thin chat composer");
        assert(cb.height <= 210, "chat remains a compact strip and text history");
        assert.equal(
          await chatSheet.evaluate((el) => getComputedStyle(el).backgroundColor),
          "rgba(0, 0, 0, 0)",
        );
        assert.equal(await page.locator(".game-chat-line").count(), 3);
        await page.screenshot({ path: `${output}/${name}-chat-slide.png` });
      }

      await closePanel(page);
    }
    await page.getByRole("button", { name: "Chat", exact: true }).click();
    await page.getByRole("tab", { name: "Pemain", exact: true }).click();
    await page.getByRole("button", { name: /Budi/ }).click();
    await checkPanel(page, `${name} nested player`);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("[data-game-panel]").count(), 1);
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
    await page.getByRole("button", { name: "Buka pengaturan" }).click();
    await page.getByRole("button", { name: "Pengaturan game" }).click();
    await checkPanel(page, `${name} settings`);
    await page.getByLabel("Ukuran UI").selectOption("comfortable");
    await checkPanel(page, `${name} comfortable settings`);
    await page.getByLabel("Ukuran UI").selectOption("compact");
    await closePanel(page);
    await page.getByRole("button", { name: "Buka pengaturan" }).click();
    await page.getByRole("button", { name: "Atur volume musik & efek" }).click();
    await checkPanel(page, `${name} audio`);
    await page.getByRole("button", { name: "Bisukan semua" }).click();
    await page.getByRole("button", { name: "Aktifkan suara" }).click();
    await closePanel(page);
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
      move.x += 25;
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [move] });
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
    const dockBounds = await page.locator("[data-world-dock]").boundingBox();
    const chatBounds = await page.locator("[data-chat-preview]").boundingBox();
    assert(dockBounds.width < width * 0.8, `${name}: compact navigation`);
    assert(chatBounds.y + chatBounds.height <= dockBounds.y, `${name}: chat above navigation`);
    if (touch) {
      const moveBounds = await page.locator("[data-mobile-move-zone]").boundingBox();
      assert(moveBounds.y + moveBounds.height <= chatBounds.y, `${name}: analog clear of chat`);
    }
    await page.screenshot({ path: `${output}/${name}-hud.png` });
    await context.close();
  }
  if (!process.env.LOBBY_QA_ONLY) {
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
      await historyPage.locator(".game-chat-line time").count(),
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
    await historyPage.getByText(": Pesan terbaru", { exact: true }).waitFor();
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
            Math.atan2(
              Math.sin(expected - arrow.rotation.y),
              Math.cos(expected - arrow.rotation.y),
            ),
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
    await preview.evaluate(() => {
      const s = structuredClone(window.core.getState().snapshot);
      s.active.status = "COMPLETED";
      window.core.setState({ snapshot: s });
    });
    await preview.waitForFunction(
      () => !window.guidanceScene.getObjectByName("quest-foot-guidance"),
    );
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
      window.net.getState().pushChat({
        id: "bubble-local",
        from: window.connectionId,
        name: "Kamu",
        text: "Halo! Ayo lanjut quest di toko.",
        at: Date.now(),
      });
      window.net.getState().pushChat({
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
    await preview.evaluate(() =>
      window.net
        .getState()
        .pushChat({
          id: "bubble-short",
          from: window.connectionId,
          name: "Kamu",
          text: "hai",
          at: Date.now(),
        }),
    );
    await preview.waitForFunction(() => {
      const bubble = window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`);
      const background = bubble?.getObjectByName("chat-bubble-background");
      if (!background || !background.parent.visible) return false;
      background.geometry.computeBoundingBox();
      return background.geometry.boundingBox.max.x < 1;
    });
    const shortSize = await preview.evaluate(() => {
      const bg = window.guidanceScene
        .getObjectByName(`chat-bubble-${window.connectionId}`)
        .getObjectByName("chat-bubble-background");
      const b = bg.geometry.boundingBox;
      return { width: b.max.x - b.min.x, height: b.max.y - b.min.y };
    });
    assert(shortSize.width < 1 && shortSize.height < 0.8, "short chat has a compact bubble");
    await preview.screenshot({ path: `${output}/player-chat-bubble-short.png` });
    await preview.evaluate(() =>
      window.net
        .getState()
        .pushChat({
          id: "bubble-long",
          from: window.connectionId,
          name: "Kamu",
          text: "Ayo kita lanjutkan petualangan di gudang dan cari petunjuk bersama!",
          at: Date.now(),
        }),
    );
    await preview.waitForFunction(() => {
      const bg = window.guidanceScene
        .getObjectByName(`chat-bubble-${window.connectionId}`)
        ?.getObjectByName("chat-bubble-background");
      if (!bg?.parent.visible) return false;
      bg.geometry.computeBoundingBox();
      return bg.geometry.boundingBox.max.y > 0.6;
    });
    const longSize = await preview.evaluate(() => {
      const b = window.guidanceScene
        .getObjectByName(`chat-bubble-${window.connectionId}`)
        .getObjectByName("chat-bubble-background").geometry.boundingBox;
      return { width: b.max.x - b.min.x, height: b.max.y - b.min.y };
    });
    assert(
      longSize.width > shortSize.width &&
        longSize.width < 2.7 &&
        longSize.height > shortSize.height,
      "bubble grows with wrapped text",
    );

    await preview.evaluate(() => {
      const actor = window.guidanceScene.getObjectByName("Player");
      actor.position.x += 1;
      const bubble = window.guidanceScene.getObjectByName(`chat-bubble-${window.connectionId}`);
      const world = bubble.getWorldPosition(bubble.position.clone());
      if (Math.abs(world.x - actor.position.x) > 0.001)
        throw new Error("bubble detached from player");
      window.net.getState().pushChat({
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
      await preview.evaluate(() =>
        window.net.getState().chat.some((m) => m.id === "bubble-replace"),
      ),
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
  }
} finally {
  await browser.close();
  await server.close();
}
