import test from "node:test";
import assert from "node:assert/strict";
import { addNotice, inboxText, loadNotices, noticeLine, saveNotices } from "../src/game/warung/notices.ts";

const catalog = [
  { id: "mi-instan", name: "Indomie" },
  { id: "kopi-sachet", name: "Kopi" },
  { id: "gula", name: "Gula" },
  { id: "telur", name: "Telur" },
];

test("piled-up notices merge to one line per kind with readable totals", () => {
  let list = [];
  list = addNotice(list, { kind: "sale", count: 1, items: { "mi-instan": 2 }, amount: 7000 });
  list = addNotice(list, { kind: "restock", count: 1, items: { gula: 2 }, amount: -58000 });
  list = addNotice(list, { kind: "sale", count: 1, items: { "mi-instan": 2, "kopi-sachet": 2 }, amount: 14000 });
  list = addNotice(list, { kind: "debt", count: 1, items: {}, amount: 5000, who: "Pak Sabar" });
  list = addNotice(list, { kind: "debt", count: 1, items: {}, amount: 3000, who: "Bu Tini" });
  assert.deepEqual(list.map((n) => n.kind), ["sale", "restock", "debt"]);
  assert.equal(noticeLine(list[0], catalog), "Terjual 6 barang · Indomie ×4, Kopi ×2 · +Rp21.000");
  assert.equal(noticeLine(list[1], catalog), "Kurir belanja · Gula ×2 · −Rp58.000");
  assert.equal(noticeLine(list[2], catalog), "2 utang lunas · +Rp8.000");
  const many = addNotice([], {
    kind: "sale",
    count: 1,
    items: { "mi-instan": 5, "kopi-sachet": 4, gula: 3, telur: 1 },
    amount: 1,
  });
  assert.match(noticeLine(many[0], catalog), /Gula ×3, \+1 lainnya/);
});

test("unacknowledged notices persist per warung across a reload; acknowledging removes them", () => {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };
  const list = addNotice([], { kind: "sale", count: 1, items: { gula: 1 }, amount: 4000 });
  saveNotices(7, list);
  assert.deepEqual(loadNotices(7), list);
  assert.deepEqual(loadNotices(8), [], "another warung/account sees nothing");
  saveNotices(7, []);
  assert.deepEqual(loadNotices(7), []);
  mem.set("world.warung.notices.7", "{broken");
  assert.deepEqual(loadNotices(7), []);
});

test("offline price refusals merge into one 'batal beli' line, biggest first", () => {
  let list = addNotice([], { kind: "pricey", count: 3, items: { gula: 3 }, amount: 0 });
  list = addNotice(list, { kind: "pricey", count: 2, items: { telur: 1, gula: 1 }, amount: 0 });
  assert.equal(list.length, 1);
  assert.equal(noticeLine(list[0], catalog), "5 pembeli batal beli · Gula, Telur kemahalan");
});


test("inbox copy removes emoji sequences without changing amounts, item counts or message history", () => {
  const chat = "🙏🏽  Diskon 5% · Rp13.500 + 2 × Rp500!  🇮🇩";
  assert.equal(inboxText(chat), "Diskon 5% · Rp13.500 + 2 × Rp500!");
  assert.equal(inboxText("Nota #12: 2 pcs, *lunas*. 1️⃣"), "Nota #12: 2 pcs, *lunas*.");
  assert.equal(inboxText("👩🏽‍🍳🇮🇩❤️"), "");
  assert.equal(noticeLine({ kind: "debt", count: 1, amount: 2000, who: "😄", items: {} }, catalog), "Pelanggan melunasi utang · +Rp2.000");
  assert.equal(noticeLine({ kind: "sale", count: 1, amount: 1000, items: { kopi: 1 } }, [{ id: "kopi", name: "Kopi ☕" }]), "Terjual 1 barang · Kopi ×1 · +Rp1.000");
});
