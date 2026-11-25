import test from "node:test";
import assert from "node:assert/strict";
import {
  buyChance,
  itemLines,
  warungOpenNow,
  makeOrder,
  orderFillable,
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
  assert.equal(buyChance(3500, 3500).toFixed(2), "0.60");
  assert.equal(buyChance(5600, 3500), 0);
  assert.equal(buyChance(1000, 3500), 1);
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
