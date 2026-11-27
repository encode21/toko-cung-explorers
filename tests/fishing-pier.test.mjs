import test from "node:test";
import assert from "node:assert/strict";
import { FISHING_DECKS, FISHING_RAILS } from "../src/game/fishing/pier-layout.ts";
import { FISHING_SPOT } from "../src/game/fishing/model.ts";
import { cityBusLegs } from "../src/game/world/bus-routes.ts";
import { waterAt, coastalTerrain } from "../src/game/swimming/model.ts";

test("connected dry decks lead from the bus apron to the fishing point above open sea", () => {
  const reached = new Set([0]);
  for (let pass = 0; pass < FISHING_DECKS.length; pass++)
    FISHING_DECKS.forEach((a, i) =>
      FISHING_DECKS.forEach((b, j) => {
        if (
          reached.has(i) &&
          Math.abs(a.x - b.x) <= (a.width + b.width) / 2 + 0.001 &&
          Math.abs(a.z - b.z) <= (a.depth + b.depth) / 2 + 0.001
        )
          reached.add(j);
      }),
    );
  assert.equal(reached.size, FISHING_DECKS.length);
  const [x, y, z] = FISHING_SPOT;
  assert(
    FISHING_DECKS.some((d) => Math.abs(x - d.x) < d.width / 2 && Math.abs(z - d.z) < d.depth / 2),
  );
  assert(waterAt(x, z).surface < y);
  assert(waterAt(x + 0.45, z - 4.8).depth > 2, "bobber lands in the sea beyond the deck");
  assert.equal(waterAt(42, -45), null, "old pond is dry");
  const { vertices, indices } = coastalTerrain();
  assert(
    indices.some((_, i) => {
      if (i % 3) return false;
      const triangle = [0, 1, 2].map((n) => indices[i + n] * 3);
      const cx = triangle.reduce((sum, p) => sum + vertices[p], 0) / 3;
      const cz = triangle.reduce((sum, p) => sum + vertices[p + 2], 0) / 3;
      return Math.abs(cx - 42) < 2 && Math.abs(cz + 45) < 2;
    }),
    "old pond has real terrain triangles again",
  );
});

test("pier railings and piles leave the full-size bus turnaround clear", () => {
  const path = cityBusLegs("gerbang", "pasar")[0].path;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1],
      to = path[i];
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    for (const [x0, z0, x1, z1] of FISHING_RAILS) {
      const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.4);
      for (let j = 0; j <= steps; j++) {
        const dx = x0 + ((x1 - x0) * j) / steps - from.x;
        const dz = z0 + ((z1 - z0) * j) / steps - from.z;
        const side = dx * Math.cos(yaw) - dz * Math.sin(yaw);
        const along = dx * Math.sin(yaw) + dz * Math.cos(yaw);
        assert(Math.abs(side) > 1.55 || Math.abs(along) > 5.8, "bus sweep intersects pier railing");
      }
    }
  }
});
