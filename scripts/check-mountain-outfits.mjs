// Free mountain clothing must never mutate saved appearance or grant catalog ownership.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    let url = specifier.startsWith("@/")
      ? pathToFileURL(root + "src/" + specifier.slice(2)).href
      : specifier.startsWith(".") && context.parentURL
        ? new URL(specifier, context.parentURL).href
        : specifier;
    if (url.startsWith("file:") && !/\.[a-z]+$/i.test(url)) {
      for (const extension of [".ts", ".tsx", ".js"])
        if (existsSync(fileURLToPath(url + extension))) {
          url += extension;
          break;
        }
    }
    return next(url, context);
  },
});
const { DEFAULT_AVATAR } = await import("../src/identity/avatar.ts");
const { MOUNTAIN_OUTFITS, mountainOutfitAvatar } = await import("../src/game/mountain/outfits.ts");
const { attachMountainOutfit } = await import("../src/game/mountain/outfit-meshes.ts");
const { Group, Mesh } = await import("three");
const original = structuredClone({
  ...DEFAULT_AVATAR,
  skin: "#c68b62",
  equipped: { hair: "hair-short", tops: "old-shirt", backpacks: "old-pack" },
});
const before = JSON.stringify(original);
assert.equal(
  mountainOutfitAvatar(original, null),
  original,
  "Leaving mountain restores identical appearance object",
);
assert.equal(MOUNTAIN_OUTFITS.length, 3);
for (const preset of MOUNTAIN_OUTFITS) {
  const dressed = mountainOutfitAvatar(original, preset.id);
  assert.equal(JSON.stringify(original), before, "Loan outfit does not mutate saved appearance");
  assert.equal(dressed.skin, original.skin, "Skin identity stays unchanged");
  assert.equal(dressed.equipped.hair, original.equipped.hair, "Identity cosmetics remain");
  assert.equal(
    dressed.equipped.tops,
    undefined,
    "Temporary garments do not claim owned catalog items",
  );
  assert.equal(
    dressed.explorer.headwear,
    "none",
    "Custom safari hat does not equip a paid catalog hat",
  );
  for (const explorer of [false, true]) {
    const scene = new Group(),
      head = new Group(),
      torso = new Group();
    head.name = "Head";
    torso.name = explorer ? "Body" : "Chest";
    scene.add(head, torso);
    const cleanup = attachMountainOutfit(scene, preset.id, explorer);
    const hat = scene.getObjectByName("MountainOutfitHat"),
      vest = scene.getObjectByName("MountainOutfitVest");
    assert.ok(hat && vest, "Both rig types receive the chosen outfit");
    let disposed = 0,
      meshes = 0;
    scene.traverse((part) => {
      if (part instanceof Mesh) {
        meshes++;
        part.geometry.addEventListener("dispose", () => disposed++);
      }
    });
    cleanup();
    assert.equal(disposed, meshes, "Changing outfit disposes all temporary meshes");
    assert.equal(scene.getObjectByName("MountainOutfitHat"), undefined);
    assert.equal(scene.getObjectByName("MountainOutfitVest"), undefined);
  }
}
console.log(
  "PASS 3 temporary outfits, original identity restoration, no ownership mutation, both rig attachments and cleanup",
);
