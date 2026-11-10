import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_ROUTE_VERSION,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
} from "../src/game/mountain/model.ts";

const backend = process.argv[2];
if (!backend)
  throw new Error("Usage: node scripts/check-mountain-server-route.mjs /path/to/WorldMountain.php");
const service = await readFile(backend, "utf8");
const vectors = (block) =>
  [...block.matchAll(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)].map((m) =>
    m.slice(1).map(Number),
  );
const clientRoute = MOUNTAIN_TRAIL;
const serverRoute = vectors(service.split("public const ROUTE = [")[1].split("];", 1)[0]);
assert.deepEqual(
  serverRoute,
  clientRoute,
  "server-validated route must match the visible/colliding trail",
);
const checkpoints = MOUNTAIN_CHECKPOINTS.map((checkpoint) => checkpoint.position);
const serverPoints = vectors(service.split("private const POINTS = [")[1].split("];", 1)[0]);
assert.deepEqual(
  serverPoints[0],
  MOUNTAIN_HELIPAD.position,
  "Server arrival uses the coastal basecamp",
);
assert.deepEqual(
  serverPoints.slice(1, -1),
  checkpoints,
  "server CPs must match visible checkpoints",
);
assert.deepEqual(serverPoints.at(-1), MOUNTAIN_SUMMIT.position);
assert.equal(checkpoints.length, 10, "Expedition has ten checkpoints");
assert.equal(
  Number(service.match(/public const ROUTE_VERSION = (\d+)/)[1]),
  MOUNTAIN_ROUTE_VERSION,
  "Client and server use the same checkpoint layout version",
);
console.log(
  `PASS: ${clientRoute.length} route points, ${checkpoints.length} checkpoints and summit match server validation.`,
);
