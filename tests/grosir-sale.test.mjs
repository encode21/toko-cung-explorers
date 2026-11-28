import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Mirror of the server GrosirSale::cost; kulakanPrice is the real Agen formula.
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/game/warung/grosir-sale.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
const kulakanPrice = (item, agen) =>
  Math.floor((item.wholesale * (100 - (agen?.discountPercent ?? 0))) / 100);
vm.runInNewContext(compiled, { exports, require: () => ({ kulakanPrice }) });
const { grosirLineCost, grosirUnitPrice } = exports;

const item = { id: "mi", wholesale: 2500 };
const sale = (used) => ({
  agen: null,
  grosirSale: {
    active: true,
    discountPercent: 10,
    flash: [{ itemId: "mi", discountPercent: 35, quota: 10, used }],
  },
});

test("flash price up to the quota left, sale price after, base price off-sale", () => {
  assert.equal(grosirLineCost(item, 12, sale(0)), 1625 * 10 + 2250 * 2);
  assert.equal(grosirLineCost(item, 3, sale(9)), 1625 + 2250 * 2);
  assert.equal(grosirLineCost({ id: "teh", wholesale: 2500 }, 2, sale(0)), 4500);
  assert.equal(
    grosirLineCost(item, 2, { agen: null, grosirSale: { active: false, flash: [] } }),
    5000,
  );
  assert.deepEqual(
    { price: grosirUnitPrice(item, sale(10)).price, was: grosirUnitPrice(item, sale(10)).was },
    { price: 2250, was: 2500 },
  );
});
