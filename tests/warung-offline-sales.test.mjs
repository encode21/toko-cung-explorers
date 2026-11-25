import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";

const source = ts.createSourceFile(
  "store.ts",
  readFileSync(new URL("../src/game/warung/store.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const fn = source.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "receiveOfflineSales",
);
const compiled = ts.transpileModule(fn.getText(source), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function setup() {
  const useWarung = create(() => ({ payday: null, data: { warung: { cash: 50000 } } }));
  const exports = {};
  vm.runInNewContext(compiled, { exports, useWarung });
  return { useWarung, receive: exports.receiveOfflineSales };
}
const receipt = (extra = {}) => ({
  catalog: [
    { id: "gula", name: "Gula" },
    { id: "susu", name: "Susu" },
  ],
  settled: {
    staffed: true,
    minutes: 2,
    customers: 3,
    revenue: 12000,
    items: { gula: 2, susu: 1 },
    ...extra,
  },
});

test("returning players see exact employee sales even after a short absence", () => {
  const s = setup();
  assert.equal(s.receive(receipt(), true), true);
  assert.equal(s.useWarung.getState().payday.revenue, 12000);
  assert.equal(s.useWarung.getState().payday.pieces, 3);
  assert.equal(s.useWarung.getState().payday.items, "Gula ×2, Susu ×1");
  assert.equal(
    s.useWarung.getState().data.warung.cash,
    50000,
    "displaying a receipt never credits cash twice",
  );
});
test("no employee or no sale means no offline-sales card", () => {
  const s = setup();
  assert.equal(s.receive(receipt({ staffed: false, minutes: 60 }), true), false);
  assert.equal(s.receive(receipt({ staffed: undefined, minutes: 60 }), true), false);
  assert.equal(s.receive(receipt({ revenue: 0, items: {} }), true), false);
  assert.equal(s.useWarung.getState().payday, null);
});
test("closing the summary is not undone by routine polls", () => {
  const s = setup();
  s.receive(receipt({ minutes: 30 }));
  s.useWarung.setState({ payday: null });
  assert.equal(s.receive(receipt({ minutes: 1 })), false);
  assert.equal(s.receive({ catalog: [], settled: null }, true), false);
  assert.equal(s.useWarung.getState().payday, null);
});
