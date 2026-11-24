import { test } from "node:test";
import assert from "node:assert/strict";
import { selectNear, lodCap } from "../src/game/npc/lod.ts";
import { npcExplorerLook } from "../src/identity/characters.ts";

const P = { x: 0, z: 0 };
const at = (id, x) => ({ id, x, z: 0 });

test("hysteresis: enter at 12, leave at 15", () => {
  assert.equal(selectNear(P, [at("a", 13)], new Set(), 10).size, 0);
  assert.equal(selectNear(P, [at("a", 11)], new Set(), 10).size, 1);
  assert.equal(selectNear(P, [at("a", 14)], new Set(["a"]), 10).size, 1);
  assert.equal(selectNear(P, [at("a", 16)], new Set(["a"]), 10).size, 0);
});

test("cap keeps the nearest", () => {
  const c = [at("far", 10), at("mid", 5), at("near", 1)];
  assert.deepEqual([...selectNear(P, c, new Set(), 2)].sort(), ["mid", "near"]);
  assert.equal(selectNear(P, c, new Set(), 0).size, 0);
});

test("caps per tier", () => {
  assert.deepEqual([lodCap("LOW"), lodCap("MEDIUM"), lodCap("HIGH")], [4, 6, 10]);
});

test("explorer twin keeps colours and skips mascots", () => {
  const look = npcExplorerLook("npc-shopper-2");
  assert.equal(look.explorer.colors.skin, "#d9a47a");
  assert.equal(look.explorer.colors.jacket, "#4fb39a");
  assert.equal(npcExplorerLook("npc-shopper-1").explorer.gender, "female");
  assert.equal(npcExplorerLook("npc_daily_cung"), null);
  assert.equal(npcExplorerLook("npc-wali-kota"), null);
  assert.equal(npcExplorerLook("npc-courier").explorer.headwear, "baseball-cap");
});
