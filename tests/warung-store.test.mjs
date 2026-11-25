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
  makeOrder,
  orderFillable,
} from "../src/game/warung/model.ts";

const source = ts.createSourceFile(
  "store.ts",
  readFileSync(new URL("../src/game/warung/store.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const functions = new Set(["setQueue", "customerArrived", "leaveCustomer", "startOrder", "guardTarget", "callGuard", "isOwnWarung", "answerEvent", "customerTick"]);
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

function guardSetup({ refused = false, failed = false, pending = null } = {}) {
  let now = Date.now();
  class Clock extends Date { static now() { return now; } }
  const buyer = { id: "owner-buyer", name: "Sari", personality: "warga", arrivedAt: now - 4000, leavingAt: null, waitMs: 90000 };
  const next = { ...buyer, id: "guard-buyer", name: "Budi" };
  const order = [{ itemId: "mi", qty: 2 }];
  const stock = [{ itemId: "mi", qty: 3, price: 3600 }];
  const snapshot = { warung: { id: 1, stock }, event: null, catalog: [{ id: "mi", name: "Mi Instan", market: 3500 }],
    guardAssist: { active: true, limit: 5, remaining: 5, resetsAt: now + 100000 } };
  const useWarung = create(() => ({ data: snapshot, inside: { id: 1 }, customers: [buyer, next], order,
    busy: false, guardAction: null, nextCustomerAt: now + 100000, error: "" }));
  const useGame = create((set) => ({ toast: "Kabar lain", setToast: (toast) => set({ toast }) }));
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled, { exports, useWarung, useGame, Date: Clock,
    CUSTOMER_WALK_MS, PRICEY_REACTION, makeOrder, priceCheck, orderFillable, createId: () => "guard-request-id",
    warungCommand: async (action, args) => {
      calls.push({ action, args });
      if (pending) await pending;
      if (failed) return null;
      if (action === "event") return { ...snapshot, event: null, guardConfronted: true };
      const result = { ...snapshot, guardServed: { items: refused ? [] : args.items,
        refused: refused ? ["mi"] : [], pricey: refused, total: refused ? 0 : 3600 } };
      useWarung.setState({ data: result });
      return result;
    },
  });
  return { useWarung, useGame, calls, api: exports, order, buyer, next, advance: (ms) => { now += ms; } };
}

test("manual guard helps only the next buyer and leaves the owner's order and stock reservation intact", async () => {
  const s = guardSetup();
  await s.api.callGuard();
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].action, "guard_serve");
  assert.equal(s.calls[0].args.items[0].qty, 1, "two remaining units are reserved for the owner");
  assert.equal(s.useWarung.getState().order, s.order);
  assert.equal(s.useWarung.getState().customers[0], s.buyer);
  assert.ok(s.useWarung.getState().customers[1].leavingAt !== null);
  assert.equal(s.useWarung.getState().customers[1].leavingSlot, 1);
  await s.api.callGuard();
  assert.equal(s.calls.length, 1, "double-click is ignored while guard is busy");
});

test("guard price refusals stay on the buyer bubble and do not replace a toast", async () => {
  const s = guardSetup({ refused: true });
  await s.api.callGuard();
  const c = s.useWarung.getState().customers[1];
  assert.match(c.complaint, /Mi Instan kemahalan/);
  assert.equal(c.reaction, PRICEY_REACTION);
  assert.equal(s.useGame.getState().toast, "Kabar lain");
  s.useGame.getState().setToast("Gaji dibayar");
  assert.equal(s.useWarung.getState().customers[1].complaint, c.complaint);
});

test("guard rejects unavailable quota, story visitors, and stock reserved for the current order", async () => {
  for (const reason of ["quota", "story", "stock", "inactive", "no-order"]) {
    const s = guardSetup();
    const state = s.useWarung.getState();
    if (reason === "quota") state.data.guardAssist.remaining = 0;
    if (reason === "story") state.customers[1].eventId = 22;
    if (reason === "stock") state.data.warung.stock[0].qty = 2;
    if (reason === "inactive") state.data.guardAssist.active = false;
    if (reason === "no-order") state.order = null;
    await s.api.callGuard();
    assert.equal(s.calls.length, 0, reason);
    assert.equal(s.useWarung.getState().customers[1].leavingAt, null);
  }
});

test("a failed guard request keeps both buyers; a late response after exit cannot change the next room", async () => {
  const failed = guardSetup({ failed: true });
  await failed.api.callGuard();
  assert.equal(failed.useWarung.getState().guardAction, null);
  assert.equal(failed.useWarung.getState().customers[1].leavingAt, null);
  let resolve;
  const s = guardSetup({ pending: new Promise((r) => { resolve = r; }) });
  const request = s.api.callGuard();
  s.useWarung.setState({ inside: null, guardAction: null, customers: [] });
  resolve();
  await request;
  assert.equal(s.useWarung.getState().guardAction, null);
  assert.equal(s.useWarung.getState().customers.length, 0);
});

test("confrontation remains visible before the palak leaves and does not consume an order", async () => {
  const s = guardSetup();
  const palak = { ...s.buyer, id: "palak", eventId: 99, eventKind: "palak" };
  s.useWarung.setState({ customers: [palak], order: null,
    data: { ...s.useWarung.getState().data, event: { id: 99, kind: "palak", npc: "Kang Palak" } } });
  await s.api.answerEvent(99, "decline");
  assert.equal(s.useWarung.getState().guardAction.kind, "confront");
  assert.equal(s.useWarung.getState().customers[0].leavingAt, null);
  assert.match(s.useWarung.getState().customers[0].guardReply, /aku pergi/);
  s.useWarung.setState({ data: { ...s.useWarung.getState().data, event: null } });
  s.api.customerTick(s.useWarung.getState().data.warung.stock, true);
  assert.equal(s.useWarung.getState().customers[0].leavingAt, null);
  s.advance(5000);
  s.api.customerTick(s.useWarung.getState().data.warung.stock, true);
  assert.equal(s.useWarung.getState().guardAction, null);
  assert.ok(s.useWarung.getState().customers[0].leavingAt !== null);
});

test("retrying a failed guard request reuses its receipt instead of charging another quota", async () => {
  const s = guardSetup({ failed: true });
  await s.api.callGuard();
  await s.api.callGuard();
  assert.equal(s.calls.length, 2);
  assert.equal(s.calls[0].args.requestId, s.calls[1].args.requestId);
});
