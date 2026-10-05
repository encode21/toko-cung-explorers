import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarFromSeed, normalizeAvatar, HAIR_STYLES } from "../src/identity/avatar.ts";

test("remote player ids always yield valid, deterministic avatar choices", () => {
  // Exercises hashes with the sign bit set, which previously produced negative indices.
  for (let i = 0; i < 10000; i++) {
    const id = `remote-player-${i}-world`;
    const avatar = avatarFromSeed(id);
    assert.ok(HAIR_STYLES.some((style) => style.id === avatar.hair));
    assert.match(avatar.skin, /^#[0-9a-f]{6}$/i);
    assert.deepEqual(avatarFromSeed(id), avatar);
  }
});

test("legacy appearance profiles gain safe optional garment colors", () => {
  const old = normalizeAvatar({ hair: "bob", skin: "#b97f57" });
  assert.equal(old.hair, "bob");
  assert.equal(old.skin, "#b97f57");
  assert.equal(old.pantsColor, "#384355");
  assert.equal(normalizeAvatar({ shoesColor: "invalid" }).shoesColor, "#344452");
  assert.equal(normalizeAvatar({ pantsColor: "#112233" }).pantsColor, "#112233");
});
