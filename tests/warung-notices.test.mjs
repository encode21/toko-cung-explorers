import test from "node:test";
import assert from "node:assert/strict";
import { addNotice, loadNotices, noticeLine, saveNotices } from "../src/game/warung/notices.ts";

const catalog = [
  { id: "mi-instan", name: "Indomie" },
  { id: "kopi-sachet", name: "Kopi" },
  { id: "gula", name: "Gula" },
  { id: "telur", name: "Telur" },
];

test("piled-up notices merge to one line per kind and one OK clears them", () => {
  let list = [];
  list = addNotice(list, { kind: "sale", count: 1, items: { "mi-instan": 2 }, amount: 7000 });
  list = addNotice(list, { kind: "restock", count: 1, items: { gula: 2 }, amount: -58000 });
  list = addNotice(list, { kind: "sale", count: 1, items: { "mi-instan": 2, "kopi-sachet": 2 }, amount: 14000 });
  list = addNotice(list, { kind: "debt", count: 1, items: {}, amount: 5000, who: "Pak Sabar" });
  list = addNotice(list, { kind: "debt", count: 1, items: {}, amount: 3000, who: "Bu Tini" });
  assert.deepEqual(list.map((n) => n.kind), ["sale", "restock", "debt"]);
  assert.equal(noticeLine(list[0], catalog), "🛒 Terjual 6 barang · Indomie ×4, Kopi ×2 · +Rp21.000");
  assert.equal(noticeLine(list[1], catalog), "🛵 Kurir belanja · Gula ×2 · −Rp58.000");
  assert.equal(noticeLine(list[2], catalog), "💸 2 utang lunas · +Rp8.000");
  const many = addNotice([], {
    kind: "sale",
    count: 1,
    items: { "mi-instan": 5, "kopi-sachet": 4, gula: 3, telur: 1 },
    amount: 1,
  });
  assert.match(noticeLine(many[0], catalog), /Gula ×3, \+1 lainnya/);
});

test("unacknowledged notices persist per warung across a reload; OK removes them", () => {
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
