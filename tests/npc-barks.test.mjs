import test from "node:test";
import assert from "node:assert/strict";
import { barkSituation, pickBark } from "../src/game/npc/barks.ts";

test("situation follows weather, then proximity, then clock", () => {
  assert.equal(barkSituation(480, false), "pagi");
  assert.equal(barkSituation(800, false), "siang");
  assert.equal(barkSituation(1300, false), "malam");
  assert.equal(barkSituation(60, false), "malam");
  assert.equal(barkSituation(480, true), "warung");
  assert.equal(barkSituation(480, true, { rain: 0.8, flood: 0 }), "hujan");
  assert.equal(barkSituation(480, true, { rain: 0.8, flood: 0.9 }), "banjir");
  assert.equal(barkSituation(480, false, { rain: 0.1, flood: 0 }), "pagi");
});

test("pickBark is deterministic, role specific and falls back to warga", () => {
  assert.equal(pickBark("gorengan", "pagi", 3), pickBark("gorengan", "pagi", 3));
  assert.match(pickBark("gorengan", "hujan", 0), /gorengan/i);
  assert.ok(pickBark("galon", "banjir", 5).length > 0);
  assert.ok(pickBark("kasir", "malam", 7).length > 0);
});

test("every pool line is non-empty for every role x situation", () => {
  for (const role of ["warga", "ibu", "ojol", "galon", "anak", "rt", "gorengan", "satpam", "kurir", "pembeli"])
    for (const s of ["pagi", "siang", "malam", "hujan", "banjir", "warung"])
      for (let i = 0; i < 4; i++) assert.ok(pickBark(role, s, i).trim());
});
