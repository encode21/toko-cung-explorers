import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WARDROBE, itemOwned, WARDROBE_SLOTS } from "../src/identity/wardrobe.ts";
import { DEFAULT_EXPLORER, normalizeExplorer, equipExplorer } from "../src/identity/explorer.ts";
import { createExplorerRig } from "../src/game/avatar/explorer-rig.ts";
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const equip = (a, item) =>
  item.preset
    ? normalizeExplorer({ ...a, ...item.preset, colors: { ...a.colors, ...item.colors } })
    : equipExplorer(a, item.slot, item.id);
function stats(scene) {
  let calls = 0,
    triangles = 0;
  scene.traverseVisible((o) => {
    if (o.isMesh) {
      calls++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    }
  });
  return { calls, triangles };
}
test("41 actual catalog entries have valid IDs, presets, static thumbnails and clear ownership", async () => {
  assert.equal(WARDROBE.length, 41);
  assert.equal(new Set(WARDROBE.map((i) => i.id)).size, 41);
  for (const item of WARDROBE) {
    assert.ok(Number.isInteger(item.price) && item.price >= 0);
    assert.ok(
      (await stat(new URL(`../public/assets/wardrobe/${item.id}.png`, import.meta.url))).size >
        1000,
    );
    if (item.preset)
      for (const [slot, id] of Object.entries(item.preset))
        assert.ok(id === "none" || WARDROBE.some((i) => i.id === id && i.slot === slot));
  }
  assert.equal(
    itemOwned(
      WARDROBE.find((i) => i.id === "hoodie"),
      [],
    ),
    false,
  );
  assert.equal(
    itemOwned(
      WARDROBE.find((i) => i.id === "set-streetwear"),
      ["hoodie", "cargo", "sneakers", "beanie", "sling-bag"],
    ),
    true,
  );
  const v1 = normalizeExplorer({ version: 1, headwear: "baseball-cap" });
  assert.equal(v1.version, 2);
  assert.equal(v1.top, "explorer-jacket");
});
test("every item selects actual geometry, distinct garment forms and animated pivots", () => {
  const a = createExplorerRig(asset.scene, asset.animations),
    b = createExplorerRig(asset.scene, asset.animations);
  b.apply(DEFAULT_EXPLORER);
  const peaks = [];
  const topShapes = new Set();
  for (const item of WARDROBE) {
    const config = equip(DEFAULT_EXPLORER, item);
    a.apply(config);
    for (const slot of WARDROBE_SLOTS) {
      if (["top", "bottom", "footwear"].includes(slot)) {
        const chosen = [];
        a.scene.traverse((o) => {
          if (o.userData.wardrobeSlot === slot && o.visible) chosen.push(o.userData.wardrobeId);
        });
        assert.ok(chosen.length > 0);
        assert.ok(chosen.every((id) => id === config[slot]));
      } else {
        const socket = a.scene.getObjectByName("Socket_" + slot);
        assert.deepEqual(
          socket.children.filter((o) => o.visible).map((o) => o.name),
          config[slot] === "none" ? [] : [config[slot]],
        );
      }
    }
    if (item.slot === "top") {
      const shape = [];
      a.scene.traverseVisible((o) => {
        if (o.isMesh && o.parent.userData.wardrobeSlot === "top")
          shape.push(o.geometry.attributes.position.array.join(","));
      });
      topShapes.add(shape.join("|"));
    }
    a.actions.get("Walk").play();
    for (let i = 0; i < 30; i++) {
      a.mixer.update(1 / 30);
      a.scene.updateMatrixWorld(true);
      a.scene.traverseVisible((o) => {
        assert.ok(o.matrixWorld.elements.every(Number.isFinite));
      });
    }
    peaks.push({ id: item.id, ...stats(a.scene) });
  }
  assert.equal(topShapes.size, 5, "five geometrically distinct tops");
  assert.equal(b.materials.get("jacket").color.getHexString(), "b92025");
  console.log("Wardrobe draw-call maximum", peaks.sort((a, b) => b.calls - a.calls)[0]);
  console.log("Wardrobe triangle maximum", peaks.sort((a, b) => b.triangles - a.triangles)[0]);
  a.dispose();
  b.dispose();
});
test("slot conflicts preserve compatible combinations", () => {
  let a = equipExplorer(DEFAULT_EXPLORER, "headwear", "cat-band");
  a = equipExplorer(a, "eyewear", "heart-glasses");
  a = equipExplorer(a, "back", "animal-pack");
  a = equipExplorer(a, "hairDecoration", "star-clip");
  assert.equal(a.headwear, "cat-band");
  assert.equal(a.eyewear, "heart-glasses");
  a = equipExplorer(a, "audio", "headphones");
  assert.equal(a.headwear, "none");
  assert.equal(a.back, "animal-pack");
  a = equipExplorer(a, "headwear", "bucket-hat");
  assert.equal(a.audio, "none");
  assert.equal(a.hairDecoration, "none");
  a = equipExplorer(a, "hairDecoration", "flower-clip");
  assert.equal(a.headwear, "none");
});
