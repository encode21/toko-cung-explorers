import test from "node:test";
import assert from "node:assert/strict";
import { KIOSKS, EXTRA_STALLS, eatToast, kioskById, kioskNear } from "../src/game/pasar/model.ts";
import { KULI_STALLS, FRUIT_STALL, FISH_STALL } from "../src/game/easyjobs/model.ts";

test("menu table: prices and energy as specified", () => {
  const m = Object.fromEntries(
    KIOSKS.flatMap((k) => k.menu.map((i) => [i.id, [i.price, i.energy]])),
  );
  assert.deepEqual(m, {
    bakwan: [1000, 4],
    "tahu-isi": [1000, 4],
    "pisang-goreng": [1500, 5],
    "martabak-telor": [15000, 30],
    "martabak-manis": [12000, 25],
    pisang: [2000, 6],
    jeruk: [2500, 6],
    mangga: [4000, 8],
    "ikan-bakar": [10000, 20],
    "pecel-lele": [8000, 18],
  });
});

test("kiosk lookup by position picks the nearest spot within reach", () => {
  for (const k of KIOSKS) assert.equal(kioskNear(k.at)?.id, k.id);
  assert.equal(kioskNear([0, 0, 0]), null);
  assert.equal(kioskNear([101, 0, 9.2 + 3])?.id, undefined);
  assert.equal(kioskById("ikan")?.name, "Ikan Pak Darman");
});

test("fruit and fish selling happen at Buah and Ikan; kuli stalls sit in the row", () => {
  assert.deepEqual(FRUIT_STALL, kioskById("buah").at);
  assert.deepEqual(FISH_STALL, kioskById("ikan").at);
  for (const s of KULI_STALLS) assert.ok(EXTRA_STALLS.some((e) => e.x === s[0] && e.z === s[2]));
});

test("eat toast shows energy gain", () => {
  assert.equal(
    eatToast({ id: "bakwan", name: "Bakwan", price: 1000, energy: 4 }, 1),
    "Nyam! Bakwan · ⚡ +4",
  );
});
