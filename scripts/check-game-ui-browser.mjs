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
  for (const [width, height] of sizes) {
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
    for (const button of ["Peta", "Jelajah", "Chat"]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await checkPanel(page, `${name} ${button}`);
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
      assert(Math.abs(await page.evaluate(() => window.zoom.getState().distance) - 1) < 0.001);
      await closePanel(page);
    }
    if (touch) {
      const bounds = await page.locator("[data-mobile-look]").boundingBox();
      const pinchSession = await context.newCDPSession(page);
      const a = { id: 10, x: Math.round(bounds.x + 50), y: Math.round(bounds.y + bounds.height / 2) };
      const b = { id: 11, x: a.x + 70, y: a.y };
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [a, b] });
      b.x += 60;
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [a, b] });
      await page.waitForFunction(() => window.zoom.getState().distance < 0.8);
      assert.equal(await page.evaluate(() => window.touchDrive.getState().lookX), 0, "pinch must not rotate");
      b.x -= 60;
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [a, b] });
      await page.waitForFunction(() => window.zoom.getState().distance > 0.9);
      await pinchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      for (let i = 0; i < 8; i++) {
        const plus = page.getByRole("button", { name: "Perbesar tampilan", exact: true });
        if (await plus.isEnabled()) await plus.click();
      }
      assert.equal(await page.evaluate(() => window.zoom.getState().distance), 0.5);
      for (let i = 0; i < 9; i++) {
        const minus = page.getByRole("button", { name: "Perkecil tampilan", exact: true });
        if (await minus.isEnabled()) await minus.click();
      }
      assert.equal(await page.evaluate(() => window.zoom.getState().distance), 1.6);
      const zoomBounds = await page.locator(".mmo-camera-zoom").boundingBox();
      const jumpBounds = await page.locator("[data-mobile-jump]").boundingBox();
      assert(zoomBounds.y + zoomBounds.height < jumpBounds.y, "zoom clear of jump");
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
  assert(Math.abs(markerY - 0.055) < 0.001, "guidance rests at the feet");
  await preview.screenshot({ path: `${output}/quest-ground-guidance.png` });
  await preview.evaluate(() => window.game.setState({ playerPos: [1, 0.83, 2] }));
  await preview.waitForFunction(
    () =>
      window.guidanceScene.getObjectByName("quest-foot-guidance").position.x === 1 &&
      Math.abs(
        window.guidanceScene.getObjectByName("quest-direction").rotation.y - Math.atan2(3, -5),
      ) < 0.001,
  );
  await preview.evaluate(() => window.game.setState({ playerPos: [4, 0.83, -3] }));
  await preview.waitForFunction(
    () => window.guidanceScene.getObjectByName("quest-direction").visible === false,
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
  const goldPixels = await preview.evaluate(async () => {
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
    let count = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] > 220 && data[i + 1] > 170 && data[i + 2] < 160) count++;
    return count;
  });
  assert(goldPixels > 120, `visible guidance over actual road paint: ${goldPixels} gold pixels`);
  await preview.screenshot({ path: `${output}/quest-guidance-crosswalk.png` });
  await preview.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS six landscape sizes: panels, nested profile/designer/quest, inventory, settings/audio, secret, dialogue, rewards, club/DJ, multitouch, orientation state preservation. Mock transport; not real-device or multiplayer certification.",
  );
} finally {
  await browser.close();
  await server.close();
}
