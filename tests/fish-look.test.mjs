import test from "node:test";
import assert from "node:assert/strict";
import { FISH_LOOKS, FALLBACK_LOOK, fishLook } from "../src/game/fishing/fish-look.ts";

test("every catalog fish has a look", () => {
  for (const id of ["wader", "nila", "perch", "koi", "arwana", "naga"])
    assert.equal(fishLook(id), FISH_LOOKS[id]);
});
test("unknown or missing id falls back", () => {
  for (const id of ["nope", "toString", "", undefined, null])
    assert.equal(fishLook(id), FALLBACK_LOOK);
});
