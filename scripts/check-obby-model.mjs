import assert from "node:assert/strict";
import { SITE_SOLIDS } from "../src/game/obby/construction.ts";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  OBBY_PLATFORMS,
  OBBY_CHECKPOINTS,
  belowObbyRoute,
  atObbyExit,
  platformPosition,
  platformThickness,
  emptyObbyRun,
  landOnObby,
  respawnObbyRun,
} from "../src/game/obby/model.ts";
import { WALK_SPEED, JUMP_SPEED, WORLD_GRAVITY } from "../src/game/player/movement.ts";

let run = emptyObbyRun();
assert.equal(landOnObby(run, "finish", 10), run, "finish cannot start a run");
run = landOnObby(run, "start", 100);
assert.equal(run.startedAt, 100);
assert.equal(landOnObby(run, "checkpoint2", 200), run, "skipping checkpoints is rejected");
for (const platform of OBBY_PLATFORMS.slice(1, 6)) run = landOnObby(run, platform.id, 200);
assert.equal(run.checkpoint, 3);
run = respawnObbyRun(run);
assert.equal(run.step, 3);
assert.equal(run.respawns, 1);
assert.equal(run.startedAt, 100, "a fall keeps the run and timer");
for (const platform of OBBY_PLATFORMS.slice(4)) run = landOnObby(run, platform.id, 300);
assert.equal(run.status, "complete");
assert.equal(landOnObby(run, "finish", 400), run, "finish is emitted once");
assert.equal(respawnObbyRun(run), run, "completed players can return along the ground");
assert.equal(landOnObby(run, "start", 500).status, "active", "return to Start replays");

assert.equal(atObbyExit(28, -17.5, 0.2), true);
assert.equal(atObbyExit(28, -17.5, 20), false, "high falls by Start cannot cancel a run");
for (const checkpoint of OBBY_CHECKPOINTS) {
  let attempt = landOnObby(emptyObbyRun(), "start", 100);
  const index = OBBY_PLATFORMS.indexOf(checkpoint);
  for (const p of OBBY_PLATFORMS.slice(1, index + 1)) attempt = landOnObby(attempt, p.id, 200);
  const rescued = respawnObbyRun(attempt);
  assert.equal(rescued.checkpoint, index);
  assert.equal(rescued.step, index);
  assert.equal(rescued.startedAt, 100);
  assert.equal(belowObbyRoute(index, checkpoint.top - 1.6), true);
  assert.equal(belowObbyRoute(index, checkpoint.top - 0.1), false);
}

// Real capsule/cuboid collision, production walk/jump/gravity, desktop and mobile timesteps.
// Begin near the takeoff edge and stop horizontal input inside the receiving platform.
// Every sampled moving phase must remain reachable WITHOUT sprinting.
await RAPIER.init();
let traversals = 0;
for (const dt of [1 / 60, 1 / 40]) {
  for (let phase = 0; phase < 12; phase++) {
    const seconds = (phase * Math.PI * 2) / 12 / 0.8;
    for (let index = 1; index < OBBY_PLATFORMS.length; index++) {
      const source = OBBY_PLATFORMS[index - 1],
        target = OBBY_PLATFORMS[index];
      const a = platformPosition(source, seconds),
        b = platformPosition(target, seconds);
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / length,
        dz = (b.z - a.z) / length;
      // Zero direction has no constraint, so use explicit finite-axis distances.
      const sourceEdge = Math.min(
        Math.abs(dx) > 0.001 ? source.width / 2 / Math.abs(dx) : Infinity,
        Math.abs(dz) > 0.001 ? source.depth / 2 / Math.abs(dz) : Infinity,
      );
      const targetEdge = Math.min(
        Math.abs(dx) > 0.001 ? target.width / 2 / Math.abs(dx) : Infinity,
        Math.abs(dz) > 0.001 ? target.depth / 2 / Math.abs(dz) : Infinity,
      );
      const startDistance = sourceEdge - 0.3;
      const stopDistance = length - targetEdge + 0.5;
      const world = new RAPIER.World({ x: 0, y: WORLD_GRAVITY, z: 0 });
      world.timestep = dt;
      for (const part of SITE_SOLIDS) {
        const rigid = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...part.p));
        world.createCollider(RAPIER.ColliderDesc.cuboid(...part.s.map((n) => n / 2)), rigid);
      }
      const platforms = [];
      for (const platform of OBBY_PLATFORMS) {
        const p = platformPosition(platform, seconds);
        const desc =
          platform.kind === "moving"
            ? RAPIER.RigidBodyDesc.kinematicPositionBased()
            : RAPIER.RigidBodyDesc.fixed();
        const body = world.createRigidBody(
          desc.setTranslation(p.x, p.y - platformThickness(platform) / 2, p.z),
        );
        platforms.push({ platform, body });
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(
            platform.width / 2,
            platformThickness(platform) / 2,
            platform.depth / 2,
          ),
          body,
        );
      }
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(a.x + dx * startDistance, a.y + 0.84, a.z + dz * startDistance)
          .lockRotations()
          .setCcdEnabled(true),
      );
      world.createCollider(RAPIER.ColliderDesc.capsule(0.45, 0.38), body);
      body.setLinvel({ x: dx * WALK_SPEED, y: JUMP_SPEED, z: dz * WALK_SPEED }, true);
      let landed = false;
      for (let frame = 0; frame < 100; frame++) {
        const p = body.translation(),
          v = body.linvel();
        const along = (p.x - a.x) * dx + (p.z - a.z) * dz;
        body.setLinvel(
          {
            x: along < stopDistance ? dx * WALK_SPEED : 0,
            y: v.y,
            z: along < stopDistance ? dz * WALK_SPEED : 0,
          },
          true,
        );
        for (const { platform, body: platformBody } of platforms) {
          if (platform.kind === "moving") {
            const next = platformPosition(platform, seconds + (frame + 1) * dt);
            platformBody.setNextKinematicTranslation({ x: next.x, y: next.y - 0.16, z: next.z });
          }
        }
        world.step();
        const after = body.translation();
        const currentTarget = platformPosition(target, seconds + (frame + 1) * dt);
        if (
          frame > 8 &&
          Math.abs(after.y - (b.y + 0.83)) < 0.045 &&
          Math.abs(body.linvel().y) < 0.5 &&
          Math.abs(after.x - b.x) < target.width / 2 &&
          Math.abs(after.z - currentTarget.z) < target.depth / 2
        ) {
          landed = true;
          break;
        }
        if (after.y < b.y - 1) break;
      }
      world.free();
      assert(landed, `${source.id} → ${target.id} reachable at ${1 / dt}Hz, moving phase ${phase}`);
      traversals++;
    }
  }
}
console.log(
  `PASS Obby state: ordered visits, all checkpoints, repeat finish, replay; ${traversals} Rapier walk-speed jumps at 40/60 Hz across 12 moving phases.`,
);
