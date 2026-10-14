import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseSpawn,
  shouldYieldSpawn,
  overlapEscape,
  SPAWN_SPACING,
} from "../src/game/player/spawn.ts";
import RAPIER from "@dimforge/rapier3d-compat";

const candidates = Array.from({ length: 36 }, (_, i) => ({
  x: (i % 6) * 1.5,
  y: 0.83,
  z: Math.floor(i / 6) * 1.5,
}));
test("25 concurrent arrivals converge to separate slots when delayed positions arrive", () => {
  let peers = Array.from({ length: 25 }, (_, i) => {
    const id = String(i).padStart(2, "0");
    return { id, ...chooseSpawn(id, candidates, []) };
  });
  for (let round = 0; round < 25; round++) {
    const snapshot = peers;
    peers = peers.map((peer) =>
      shouldYieldSpawn(peer.id, peer, snapshot)
        ? { id: peer.id, ...chooseSpawn(peer.id, candidates, snapshot) }
        : peer,
    );
  }
  for (const a of peers)
    for (const b of peers) {
      if (a.id !== b.id) assert(Math.hypot(a.x - b.x, a.z - b.z) >= SPAWN_SPACING);
    }
});
test("placement avoids occupied and blocked points; full area returns no unsafe fallback", () => {
  const peers = [{ id: "other", ...candidates[0] }];
  assert.deepEqual(chooseSpawn("me", candidates.slice(0, 2), peers), candidates[1]);
  assert.equal(
    chooseSpawn("me", candidates.slice(0, 2), peers, (p) => p === candidates[1]),
    undefined,
  );
  assert.equal(chooseSpawn("me", [], []), undefined);
  assert(chooseSpawn("me", [candidates[0]], [{ ...peers[0], y: -10 }]));
});
test("only higher ID yields; remote overlap escape has hysteresis and respects floors", () => {
  const point = candidates[0];
  assert.equal(shouldYieldSpawn("a", point, [{ id: "b", ...point }]), false);
  assert.equal(shouldYieldSpawn("b", point, [{ id: "a", ...point }]), true);
  assert.equal(overlapEscape(false, 0, 0), true);
  assert.equal(overlapEscape(true, 0.9, 0), true);
  assert.equal(overlapEscape(true, 1.01, 0), false);
  assert.equal(overlapEscape(false, 0.75, 0), false);
  assert.equal(overlapEscape(true, 0, 8), false);
});
test("Rapier: overlapping arrivals can walk out, while ground collision stays enabled", async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10).setTranslation(0, -0.1, 0));
  const player = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.83, 0).lockRotations(),
  );
  world.createCollider(RAPIER.ColliderDesc.capsule(0.45, 0.38), player);
  const remote = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.83, 0),
  );
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.42, 0.34), remote);
  let escaping = false;
  for (let i = 0; i < 120; i++) {
    const p = player.translation();
    escaping = overlapEscape(escaping, Math.hypot(p.x, p.z), p.y - 0.83);
    collider.setSensor(escaping);
    player.setLinvel({ x: 2, y: player.linvel().y, z: 0 }, true);
    world.step();
  }
  assert(player.translation().x > 3, "player moves away from overlapping spawn");
  assert(player.translation().y > 0.7, "floor remains solid");
  assert.equal(collider.isSensor(), false, "person becomes solid after separation");
  world.free();
});
