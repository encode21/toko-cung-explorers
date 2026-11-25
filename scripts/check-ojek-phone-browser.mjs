// Real phone/HUD and ojek state machine, with a controlled transport and no live account.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const root = fileURLToPath(new URL("..", import.meta.url));
const qa = root + "/tests/fixtures/hud";
const output = process.env.QA_OUTPUT || "/tmp/tokocung-ojek-qa";
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
  server: { host: "127.0.0.1", port: 4267, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
try {
  for (const [width, height] of [
    [844, 390],
    [667, 375],
    [1280, 720],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4267" + (width === 1280 ? "?ojek-collision" : ""));
    await page.waitForFunction(() => window.ojek && window.warung);
    await page.evaluate(() => {
      const pickup = { id: "toko-cung", name: "Depan Toko Cung", x: 6, z: 12 };
      const dropoff = { id: "pasar-warga", name: "Pasar Cung", x: 104, z: 15.8 };
      window.qaOffer = () => ({
        id: 99,
        pickup,
        dropoff,
        distance: 100,
        fare: 15000,
        publicPayout: 9000,
        ownPayout: 18000,
        minSeconds: 9,
        acceptedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20000).toISOString(),
      });
      window.ojekServer = {
        motors: [
          { id: "bebek", name: "Skupi", price: 250000, fare_percent: 100 },
          { id: "matic", name: "PZX", price: 500000, fare_percent: 120 },
          { id: "touring", name: "Kawazaki ZX20", price: 1200000, fare_percent: 145 },
        ],
        spots: [pickup, dropoff],
        rides: [],
        ojek: {
          hasWarung: true,
          cash: 310065,
          savings: 0,
          motor: { id: "matic", name: "PZX", price: 500000, fare_percent: 120 },
          tripsThisHour: 21,
          tripsPerHourCap: 20,
          npcTripsPerHourCap: null,
          playerTripsThisHour: 0,
          offer: null,
          nextOfferAt: new Date().toISOString(),
          declinedStreak: 0,
          rating: 5,
          setoranPercent: 40,
          order: null,
          ride: null,
          job: null,
        },
      };
      window.ojekRequests = [];
      window.ojekTransport = async (request) => {
        window.ojekRequests.push(request.action);
        const s = window.ojekServer.ojek;
        if (request.action === "bid") s.offer = window.qaOffer();
        if (request.action === "accept") {
          s.order = s.offer;
          s.offer = null;
        }
        if (request.action === "decline_bid") {
          s.offer = null;
          s.declinedStreak++;
        }
        if (request.action === "complete") {
          s.cash += 9000;
          s.order = null;
          s.tripsThisHour++;
        }
        return structuredClone(window.ojekServer);
      };
      window.ojek.setState({ data: structuredClone(window.ojekServer) });
      window.warung.setState({
        data: {
          warung: {
            id: 1,
            name: "Warung Contoh",
            cash: 310065,
            stock: [],
            level: 1,
            totalSales: 150000,
            hiring: false,
            maxStock: 100,
            isOpen: true,
          },
          debts: [],
          debtHistory: [],
          journal: Array.from({ length: 16 }, (_, i) => ({
            id: i,
            type: "OJEK",
            itemId: null,
            qty: 1,
            amount: i % 2 ? -7000 : 9000,
            createdAt: new Date().toISOString(),
          })),
          rent: { daily: 10000, owedDays: 0, owed: 0 },
          events: [],
          catalog: [],
          levels: [],
        },
      });
      const pose = { x: 6, y: 0, z: 12, yaw: 0, speed: 0 };
      window.mobility.setState({
        vehicles: [
          {
            id: "qa-bike",
            model: "scooter",
            color: "#2f7d59",
            pose,
            revision: 1,
            mine: true,
            personal: true,
            occupants: [{ connectionId: window.connectionId, seat: 0, status: "active" }],
          },
        ],
      });
      window.renderedVehicles.set("qa-bike", pose);
      window.hud.getState().setSheet("phone");
    });
    const panel = page.locator(".game-phone-sheet");
    await panel.waitFor();
    const homeBounds = await panel.boundingBox();
    for (const app of (process.env.QA_DEALER_ONLY ? ["ojek"] : ["ojek", "cngbank", "notes", "cungchat"])) {
      await page.locator(`[data-phone-app="${app}"]`).click();
      await page.locator(`[data-phone-screen="${app}"]`).waitFor();
      const bounds = await panel.boundingBox();
      assert(
        Math.abs(bounds.width - homeBounds.width) < 2 && Math.abs(bounds.x - homeBounds.x) < 2,
        `${app}: same frame`,
      );
      assert(
        await panel.evaluate((el) =>
          [...el.querySelectorAll(".phone-app-body, .warung-panel-body, .ojek-panel")].every(
            (x) => x.scrollWidth <= x.clientWidth + 2,
          ),
        ),
        `${app}: no horizontal overflow`,
      );
      await page.screenshot({ path: `${output}/${width}-${app}.png` });
      if (app === "ojek") {
        await page.getByRole("button", {name:"Motor", exact:true}).click();
        const dealer = page.getByRole("region", {name:"Dealer Motor"});
        await dealer.waitFor();
        for (const name of ["Skupi", "PZX", "Kawazaki ZX20"]) {
          const img = dealer.getByAltText(`Model ${name} di game`);
          await img.scrollIntoViewIfNeeded();
          await img.evaluate(img => img.decode());
          assert(await img.evaluate(img=>img.naturalWidth===640), `${name}: actual model thumbnail loaded`);
        }
        assert.equal(await dealer.getByRole("button",{name:"Punyamu"}).count(),1);
        assert.equal(await dealer.getByRole("button",{name:"Terlewati"}).count(),1);
        assert.equal(await page.locator(".ojek-current-motor strong").textContent(),"PZX");
        assert(await dealer.evaluate(el=>el.scrollWidth<=el.clientWidth+2),"dealer fits phone");
        await page.locator(".ojek-app-scroll").evaluate(el=>el.scrollTop=0);
        await page.screenshot({path:`${output}/${width}-dealer.png`});
        await page.getByRole("button",{name:"Narik",exact:true}).click();
      }
      if (app === "cungchat") {
        await page.getByRole("button", { name: /Koko Cung/ }).click();
        await page.getByText("Sewa aman, sudah lunas.", { exact: false }).waitFor();
        await page.getByRole("button", { name: /Semua chat/ }).click();
      }
      await panel.locator("[data-game-close]").click();
      await page.locator("[data-phone-panel]").waitFor();
    }
    if (process.env.QA_DEALER_ONLY) { await page.close(); continue; }
    await page.locator('[data-phone-app="ojek"]').click();
    await page.getByRole("switch", { name: "ON BID" }).click();
    await page.evaluate(() => {
      window.hud.getState().setSheet(null);
      window.ojekTick();
    });
    await page.locator(".ojek-bid-floating").waitFor();
    assert.equal(await page.locator(".game-phone-sheet").count(), 0, "bid does not open the phone");
    await page.screenshot({ path: `${output}/${width}-bid.png` });
    await page.getByRole("button", { name: "Ambil bid", exact: true }).click();
    await page.waitForFunction(() => window.ojek.getState().data.ojek.order?.id === 99);
    assert.equal(await page.locator("[data-ojek-bid]").count(), 0);
    // A fallen passenger cannot start boarding; recovery permits the existing boarding delay.
    await page.evaluate(() => {
      window.ojek.setState({ passengerDownUntil: Date.now() + 1800 });
      window.ojekTick();
    });
    assert.equal(await page.evaluate(() => window.ojek.getState().boardingUntil), null);
    await page.evaluate(() => {
      window.ojek.setState({ passengerDownUntil: 0 });
      window.ojekTick();
    });
    assert(await page.evaluate(() => window.ojek.getState().boardingUntil > Date.now()));
    const boarding = await page.evaluate(async () => {
      const until = window.ojek.getState().boardingUntil;
      await window.ojekCommand("read");
      return until === window.ojek.getState().boardingUntil;
    });
    assert(boarding, "background polls preserve boarding progress");
    await page.evaluate(() => {
      window.ojek.setState({ boardingUntil: Date.now() - 1 });
      window.ojekTick();
    });
    assert.equal(await page.evaluate(() => window.ojek.getState().picked), 99);
    await page.evaluate(() => {
      const s = window.ojek.getState().data;
      s.ojek.order.acceptedAt = new Date(Date.now() - 30000).toISOString();
      window.renderedVehicles.set("qa-bike", { x: 104, y: 0, z: 15.8, yaw: 0, speed: 0 });
      window.ojekTick();
    });
    await page.waitForFunction(() => !window.ojek.getState().data.ojek.order);
    await page.waitForTimeout(5100);
    await page.evaluate(() => window.ojekTick());
    await page.locator(".ojek-bid-floating").waitFor();
    await page.evaluate(() => window.hud.getState().setSheet("ojek"));
    await page.getByRole("switch", { name: "ON BID" }).click();
    await page.waitForFunction(
      () => !window.ojek.getState().onBid && !window.ojek.getState().data.ojek.offer,
    );
    assert.equal(await page.evaluate(() => window.ojekServer.ojek.declinedStreak), 1);
    // A stale read must never resurrect an offer after acceptance.
    const fresh = await page.evaluate(async () => {
      window.ojekServer.ojek.offer = window.qaOffer();
      await window.ojekCommand("read");
      const transport = window.ojekTransport;
      let resolve;
      window.ojekTransport = (r) =>
        r.action === "read"
          ? new Promise((r) => {
              resolve = () =>
                r(
                  structuredClone({
                    ...window.ojekServer,
                    ojek: { ...window.ojekServer.ojek, offer: window.qaOffer(), order: null },
                  }),
                );
            })
          : transport(r);
      const stale = window.ojekCommand("read");
      await window.ojekCommand("accept", { orderId: 99 });
      resolve();
      await stale;
      window.ojekTransport = transport;
      return !!window.ojek.getState().data.ojek.order && !window.ojek.getState().data.ojek.offer;
    });
    assert(fresh, "late poll cannot overwrite accepted bid");
    if (width === 1280) {
      await page.evaluate(() => {
        window.hud.getState().setSheet(null);
        window.crashProbe.seed();
      });
      await page.waitForFunction(() => window.crashProbe?.ready(), { timeout: 30000 });
      await page.evaluate(() => window.crashProbe.drive());
      await page.waitForFunction(() => window.ojek.getState().passengerDownUntil > Date.now());
      await page.evaluate(() => window.crashProbe.stop());
      await page.waitForFunction(() => Math.abs(window.crashProbe.passenger()?.[0] ?? 0) > 1);
      assert.equal(
        await page.evaluate(() => window.ojek.getState().picked),
        null,
        "collision prevents immediate boarding",
      );
      await page.screenshot({ path: `${output}/passenger-fallen.png` });
      await page.waitForFunction(() => Math.abs(window.crashProbe.passenger()?.[0] ?? 99) < 0.01);
      assert(await page.evaluate(() => window.crashProbe.pedestrianHit()));
      await page.waitForFunction(() => Math.abs(window.crashProbe.pedestrian()?.[0] ?? 0) > 1);
      assert.equal(
        await page.evaluate(() => window.crashProbe.pedestrianHit()),
        false,
        "repeated hit ignored during recovery",
      );
      await page.screenshot({ path: `${output}/pedestrian-fallen.png` });
      await page.waitForFunction(() => Math.abs(window.crashProbe.pedestrian()?.[0] ?? 99) < 0.01);
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    process.env.QA_DEALER_ONLY ? "PASS: dealer names, ownership and actual-model thumbnails at three phone sizes" : "PASS phone apps at 3 sizes; bid accept/skip/OFF; closed-phone runtime; boarding recovery; late-response ordering; real vehicle/passenger collision and pedestrian recovery",
  );
} finally {
  await browser.close();
  await server.close();
}
