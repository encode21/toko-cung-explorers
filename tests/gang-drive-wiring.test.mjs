import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// FEAT-148: a ride driven through Gerbang Kampung must stay mounted when the gang scene replaces the
// city, or the seated player is left at the city gate with nothing drawn (empty-void bug).
// The behaviour itself is covered by scripts/check-gang-drive-browser.mjs.
test("GameCanvas renders player vehicles in the gang scene branch", () => {
  const source = readFileSync(new URL("../src/game/engine/GameCanvas.tsx", import.meta.url), "utf8");
  const branch = source.slice(source.indexOf(") : gang ? ("), source.indexOf("<OutdoorLocations"));
  assert.ok(branch.includes("<GangScene />"));
  assert.ok(branch.includes("<PlayerVehicles />"));
});
