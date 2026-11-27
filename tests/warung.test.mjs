import test from "node:test";
import assert from "node:assert/strict";
import {
  buyChance,
  fairPrice,
  itemLines,
  warungOpenNow,
  makeOrder,
  orderFillable,
  orderTotal,
  priceCheck,
  receiptText,
  PRICEY_REACTION,
  saleToast,
  exitNotice,
  SOLD_OUT_REACTION,
  personaStage,
  ratingSpawnFactor,
  shrinkOrder,
  starText,
  leaveSfx,
  stockAlerts,
  walkoutStars,
  wrongItemHint,
  warungOrigin,
  warungSlotAt,
  WARUNG_SLOTS,
} from "../src/game/warung/model.ts";

test("every warung origin maps back to its own slot; city and mountain are outside", () => {
  for (let id = 1; id <= WARUNG_SLOTS * 2; id++) {
    const [x, , z] = warungOrigin(id);
    assert.equal(warungSlotAt(x + 4, z - 3), id % WARUNG_SLOTS);
  }
  assert.equal(warungSlotAt(0, 12), -1);
  assert.equal(warungSlotAt(1000, 100), -1);
  assert.equal(warungSlotAt(3000, 3000 + WARUNG_SLOTS * 80), -1);
  assert.equal(warungSlotAt(NaN, 3000), -1);
});

test("orders only ask for stocked items, distinct, within stock and 1-3 lines", () => {
  const stock = [
    { itemId: "a", qty: 1, price: 1 },
    { itemId: "b", qty: 0, price: 1 },
    { itemId: "c", qty: 9, price: 1 },
  ];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 200; i++) {
    const order = makeOrder(stock, rand);
    assert.ok(order.length >= 1 && order.length <= 2);
    assert.equal(new Set(order.map((l) => l.itemId)).size, order.length);
    for (const l of order) {
      const s = stock.find((x) => x.itemId === l.itemId);
      assert.ok(s.qty > 0 && l.qty >= 1 && l.qty <= Math.min(3, s.qty));
    }
  }
  assert.deepEqual(makeOrder([{ itemId: "b", qty: 0, price: 1 }]), []);
});

test("city warung lots match the server lot_count and their fronts sit outside the house", async () => {
  const { WARUNG_LOTS, lotFront } = await import("../src/game/warung/lots.ts");
  const { buildingBounds } = await import("../src/game/world/outdoor-layout.ts");
  assert.equal(WARUNG_LOTS.length, 25);
  for (const lot of WARUNG_LOTS) {
    const [x, z] = lotFront(lot);
    const b = buildingBounds(lot, false);
    const inside = x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
    assert.ok(!inside, `${lot.id} front ${x},${z} is inside the building`);
  }
});

test("stock alerts flag empty and low racks; buy chance matches the server formula", () => {
  const stock = [
    { itemId: "a", qty: 0, price: 1 },
    { itemId: "b", qty: 4, price: 1 },
    { itemId: "c", qty: 5, price: 1 },
  ];
  assert.deepEqual(stockAlerts(stock, 20), { empty: ["a"], low: ["b"] });
  assert.deepEqual(stockAlerts(stock, 5), { empty: ["a"], low: [] });
  assert.equal(buyChance(3500, 3500).toFixed(2), "1.00");
  assert.equal(buyChance(5600, 3500), 0);
  assert.equal(buyChance(1000, 3500), 1);
  assert.equal(buyChance(1100, 1000).toFixed(2), "0.80");
  assert.equal(buyChance(1200, 1000).toFixed(2), "0.40");
  assert.equal(buyChance(1300, 1000), 0, "Sepi = nobody buys from 1.3× market");
  assert.equal(buyChance(2000, 1000), 0);
});

test("wrong bag: NPC points at the first unmatched item, then shrinks the order", () => {
  const order = [
    { itemId: "mi", qty: 2 },
    { itemId: "teh", qty: 1 },
  ];
  assert.equal(wrongItemHint(order, { mi: 2, kopi: 1 }), "teh");
  assert.equal(wrongItemHint(order, { mi: 1, teh: 1 }), "mi");
  assert.equal(wrongItemHint(order, { mi: 2, teh: 1 }), null);
  assert.deepEqual(shrinkOrder(order), [
    { itemId: "mi", qty: 1 },
    { itemId: "teh", qty: 1 },
  ]);
  assert.deepEqual(
    shrinkOrder([
      { itemId: "mi", qty: 1 },
      { itemId: "teh", qty: 1 },
    ]),
    [{ itemId: "mi", qty: 1 }],
  );
  assert.deepEqual(shrinkOrder([{ itemId: "mi", qty: 1 }]), [{ itemId: "mi", qty: 1 }]);
});

test("walkout stars match the server and a low rating slows walk-ins", () => {
  assert.equal(walkoutStars("wrong"), 1);
  assert.equal(walkoutStars("empty"), 2);
  assert.equal(walkoutStars("timeout"), 2);
  assert.equal(starText(walkoutStars("wrong")), "⭐");
  assert.equal(ratingSpawnFactor(null), 1);
  assert.equal(ratingSpawnFactor(4.6), 1);
  assert.ok(ratingSpawnFactor(2.5) > ratingSpawnFactor(3.5));
});

test("a regular's life chapter follows the warung's total jualan, same rule as the server", () => {
  const p = {
    stages: [
      { from: 0, trait: "Mahasiswi" },
      { from: 300_000, trait: "Lagi skripsi" },
      { from: 1_000_000, trait: "Baru wisuda" },
    ],
  };
  assert.equal(personaStage(p, 0).trait, "Mahasiswi");
  assert.equal(personaStage(p, 299_999).trait, "Mahasiswi");
  assert.equal(personaStage(p, 300_000).trait, "Lagi skripsi");
  assert.equal(personaStage(p, 5_000_000).trait, "Baru wisuda");
});

test("NPC history merges older pages and replayed responses without duplicating or reordering choices", async () => {
  const { mergeNpcMessages } = await import("../src/game/warung/model.ts");
  const m = (id, text) => ({ id, from: "me", text, at: "2026-11-25T08:00:00Z" });
  const current = [m(3, "Pilihan saya"), m(4, "Balasan")];
  const older = mergeNpcMessages(current, [m(1, "Awal"), m(2, "Sapaan"), m(3, "Pilihan saya")]);
  assert.deepEqual(older.map((x) => x.id), [1, 2, 3, 4]);
  assert.deepEqual(mergeNpcMessages(older, current), older);
  assert.equal(older[2].text, "Pilihan saya");
});

test("leave SFX follows served vs wrong, not speed or stars", () => {
  assert.equal(leaveSfx("🤩⭐⭐⭐⭐⭐"), "cash");
  assert.equal(leaveSfx("😊⭐⭐⭐⭐"), "cash");
  assert.equal(leaveSfx("😅⭐⭐"), "cash"); // correct but slow
  assert.equal(leaveSfx("😅"), "cash");
  assert.equal(leaveSfx(`😡${starText(walkoutStars("wrong"))}`), "angry");
  assert.equal(leaveSfx("😞⭐⭐"), "angry");
});

test("staff notices name catalog items and keep unknown ids", () => {
  const catalog = [{ id: "mi-instan", name: "Indomie" }, { id: "gula", name: "Gula 1kg" }];
  assert.equal(
    itemLines([{ itemId: "mi-instan", qty: 2 }, { itemId: "gula", qty: 1 }], catalog),
    "Indomie ×2, Gula 1kg ×1",
  );
  assert.equal(itemLines([{ itemId: "baru", qty: 3 }], catalog), "baru ×3");
});

test("24 jam is open every hour incl. midnight; closed hours and oversleeping are closed", () => {
  const always = { openHour: 6, closeHour: 6, lateUntil: null };
  for (let h = 0; h < 24; h++) assert.equal(warungOpenNow(always, h), true, `24 jam at ${h}`);
  const night = { openHour: 22, closeHour: 2, lateUntil: null };
  assert.equal(warungOpenNow(night, 23), true);
  assert.equal(warungOpenNow(night, 0), true);
  assert.equal(warungOpenNow(night, 2), false);
  const day = { openHour: 6, closeHour: 22, lateUntil: null };
  assert.equal(warungOpenNow(day, 21), true);
  assert.equal(warungOpenNow(day, 22), false);
  const now = Date.parse("2026-11-25T10:00:00Z");
  const asleep = { ...day, lateUntil: "2026-11-25T10:05:00Z" };
  assert.equal(warungOpenNow(asleep, 9, now), false);
  assert.equal(warungOpenNow(asleep, 9, now + 10 * 60_000), true);
});

test("orders skip sold-out items, are empty when racks are empty, and stop being fillable once stock runs out", () => {
  const stock = [
    { itemId: "teh-gelas", qty: 0, price: 1000 },
    { itemId: "kopi-sachet", qty: 0, price: 1000 },
    { itemId: "mi-instan", qty: 2, price: 3500 },
  ];
  for (let i = 0; i < 50; i++) {
    const order = makeOrder(stock);
    assert.ok(order.length > 0);
    assert.ok(order.every((l) => l.itemId === "mi-instan" && l.qty <= 2));
    assert.equal(orderFillable(order, stock), true);
  }
  const soldOut = stock.map((s) => ({ ...s, qty: 0 }));
  assert.deepEqual(makeOrder(soldOut), []);
  assert.equal(orderFillable([], stock), false, "an empty order is never served");
  assert.equal(orderFillable([{ itemId: "mi-instan", qty: 1 }], soldOut), false, "ran out mid-queue");
});

test("a sold-out exit is silent (no tetot); real walkouts still sound angry", () => {
  assert.equal(leaveSfx(SOLD_OUT_REACTION), null);
  assert.equal(leaveSfx("😞"), "angry");
  assert.equal(leaveSfx("😊"), "cash");
});

test("away sales: first poll with a sale toasts at once, later ones merge into one toast per minute", () => {
  const t0 = 1_000_000;
  // Page just loaded (lastAt 0): the first penjaga sale shows immediately.
  let r = saleToast(null, { revenue: 7000, items: { "mi-instan": 2 } }, t0, 0, false);
  assert.deepEqual(r.flush, { items: { "mi-instan": 2 }, revenue: 7000 });
  // 30 s later: buffered, not lost.
  r = saleToast(null, { revenue: 3000, items: { "kopi-sachet": 1 } }, t0 + 30_000, t0, false);
  assert.equal(r.flush, null);
  r = saleToast(r.buf, { revenue: 3500, items: { "mi-instan": 1 } }, t0 + 45_000, t0, false);
  assert.equal(r.flush, null);
  // A poll after the minute with no new sale still flushes the merged toast.
  r = saleToast(r.buf, null, t0 + 61_000, t0, false);
  assert.deepEqual(r.flush, { items: { "kopi-sachet": 1, "mi-instan": 1 }, revenue: 6500 });
  // A kurir notice holds it for the next poll.
  r = saleToast(null, { revenue: 1000, items: { kerupuk: 2 } }, t0 + 200_000, t0, true);
  assert.equal(r.flush, null);
  assert.equal(r.buf.revenue, 1000);
  assert.equal(saleToast(null, { revenue: 0, items: {} }, t0 + 200_000, t0, false).flush, null);
});

test("leaving the warung says whether it keeps selling", () => {
  assert.match(exitNotice(false, true), /jualan jalan terus/);
  assert.match(exitNotice(true, false), /Tanpa penjaga, warung tidak jualan/);
  assert.doesNotMatch(exitNotice(true, null), /penjaga/i, "staff off: old rules, no hint");
});

test("order total uses the warung's own prices; overpriced lines follow buyChance like offline sales", () => {
  const catalog = [
    { id: "mi-instan", name: "Mi Instan", market: 3500 },
    { id: "teh-gelas", name: "Teh Gelas", market: 1500 },
  ];
  const stock = [
    { itemId: "mi-instan", qty: 9, price: 3000 },
    { itemId: "teh-gelas", qty: 9, price: 1650 },
  ];
  const order = [
    { itemId: "mi-instan", qty: 2 },
    { itemId: "teh-gelas", qty: 1 },
  ];
  assert.equal(orderTotal(order, stock), 7650);
  const chance = buyChance(1650, 1500); // 1.1× market → 0.8
  const refused = priceCheck(order, stock, catalog, () => chance + 0.01);
  assert.deepEqual(refused.order, [{ itemId: "mi-instan", qty: 2 }]);
  assert.deepEqual(refused.refused, ["teh-gelas"]);
  assert.equal(refused.pricey, true);
  const bought = priceCheck(order, stock, catalog, () => chance - 0.01);
  assert.equal(bought.order.length, 2);
  assert.equal(bought.pricey, true);
  const fair = priceCheck([{ itemId: "mi-instan", qty: 1 }], stock, catalog, () => 0.99);
  assert.deepEqual([fair.order.length, fair.pricey], [1, false]);
  assert.equal(leaveSfx(PRICEY_REACTION + "⭐⭐"), null, "no tetot for a price walkout");
});

test("serve toast reads the server receipt, incl. combo and kasbon cut", () => {
  const r = { lines: [], base: 3000, tip: 300, fastTip: 600, combo: 2, total: 3900, kasbon: 0 };
  assert.equal(receiptText(r), "Rp3.000 + tip Rp300 + cekatan combo ×3 Rp600 = +Rp3.900 masuk Kas");
  assert.match(receiptText({ ...r, tip: 0, fastTip: 0, combo: 0, total: 3000, kasbon: 300 }), /otomatis bayar kasbon/);
});

test("five percent tolerance includes Rp100 extra for noodles, without complaints or refusals", () => {
  for (const price of [3500, 3600, 3675]) {
    assert.equal(fairPrice(price, 3500), true);
    assert.equal(buyChance(price, 3500), 1);
    const result = priceCheck([{ itemId: "mi", qty: 2 }], [{ itemId: "mi", qty: 2, price }],
      [{ id: "mi", market: 3500 }], () => 0.99999);
    assert.deepEqual(result, { order: [{ itemId: "mi", qty: 2 }], refused: [], pricey: false });
  }
  assert.equal(fairPrice(3676, 3500), false);
  assert(buyChance(3676, 3500) < 1);
});

test("disaster keeps the shop closed until repaired without changing opening hours", () => {
  const shop = { openHour: 6, closeHour: 22, damage: { status: "damaged" } };
  const now = Date.parse("2026-11-27T10:00:00+07:00");
  assert.equal(warungOpenNow(shop, 10, now), false);
  assert.equal(warungOpenNow({ ...shop, damage: null }, 10, now), true);
  const repairing = {
    ...shop,
    damage: { status: "repairing" },
    renovation: { until: new Date(now + 24 * 60_000).toISOString() },
  };
  assert.equal(warungOpenNow(repairing, 10, now), false);
  assert.equal(warungOpenNow(repairing, 10, now + 25 * 60_000), true);
});
