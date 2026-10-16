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
const output = "/tmp/toko-dialogue-qa";
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
  server: { host: "127.0.0.1", port: 4257, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--enable-unsafe-swiftshader"],
  });
  for (const [width, height] of [
    [844, 390],
    [1024, 768],
    [1280, 720],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4257");
    await page.waitForFunction(() => !!window.dialogue && !!window.profile);
    await page.evaluate(async (root) => {
      const { DUNGEON_DIALOGUES } = await import(`/@fs${root}/src/game/dungeon/dialogue.ts`);
      const profile = window.profile.getState().profile;
      window.profile.setState({
        profile: { ...profile, displayName: "Saddam Sean" },
        appearanceDraft: { ...profile.avatar, outfitColor: "#29b6a5" },
      });
      window.dialogue.getState().open(DUNGEON_DIALOGUES.briefing);
    }, root);
    const panel = page.locator(".npc-dialogue-layout");
    await panel.getByRole("heading", { name: "Rama", exact: true }).waitFor();
    const checkSide = async (side) => {
      assert.equal(await panel.getAttribute("data-dialogue-side"), side);
      const portrait = await panel.locator(".npc-dialogue-portrait").boundingBox();
      const card = await panel.locator(".npc-dialogue-card").boundingBox();
      assert(
        side === "right"
          ? portrait.x >= card.x + card.width
          : portrait.x + portrait.width <= card.x,
      );
      for (const box of [portrait, card])
        assert(
          box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y + box.height <= height + 1,
          JSON.stringify(box),
        );
      const close = await panel.locator("[data-game-close]").boundingBox();
      assert(close.width >= 44 && close.height >= 44);
      assert.equal(await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
    };
    await checkSide("left");
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${output}/${width}-npc.png` });
    await panel.getByRole("button", { name: "Lanjut", exact: true }).click();
    await panel.getByRole("heading", { name: "Saddam Sean", exact: true }).waitFor();
    await panel.getByRole("img", { name: "Potret Saddam Sean", exact: true }).waitFor();
    assert.equal(await panel.getByText("Kamu", { exact: true }).count(), 0);
    await panel.getByText("Aku di sini untuk misi. Mulai dari mana?", { exact: true }).waitFor();
    await checkSide("right");
    await page.waitForTimeout(1100);
    assert.equal(await panel.locator("canvas").count(), 1);
    await page.screenshot({ path: `${output}/${width}-player.png` });
    await page.evaluate(() => window.dialogue.getState().setSubmitting(true));
    assert(await panel.getByRole("button", { name: "Menyimpan…", exact: true }).isDisabled());
    await page.keyboard.press("Escape");
    assert.equal(await panel.count(), 1);
    await page.evaluate(() => window.dialogue.getState().setError("Coba lagi."));
    await panel.getByRole("button", { name: "Lanjut", exact: true }).click();
    await panel.getByRole("heading", { name: "Rama", exact: true }).waitFor();
    await checkSide("left");
    await page.evaluate(() => {
      const p = window.profile.getState().profile;
      window.profile.setState({
        profile: {
          ...p,
          displayName: "Penjelajah dengan Nama yang Sangat Panjang Sekali",
          equippedCharacter: "koko-cung",
        },
      });
      window.dialogue.setState({ lineIndex: 1 });
    });
    await panel
      .getByRole("heading", {
        name: "Penjelajah dengan Nama yang Sangat Panjang Sekali",
        exact: true,
      })
      .waitFor();
    await checkSide("right");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${output}/${width}-long-name-character.png` });
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}x${height}: NPC left → signed-in player right → NPC left, long name, equipped character, busy/Escape guards`,
    );
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
