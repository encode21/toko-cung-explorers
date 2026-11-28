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
const output = process.env.HUD_QA_OUTPUT || "/tmp/toko-town-guidance-qa";
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: qa,
  publicDir: root + "/public",
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-key"),
  },
  plugins: [
    {
      name: "daily-transport",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "./api.functions" && importer?.endsWith("/services/world/client.ts"))
          return root + "/tests/fixtures/missions/api.ts";
      },
    },
    react(),
    tailwind(),
  ],
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
  server: { host: "127.0.0.1", port: 4249, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });

const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const event = {
      host: "walikota",
      name: "Pak Wali Kota",
      scene: "city",
      at: [26.8, 12.6],
      event: {
        key: "pasar_murah",
        title: "Bantu Pasar Murah",
        verb: "Antar sembako",
        intro: "Ambil sembako dari truk, bagikan ke tiga kios.",
        done: "Terima kasih!",
        points: [
          [90, 9],
          [95, 4.8],
          [107, 4.8],
          [101, 9.2],
        ],
        reward: 18000,
      },
      status: "available",
      progress: [],
      restUntilDay: null,
    };
    const side = {
      ...structuredClone(event),
      host: "bu-sri",
      name: "Bu Sri",
      event: {
        ...event.event,
        key: "bersih",
        title: "Bantu Bu Sri",
        verb: "Rapikan kios",
        points: [[105, 6]],
      },
    };
    let kuli = null;
    window.townRequests = [];
    window.townTransport = async (operation, data) => {
      window.townRequests.push({ operation, ...data });
      if (operation === "events") {
        const current = data.host === "bu-sri" ? side : event;
        if (data.action === "accept") current.status = "active";
        if (data.action === "progress") current.progress.push(data.point);
        if (data.action === "claim") current.status = "done";
        if (data.action === "cancel") {
          current.status = "available";
          current.progress = [];
        }
        const response = {
          events: structuredClone([event, side]),
          kas: { cash: 50000 },
          gameDay: 1,
        };
        if (data.action === "read" && window.delayTownRead) {
          window.delayTownRead = false;
          return new Promise((resolve) => {
            window.releaseTownRead = () => resolve(response);
          });
        }
        return response;
      }
      if (data.action === "kuli_start") kuli = { delivered: 0, endsAt: Date.now() + 120000 };
      if (data.action === "kuli_deliver" && ++kuli.delivered === 4) kuli = null;
      if (data.action === "kuli_cancel") kuli = null;
      return {
        jobs: { basket: {}, fishForSale: [], kuli: kuli && { ...kuli } },
        kas: { cash: 50000 },
        paid: 2000,
      };
    };
  });
  await page.goto("http://127.0.0.1:4249/?guidance&market&weather=storm", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => window.guidanceScene && window.townEvents?.getState().events.length,
  );
  await page.evaluate(async () => {
    window.core.setState({ snapshot: { ...window.core.getState().snapshot, active: null } });
    window.daily.setState({ data: null, tracked: null });
    window.game.setState({
      playerPos: [95, 0.83, 7],
      nearby: null,
      waypoint: "store",
      guidanceMuted: true,
    });
    await window.acceptTownEvent("walikota");
  });
  const target = async (at, town = true) => {
    await page.waitForFunction(
      ({ at, town }) => {
        const scene = window.guidanceScene;
        const halo = scene.getObjectByName("quest-objective-halo");
        const marker = scene.getObjectByName(town ? "TownEventTarget" : "KuliTarget");
        return (
          halo &&
          marker &&
          Math.abs(halo.position.x - at[0]) < 0.01 &&
          Math.abs(halo.position.z - at[1]) < 0.01 &&
          !scene.getObjectByName(town ? "KuliTarget" : "TownEventTarget")
        );
      },
      { at, town },
    );
  };
  await target([90, 9]);
  assert.equal(await page.evaluate(() => window.game.getState().waypoint), null);
  await page.evaluate(() => window.game.setState({ playerPos: [90, 0.83, 9] }));
  await page.waitForFunction(() => window.contextAction()?.label === "Ambil sembako");
  await page.evaluate(() => window.performContextAction());
  await target([95, 4.8]);
  await page.evaluate(() => window.game.setState({ playerPos: [95, 0.83, 4.8] }));
  await page.waitForFunction(() => window.contextAction()?.label === "Antar sembako");
  await page.screenshot({ path: output + "/mayor-delivery.png" });
  await page.evaluate(() => window.startKuli());
  await target([90, 9], false);
  assert.deepEqual(await page.evaluate(() => window.townEvents.getState().events[0].progress), [0]);
  await page.evaluate(() => window.pickupKarung());
  await target([101, 4.6], false);
  await page.screenshot({ path: output + "/kuli-focused.png" });
  await page.evaluate(() => window.acceptTownEvent("bu-sri"));
  await target([105, 6]);
  const card = (id) => page.locator(`[data-activity-id="${id}"]`);
  await card("town:walikota").getByRole("button", { name: "Detail Bantu Pasar Murah" }).click();
  await card("town:walikota").getByRole("button", { name: "Lacak", exact: true }).click();
  await target([95, 4.8]);
  assert.equal(await page.evaluate(() => window.easyJobs.getState().kuli.carrying), true);
  await card("kuli").getByRole("button", { name: "Detail Kuli angkut pasar" }).click();
  await card("kuli").getByRole("button", { name: "Lacak", exact: true }).click();
  await target([101, 4.6], false);
  await page.setViewportSize({ width: 667, height: 375 });
  await page.screenshot({ path: output + "/task-cards-667.png" });
  await card("town:bu-sri").getByRole("button", { name: "Detail Bantu Bu Sri" }).click();
  await card("town:bu-sri").getByRole("button", { name: "Batalkan", exact: true }).click();
  await page.getByRole("button", { name: "Lanjutkan tugas", exact: true }).click();
  assert.equal(await card("town:bu-sri").count(), 1);
  await card("town:bu-sri").getByRole("button", { name: "Batalkan", exact: true }).click();
  await page.getByRole("button", { name: "Ya, batalkan", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-activity-id="town:bu-sri"]'));
  await target([101, 4.6], false);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.game.setState({ playerPos: [101, 0.83, 4.6] }));
  await page.waitForFunction(() => window.contextAction()?.label === "Taruh karung");
  for (let delivered = 0; delivered < 4; delivered++) {
    if (delivered) await page.evaluate(() => window.pickupKarung());
    await page.evaluate(() => window.dropKarung());
  }
  await target([95, 4.8]);
  assert.deepEqual(await page.evaluate(() => window.townEvents.getState().events[0].progress), [0]);
  for (const [point, at] of [
    [1, [95, 4.8]],
    [2, [107, 4.8]],
    [3, [101, 9.2]],
  ]) {
    if (point === 1)
      await page.evaluate(() => {
        window.delayTownRead = true;
        window.oldTownPoll = window.loadTownEvents();
      });
    await page.evaluate((at) => window.game.setState({ playerPos: [at[0], 0.83, at[1]] }), at);
    await page.waitForFunction(
      (point) => window.contextAction()?.id === `town:walikota:${point}`,
      point,
    );
    await page.evaluate(() => window.performContextAction());
    if (point === 1) {
      await target([107, 4.8]);
      await page.evaluate(async () => {
        window.releaseTownRead();
        await window.oldTownPoll;
      });
      await target([107, 4.8]);
    }
  }
  await target([26.8, 12.6]);
  await page.evaluate(() => window.claimTownEvent("walikota"));
  await page.waitForFunction(
    () =>
      !window.guidanceScene.getObjectByName("TownEventTarget") &&
      !window.guidanceScene.getObjectByName("quest-objective-halo"),
  );
  await page.evaluate(() => window.startKuli());
  await card("kuli").getByRole("button", { name: "Detail Kuli angkut pasar" }).click();
  await card("kuli").getByRole("button", { name: "Batalkan", exact: true }).click();
  await page.getByRole("button", { name: "Ya, batalkan", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-activity-id="kuli"]'));
  // The actual event meshes must exist independently of the guidance ring.
  await page.setViewportSize({ width: 844, height: 560 });
  await page.evaluate(() => {
    window.dungeon.setState({ tracked: false });
    window.game.setState({ playerPos: [95, 0.83, 7], nearby: null, guidanceMuted: false });
    window.guidanceCamera.position.set(98, 3.5, 11);
    window.guidanceCamera.lookAt(95, 0.6, 5);
    const event = structuredClone(window.townEvents.getState().events[0]);
    Object.assign(event, { status: "active", progress: [] });
    Object.assign(event.event, {
      key: "bersih_kota",
      title: "Jumat Bersih Kota",
      verb: "Pungut sampah",
      points: [
        [95, 5],
        [97, 4],
      ],
    });
    window.townEvents.setState({ events: [event] });
  });
  const objects = () =>
    page.evaluate(() =>
      window.guidanceScene.children.flatMap(function walk(node) {
        return [
          ...(node.name.startsWith("TownEventObject:") ? [node.name] : []),
          ...node.children.flatMap(walk),
        ];
      }),
    );
  await page.waitForFunction(() => !!window.guidanceScene.getObjectByName("TownEventTrash"));
  assert.equal((await objects()).length, 2);
  await page.screenshot({ path: output + "/event-trash.png" });
  await page.evaluate(async (root) => {
    const { mountFloodZone } = await import(`/@fs${root}src/game/weather/flood-surface.ts`);
    window.unmountEventFlood = mountFloodZone({ origin: [90, 0, 0], width: 20, from: -5, to: 15 });
  }, root);
  await page.waitForFunction(
    () => window.guidanceScene.getObjectByName("TownEventObject:walikota:0").position.y > 0.51,
  );
  await page.evaluate(() => window.unmountEventFlood());
  await page.evaluate(() => window.game.setState({ guidanceMuted: true }));
  await page.waitForFunction(() => !window.guidanceScene.getObjectByName("TownEventTarget"));
  assert.equal((await objects()).length, 2, "muting arrows keeps the physical rubbish");
  await page.evaluate(() =>
    window.townEvents.setState((s) => ({ events: s.events.map((e) => ({ ...e, progress: [0] })) })),
  );
  await page.waitForFunction(
    () => !window.guidanceScene.getObjectByName("TownEventObject:walikota:0"),
  );
  assert.equal((await objects()).length, 1);
  await page.evaluate(() => {
    window.sceneTime.setWorldTime("21:00");
    window.game.setState({ guidanceMuted: false });
    window.townEvents.setState((s) => ({
      events: s.events.map((e) => ({
        ...e,
        progress: [],
        event: {
          ...e.event,
          key: "ronda_malam",
          title: "Ronda Malam",
          verb: "Pukul kentongan",
          hours: [20, 4],
        },
      })),
    }));
  });
  await page.waitForFunction(() => !!window.guidanceScene.getObjectByName("TownEventKentongan"));
  assert.equal(
    await page.evaluate(() => !!window.guidanceScene.getObjectByName("TownEventTrash")),
    false,
  );
  await page.screenshot({ path: output + "/event-kentongan.png" });
  await page.evaluate(() => window.sceneTime.setWorldTime("12:00"));
  await page.waitForFunction(() => !window.guidanceScene.getObjectByName("TownEventKentongan"));
  await page.evaluate(() => window.sceneTime.setWorldTime("21:00"));
  await page.waitForFunction(() => !!window.guidanceScene.getObjectByName("TownEventKentongan"));
  await page.evaluate(() =>
    window.townEvents.setState((s) => ({
      events: s.events.map((e) => ({ ...e, progress: [0, 1] })),
    })),
  );
  await page.waitForFunction(() => !window.guidanceScene.getObjectByName("TownEventKentongan"));
  assert.equal((await objects()).length, 0);
  console.log(
    "PASS town objects: rubbish/kentongan meshes, flood visibility, opening hours, completed-point removal, muted guidance keeps props.",
  );
  await page.evaluate(() =>
    window.receiveOfflineSales(
      {
        catalog: [{ id: "gula", name: "Gula" }],
        settled: { staffed: true, minutes: 5, customers: 3, revenue: 12000, items: { gula: 4 } },
      },
      true,
    ),
  );
  const phone = page.locator('[data-side-action="phone"]');
  await phone.locator("[data-phone-inbox-dot]").waitFor();
  await phone.click();
  await page.locator(".phone-notification").click();
  const payday = page.getByRole("button", { name: /Penjualan karyawan selama kamu pergi/ });
  await payday.waitFor();
  assert.match(await payday.innerText(), /Rp12.000.*Kas usaha/);
  assert.match(await payday.innerText(), /Gula ×4/);
  await page.screenshot({ path: output + "/offline-sales.png" });
  await payday.click();
  await page.waitForFunction(
    () => window.hud.getState().sheet === "warung" && !window.warung.getState().payday,
  );
  await page.evaluate(() => {
    window.hud.getState().setSheet(null);
    window.townEvents.setState({ events: [] });
    window.dungeon.setState({
      tracked: true,
      data: {
        status: "AVAILABLE",
        instance: null,
        config: { entrance: [35, 0, 28], assets: { primaryColor: "#168b91" }, objectives: [] },
      },
    });
    window.game.setState({ playerPos: [35, 0.83, 28] });
  });
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.contextAction()?.id === "dungeon:entrance"), false);
  assert.deepEqual(
    await page.evaluate(() =>
      ["principal-dungeon", "EntryRing:Principal · Pilih misi", "quest-objective-halo"].map(
        (name) => !!window.guidanceScene.getObjectByName(name),
      ),
    ),
    [false, false, false],
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS town guidance: tracked cards, cancel, one mayor/kuli target, task before shopping, preserved progress, clear after report; readable employee sales receipt; retired Principal stays hidden.",
  );
} catch (error) {
  console.error(errors);
  const page = browser.contexts()[0]?.pages()[0];
  await page?.screenshot({ path: output + "/failure.png" });
  throw error;
} finally {
  await browser.close();
  await server.close();
}
