import assert from "node:assert/strict";
import test from "node:test";
import {
  displayUnits,
  MERCHANDISE_SLOTS,
  merchandiseParts,
  merchandiseShape,
  merchandiseSignature,
} from "../src/game/warung/merchandise.ts";

const item = (id, name, color = "#d6b750") => ({
  id,
  name,
  color,
  wholesale: 1000,
  market: 1200,
  weight: 1,
  level: 1,
});
const rice = item("beras", "Beras 5 kg");
const oil = item("minyak", "Minyak goreng");
const catalog = new Map([rice, oil].map((product) => [product.id, product]));
const stock = (itemId, qty) => ({ itemId, qty, price: 1200 });

test("empty or invalid quantities never put groceries on the shelves", () => {
  for (const qty of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(displayUnits(qty, 20), 0);
    assert.deepEqual(merchandiseParts([stock("beras", qty)], catalog, 20), []);
  }
  assert.deepEqual(merchandiseParts([stock("unknown-sku", 10)], catalog, 20), []);
});

test("selling out one SKU leaves the next SKU on the same shelf", () => {
  const full = merchandiseParts([stock("beras", 1), stock("minyak", 1)], catalog, 20);
  const depleted = merchandiseParts([stock("beras", 0), stock("minyak", 1)], catalog, 20);
  assert.ok(depleted.length > 0);
  assert.deepEqual(full.slice(-depleted.length), depleted);
  assert.match(
    merchandiseSignature([stock("beras", 0), stock("minyak", 1)], 20),
    /^beras:0\|minyak:/,
  );
});

test("numeric catalog SKUs retain recognizable product silhouettes", () => {
  const slot = MERCHANDISE_SLOTS[0];
  const pairs = [
    [item("air-mineral", "Air mineral"), item("p123-dus", "Aqua 600 ml")],
    [item("minyak", "Minyak goreng"), item("p456-dus", "Minyak goreng 1 liter")],
    [item("telur", "Telur"), item("p789-pack", "Telur ayam 6 butir")],
    [item("mie", "Mie instan"), item("p012-dus", "Indomie goreng")],
  ];
  for (const [legacy, numeric] of pairs) {
    assert.deepEqual(
      merchandiseShape(numeric, slot, slot.x),
      merchandiseShape(legacy, slot, slot.x),
    );
  }
});

test("display counts never exceed real quantity and geometry stays bounded", () => {
  for (const qty of [1, 2, 4, 10, 100, 1000000]) {
    assert.ok(displayUnits(qty, 20) <= qty);
    assert.ok(displayUnits(qty, 20) <= 5);
  }
  const products = Array.from({ length: 100 }, (_, i) => item(`eggs-${i}`, "Telur"));
  const largeCatalog = new Map(products.map((product) => [product.id, product]));
  const geometry = merchandiseParts(
    products.map((product) => stock(product.id, 1000000)),
    largeCatalog,
    20,
  );
  assert.ok(geometry.length <= MERCHANDISE_SLOTS.length * 5 * 7);
  assert.ok(geometry.every((part) => [...part.p, ...part.s].every(Number.isFinite)));
});
