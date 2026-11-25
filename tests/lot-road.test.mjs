import test from "node:test";
import assert from "node:assert/strict";
import { WARUNG_LOTS, lotRoadZ } from "../src/game/warung/lots.ts";
import { ROADS, contains } from "../src/game/world/outdoor-layout.ts";

test("city lot kulakan trucks park on the road lane in front of the lot", () => {
  let onRoad = 0;
  for (const lot of WARUNG_LOTS) {
    const z = lotRoadZ(lot);
    // Lots whose front faces no road (infill backs) keep the old yard stop.
    if (z === lot.depth / 2 + 3.4) continue;
    onRoad++;
    assert(z > lot.depth / 2 + 1, `${lot.id}: truck clears the lot front`);
    const x = lot.x + Math.sin(lot.rotation) * z,
      wz = lot.z + Math.cos(lot.rotation) * z;
    assert(
      ROADS.some((r) => contains(r, { x, z: wz })),
      `${lot.id}: truck stop (${x.toFixed(1)}, ${wz.toFixed(1)}) is on a road`,
    );
  }
  assert(onRoad >= 15, `most lots face a road (${onRoad})`);
});
