import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as warungModel from "../src/game/warung/model.ts";
let slots = [],
  cursor = 0,
  effects = [],
  timers = new Map(),
  timerId = 0;
const equalDeps = (a, b) =>
  a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const hooks = {
  useState(initial) {
    const i = cursor++;
    slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
    return [
      slots[i].value,
      (v) => {
        slots[i].value = typeof v === "function" ? v(slots[i].value) : v;
      },
    ];
  },
  useRef(initial) {
    const i = cursor++;
    return (slots[i] ??= { current: initial });
  },
  useId() {
    const i = cursor++;
    return (slots[i] ??= { value: "shelf-" + i }).value;
  },
  useMemo(fn, deps) {
    const i = cursor++;
    if (!equalDeps(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps };
    return slots[i].value;
  },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!equalDeps(slots[i]?.deps, deps)) {
      effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    }
  },
};
const item = (itemId, qty) => ({ itemId, qty, price: 100 });
let state,
  stock,
  calls = [],
  leaves = [],
  toasts = [],
  serveFeedback = [],
  walkouts = [],
  response = null;
const useWarung = (select) => select(state);
useWarung.getState = () => state;
useWarung.setState = (value) => {
  Object.assign(state, typeof value === "function" ? value(state) : value);
};
const game = { setToast: (text) => toasts.push(text) };
const element = (type, props) => ({ type, props });
let scrollListener;
const shelf = {
  clientWidth: 300,
  scrollWidth: 650,
  scrollLeft: 0,
  addEventListener(_, fn) {
    scrollListener = fn;
  },
  removeEventListener() {
    scrollListener = null;
  },
  scrollBy({ left }) {
    this.scrollLeft = Math.max(0, Math.min(350, this.scrollLeft + left));
    scrollListener?.();
  },
};
const dependencies = {
  react: hooks,
  "react/jsx-runtime": { jsx: element, jsxs: element, Fragment: "Fragment" },
  "@/game/warung/model": warungModel,
  "@/game/warung/store": {
    useWarung,
    leaveCustomer: (m) => {
      leaves.push(m);
      state.order = null;
    },
    registerMistake: () => {
      const customer = state.customers[0];
      customer.mistakes = (customer.mistakes ?? 0) + 1;
      if (customer.mistakes === 2) state.order = warungModel.shrinkOrder(state.order);
      return customer.mistakes;
    },
    GRUMBLE_WRONG_ITEM: ["Salah lagi."],
    ANGRY_WRONG_ITEM: ["Batal beli."],
    pickRandom: (lines) => lines[0],
    reportWalkout: (reason, npc) => {
      walkouts.push({ reason, npc });
      return warungModel.starText(warungModel.walkoutStars(reason));
    },
    recordServeSpeed: (speed, result) => serveFeedback.push({ speed, result }),
  },
  "@/state/game-store": { useGame: { getState: () => game } },
};
const source = await readFile(new URL("../src/ui/hud/WarungHud.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source + "\nexport { ServeGame };", {
  fileName: "WarungHud.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const module = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  "setInterval",
  "clearInterval",
  "ResizeObserver",
  "window",
  compiled,
)(
  (id) => dependencies[id] ?? new Proxy({}, { get: (_, name) => name }),
  module,
  module.exports,
  (fn) => {
    timers.set(++timerId, fn);
    return timerId;
  },
  (id) => timers.delete(id),
  class {
    observe() {}
    disconnect() {}
  },
  { matchMedia: () => ({ matches: true }) },
);
const { ServeGame } = module.exports;
function nodes(tree, result = []) {
  if (Array.isArray(tree)) tree.forEach((x) => nodes(x, result));
  else if (tree && typeof tree === "object") {
    result.push(tree);
    nodes(tree.props?.children, result);
  }
  return result;
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree && typeof tree === "object") return text(tree.props?.children);
  return typeof tree === "string" || typeof tree === "number" ? String(tree) : "";
}
const onServe = async (order, review) => {
  calls.push({ order, review });
  return response;
};
function render() {
  cursor = 0;
  effects = [];
  const tree = ServeGame({ stock, onServe });
  const shelfNode = nodes(tree).find((n) => n.props.className === "warung-product-shelf");
  if (shelfNode) shelfNode.props.ref.current = shelf;
  effects.forEach((fn) => fn());
  return tree;
}
function find(prefix) {
  const found = nodes(render()).find(
    (n) => n.type === "button" && (n.props["aria-label"] ?? text(n)).startsWith(prefix),
  );
  assert.ok(found, prefix);
  return found;
}
function click(prefix) {
  const node = find(prefix);
  assert.ok(!node.props.disabled, `enabled ${prefix}`);
  return node.props.onClick();
}
function reset() {
  slots.forEach((s) => s.cleanup?.());
  slots = [];
  timers.clear();
  calls = [];
  leaves = [];
  toasts = [];
  serveFeedback = [];
  walkouts = [];
  response = null;
  shelf.scrollLeft = 0;
  stock = [item("a", 5), item("b", 6), item("c", 4)];
  state = {
    order: [
      { itemId: "a", qty: 1 },
      { itemId: "b", qty: 2 },
    ],
    customers: [{ id: "customer-1", name: "Sari", leavingAt: null }],
    busy: false,
    inside: { id: 1 },
    data: {
      catalog: [
        { id: "a", name: "Teh" },
        { id: "b", name: "Mi" },
        { id: "c", name: "Kopi" },
      ],
    },
  };
  render();
}
function tick() {
  [...timers.values()].forEach((fn) => fn());
  render();
}
reset();
assert.equal(nodes(render()).filter((n) => n.props.className === "warung-pick-slot").length, 3);
assert.ok(find("Serahkan pesanan").props.disabled);
assert.ok(find("Barang sebelumnya").props.disabled);
click("Barang berikutnya");
assert.equal(shelf.scrollLeft, 240);
assert.ok(!find("Barang sebelumnya").props.disabled);
click("Ambil satu Kopi");
click("Ambil satu Kopi");
click("Serahkan pesanan");
assert.equal(calls.length, 0);
assert.match(text(render()), /yang ini loh 👉 Teh/);
assert.match(find("Ambil satu Kopi").props["aria-label"], /Di kantong 2/);
tick();
assert.ok(text(render()).includes("11 dtk"));
assert.equal(leaves.length, 0);
click("Kembalikan satu Kopi");
click("Kembalikan satu Kopi");
click("Ambil satu Teh");
click("Ambil satu Teh");
click("Ambil satu Mi");
click("Ambil satu Mi");
click("Serahkan pesanan");
assert.equal(calls.length, 0);
assert.match(text(render()), /Salah lagi/);
assert.deepEqual(state.order, [
  { itemId: "a", qty: 1 },
  { itemId: "b", qty: 1 },
]);
assert.match(find("Ambil satu Teh").props["aria-label"], /Di kantong 2/);
click("Kembalikan satu Teh");
click("Kembalikan satu Mi");
click("Ambil satu Kopi");
click("Serahkan pesanan");
assert.equal(calls.length, 0);
assert.deepEqual(walkouts, [{ reason: "wrong", npc: "Sari" }]);
assert.equal(leaves.length, 1);
assert.equal(serveFeedback.length, 0);

reset();
click("Ambil satu Teh");
click("Ambil satu Mi");
click("Serahkan pesanan");
assert.match(text(render()), /Jumlah Mi-nya belum pas/);
click("Ambil satu Mi");
click("Serahkan pesanan");
await Promise.resolve();
await Promise.resolve();
assert.equal(calls.length, 1);
assert.deepEqual(calls[0].order, state.order);
assert.deepEqual(calls[0].review, { speed: "fast", mistakes: 1, npc: "Sari" });
assert.equal(leaves.length, 0);
assert.equal(serveFeedback.length, 0);
assert.ok(text(render()).includes("belum berhasil diserahkan"));
assert.match(find("Ambil satu Teh").props["aria-label"], /Di kantong 1/);
tick();
assert.ok(text(render()).includes("11 dtk"));
response = { amount: 1500, destination: "kas" };
const submit = find("Serahkan pesanan").props.onClick;
submit();
submit();
await Promise.resolve();
await Promise.resolve();
assert.equal(calls.length, 2);
assert.equal(leaves.length, 1);
assert.deepEqual(serveFeedback, [{ speed: "fast", result: response }]);
assert.deepEqual(toasts, []);
reset();
for (let i = 0; i < 4; i++) click("Ambil satu Kopi");
assert.ok(find("Ambil satu Kopi").props.disabled);
assert.match(find("Ambil satu Kopi").props["aria-label"], /Di kantong 4/);
for (let i = 0; i < 12; i++) tick();
assert.equal(leaves.length, 1);
assert.deepEqual(walkouts, [{ reason: "timeout", npc: "Sari" }]);
assert.equal(calls.length, 0);
reset();
click("Ambil satu Teh");
click("Ambil satu Mi");
click("Ambil satu Mi");
stock = stock.filter((s) => s.itemId !== "a");
assert.ok(find("Ambil satu Teh").props.disabled);
click("Serahkan pesanan");
assert.equal(calls.length, 0);
assert.ok(text(render()).includes("Stok berubah"));
click("Kembalikan satu Teh");
assert.ok(!nodes(render()).some((n) => (n.props["aria-label"] ?? "").startsWith("Ambil satu Teh")));
reset();
state.busy = true;
assert.ok(find("Ambil satu Teh").props.disabled);
assert.ok(find("Serahkan pesanan").props.disabled);
console.log(
  "ServeGame checks passed: stocked decoys, overflow arrows, wrong product/quantity/extras, correction, unchanged timer, failed-save retry, success, stock cap/change, busy, expiry.",
);
