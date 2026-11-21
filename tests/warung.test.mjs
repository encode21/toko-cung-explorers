import test from "node:test";
import assert from "node:assert/strict";
import { makeOrder, warungOrigin, warungSlotAt, WARUNG_SLOTS } from "../src/game/warung/model.ts";

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
