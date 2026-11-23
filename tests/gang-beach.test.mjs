import test from "node:test";
import assert from "node:assert/strict";
import {
  gangBeachY,
  gangBeachTerrain,
  gangGrassBlend,
  LAND_HALF,
  LAND_START,
  LAWN_INSET,
  GANG_SHORE,
  GANG_SEA_Y,
  GANG_WALL,
} from "../src/game/gang/beach.ts";

test("Gang shores descend continuously on all four sides and stop ankle-deep at the walls", () => {
  for (const end of [34, 130]) {
    const shores = [
      (d) => [LAND_HALF + d, 10],
      (d) => [-LAND_HALF - d, 10],
      (d) => [0, LAND_START - d],
      (d) => [0, end + d],
    ];
    for (const point of shores) {
      assert.equal(gangBeachY(...point(0), end), -0.04);
      assert(Math.abs(gangBeachY(...point(GANG_SHORE), end) - GANG_SEA_Y) < 1e-6);
      const wallDepth = GANG_SEA_Y - gangBeachY(...point(GANG_WALL), end);
      assert(wallDepth > 0 && wallDepth < 0.3);
      let previous = gangBeachY(...point(0), end);
      for (let d = 0.1; d <= GANG_WALL; d += 0.1) {
        const y = gangBeachY(...point(d), end);
        assert(y <= previous && previous - y < 0.025, "no step or cliff");
        previous = y;
      }
      assert.equal(gangGrassBlend(...point(-LAWN_INSET), end), 1);
      assert.equal(gangGrassBlend(...point(5), end), 0);
      assert(gangGrassBlend(...point(-1), end) > 0 && gangGrassBlend(...point(-1), end) < 1);
    }
    const { vertices, indices, coverage } = gangBeachTerrain(end);
    assert(vertices.every(Number.isFinite));
    assert(indices.every((i) => i >= 0 && i < vertices.length / 3));
    assert(coverage.every((c) => c >= 0 && c <= 1));
    for (let i = 0; i < vertices.length; i += 3)
      assert(Math.abs(vertices[i + 1] - gangBeachY(vertices[i], vertices[i + 2], end)) < 1e-6);
  }
});
