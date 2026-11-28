import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("vehicle camera orbits from touch look and desktop right-drag", () => {
  const src = readFileSync(new URL("../src/game/player/Player.tsx", import.meta.url), "utf8");
  const ride = src.slice(src.indexOf("if (drivingTruck || ridingVehicle) {"));
  const branch = ride.slice(0, ride.indexOf("return;\n    }"));
  assert.match(branch, /consumeTouchLook\(\)/);
  assert.match(branch, /drive\.current\.active/, "right-drag must reach the ride camera");
  assert.match(branch, /mouse\.turn \* delta/);
  assert.match(
    branch,
    /now - rideLookAt\.current > 2000/,
    "camera still eases back behind the vehicle",
  );
});
