import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Execute only the local fixture transport. A controlled clock exercises delivery
// boundaries without a browser, real account, network, or slow countdown waits.
let now = Date.now();
class FixtureDate extends Date {
  static now() {
    return now;
  }
}
async function loadLocal(file, dependencies = {}) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "setTimeout", "Date", compiled)(
    (id) => {
      assert.ok(id in dependencies, `No live or unexpected dependency: ${id}`);
      return dependencies[id];
    },
    module,
    module.exports,
    (callback) => callback(),
    FixtureDate,
  );
  return module.exports;
}

const data = await loadLocal("tests/fixtures/warung/data.ts");
const placement = await loadLocal("src/game/warung/decor-placement.ts");
const { resetTransport, worldRequest } = await loadLocal("tests/fixtures/warung/client.ts", {
  "./data": data,
  "@/game/warung/decor-placement": placement,
});
const action = (action, payload = {}) => worldRequest("warung", { action, ...payload });
const stock = (snapshot, id) => snapshot.warung.stock.find((line) => line.itemId === id).qty;
const buy = (decorId, payload = {}) => action("decor_buy", { decorId, ...payload });
const apply = (decorId, payload = {}) => action("decor_apply", { decorId, ...payload });

resetTransport("decor");
let initial = await action("read");
assert.deepEqual(
  new Set(initial.decor.map((item) => item.slot)),
  new Set(["wall", "awning", "floor", "extra"]),
);
let current = await apply("wall-mint");
assert.equal(current.warung.style.wall, "wall-mint");
assert.equal(current.warung.cash, initial.warung.cash);
await assert.rejects(apply("awning-tosca"), /Beli dekorasi/);
await assert.rejects(buy("wall-bata"), /Lv\. 2/);
assert.equal((await action("read")).warung.cash, initial.warung.cash);

for (const [id, slot] of [
  ["wall-pink", "wall"],
  ["awning-tosca", "awning"],
  ["floor-catur", "floor"],
  ["tanaman", "extra"],
]) {
  const before = await action("read");
  const item = before.decor.find((item) => item.id === id);
  current = await buy(id);
  assert.equal(current.warung.cash, before.warung.cash - item.price);
  assert.ok(current.warung.style.owned.includes(id));
  assert.deepEqual(
    current.warung.style[slot === "extra" ? "extras" : slot],
    before.warung.style[slot === "extra" ? "extras" : slot],
    "Purchase does not implicitly equip",
  );
  current = await apply(id, slot === "extra" ? { on: true } : {});
  if (slot === "extra") assert.ok(current.warung.style.extras.includes(id));
  else assert.equal(current.warung.style[slot], id);
  const cash = current.warung.cash;
  assert.equal((await buy(id)).warung.cash, cash, "Owned items never charge twice");
}
current = await apply("poster", { on: false });
assert.ok(!current.warung.style.extras.includes("poster"));
assert.ok(current.warung.style.owned.includes("poster"));
await apply("poster", { on: true });
current = await apply("poster", { on: true });
assert.equal(current.warung.style.extras.filter((id) => id === "poster").length, 1);
await assert.rejects(apply("poster", { on: "false" }), /pasang atau lepas/);
current = await apply("wall-default");
assert.equal(current.warung.style.wall, "wall-default");

resetTransport("decor-low-cash");
initial = await action("read");
await assert.rejects(buy("wall-pink"), /Kas belum cukup/);
assert.deepEqual(await action("read"), initial, "Rejected purchase leaves all state untouched");
assert.equal((await apply("wall-mint")).warung.cash, 5000);

resetTransport("decor-retry");
initial = await action("read");
await assert.rejects(buy("wall-pink", { requestId: "decor-order-1" }), /belum dibeli/);
assert.deepEqual(await action("read"), initial, "Failed purchase is atomic");
current = await buy("wall-pink", { requestId: "decor-order-1" });
assert.equal(current.warung.cash, initial.warung.cash - 12000);
assert.deepEqual(
  await buy("wall-pink", { requestId: "decor-order-1" }),
  current,
  "Replayed purchase has one receipt",
);
assert.equal(
  (await action("read")).warung.style.owned.filter((id) => id === "wall-pink").length,
  1,
);

resetTransport("delivery");
initial = await action("read");
assert.equal(
  initial.shipments.reduce((total, shipment) => total + shipment.boxes, 0),
  3,
);
assert.equal(Date.parse(initial.shipments[0].etaAt) - now, 95_000);
now += 95_000;
current = await action("read");
assert.equal(current.shipments.length, 1);
assert.equal(stock(current, "mi-instan"), stock(initial, "mi-instan") + 5);
assert.equal(stock(current, "kopi-sachet"), stock(initial, "kopi-sachet"));
assert.deepEqual(await action("read"), current, "Polling does not deliver an order twice");
now += 45_000;
current = await action("read");
assert.equal(current.shipments.length, 0);
assert.equal(stock(current, "kopi-sachet"), stock(initial, "kopi-sachet") + 4);
assert.equal(
  current.warung.cash,
  initial.warung.cash,
  "Already-paid deliveries do not charge on receipt",
);
assert.deepEqual(await action("read"), current);

resetTransport("delivery-arrived");
current = await action("read");
assert.equal(current.shipments.length, 0);
assert.deepEqual(await action("read"), current);

resetTransport("delivery-retry");
initial = await action("read");
await assert.rejects(action("unload"), /belum diterima/);
assert.deepEqual(await action("read"), initial, "Failed unload preserves carried boxes and stock");
current = await action("unload");
assert.equal(current.shipments.length, 0);
assert.equal(stock(current, "mi-instan"), stock(initial, "mi-instan") + 5);
await assert.rejects(action("unload"), /Tidak ada dus/);
assert.deepEqual(await action("read"), current, "Repeated unload does not duplicate stock");

resetTransport("tokocung");
initial = await action("read");
await action("kulakan", { items: [{ itemId: "mi-instan", qty: 2 }], delivery: "ambil" });
current = await action("pickup");
assert.equal(current.shipments[0].status, "CARRYING");
assert.equal(stock(current, "mi-instan"), stock(initial, "mi-instan"));
current = await action("unload");
assert.equal(stock(current, "mi-instan"), stock(initial, "mi-instan") + 2);
assert.equal(current.shipments.length, 0);

resetTransport("story-delivery");
current = await action("read");
assert.equal(current.event.npc, "Teh Euis");
assert.equal(current.shipments.length, 2);
resetTransport("community");
assert.equal((await action("directory")).mineId, data.OWNER_ID);
await assert.rejects(worldRequest("account"), /Preview tidak mendukung/);
console.log(
  "Warung fixture transactions passed: all decor categories, buy/equip/remove, defaults, cash/level/ownership guards, retries and idempotency; 3-box delivery, timed receipt, pickup/unload, and story/community preservation.",
);
