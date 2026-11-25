import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import {
  CUSTOMER_WALK_MS,
  PRICEY_REACTION,
  leaveSfx,
  priceCheck,
} from "../src/game/warung/model.ts";

const source = ts.createSourceFile(
  "store.ts",
  readFileSync(new URL("../src/game/warung/store.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const functions = new Set(["setQueue", "customerArrived", "leaveCustomer", "startOrder"]);
const compiled = ts.transpileModule(
  source.statements
    .filter((node) => ts.isFunctionDeclaration(node) && functions.has(node.name?.text))
    .map((node) => node.getText(source))
    .join("\n"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;

test("a fully refused order keeps its complaint on the leaving buyer despite another toast", () => {
  const buyer = {
    id: "buyer",
    name: "Bu Tini",
    arrivedAt: Date.now() - CUSTOMER_WALK_MS,
    leavingAt: null,
  };
  const next = { ...buyer, id: "next", name: "Pak Sabar" };
  const stock = [{ itemId: "gula", qty: 5, price: 1300 }];
  const useWarung = create(() => ({
    customers: [buyer, next],
    order: null,
    data: { catalog: [{ id: "gula", name: "Gula", market: 1000 }] },
  }));
  const useGame = create((set) => ({ toast: "Kabar lain", setToast: (toast) => set({ toast }) }));
  const walkouts = [];
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    useWarung,
    useGame,
    CUSTOMER_WALK_MS,
    PRICEY_REACTION,
    priceCheck,
    makeOrder: () => [{ itemId: "gula", qty: 1 }],
    reportWalkout: (...args) => {
      walkouts.push(args);
      return "⭐⭐";
    },
  });

  exports.startOrder(stock);
  const departed = useWarung.getState().customers[0];
  assert.match(departed.complaint, /Gula kemahalan, nggak jadi deh/);
  assert.ok(departed.leavingAt !== null);
  assert.equal(departed.reaction, "😒⭐⭐");
  assert.equal(leaveSfx(departed.reaction), null);
  assert.equal(useWarung.getState().order, null);
  assert.equal(useWarung.getState().customers[1], next);
  assert.deepEqual(walkouts, [["mahal", "Bu Tini"]]);
  assert.equal(useGame.getState().toast, "Kabar lain", "refusal does not replace the global toast");
  useGame.getState().setToast("Kabar baru");
  assert.equal(useWarung.getState().customers[0].complaint, departed.complaint);
});
