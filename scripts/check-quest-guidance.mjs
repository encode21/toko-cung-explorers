import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/game/core/quest-guidance.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { questGuidanceTarget: target } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const clue = { target: "clue", position: [4, 0, 8], required: 1, realm: "WORLD", secret: {} };
const next = { ...clue, target: "next", position: [10, 0, 12] };
const snapshot = {
  active: { quest_id: "quest", status: "ACTIVE", progress: [0, 0] },
  quests: [{ id: "quest", objectives: [clue, next] }],
};
assert.equal(target(null, null), null);
assert.equal(target(snapshot, null).objective, clue);
snapshot.active.progress = [1, 0];
assert.equal(target(snapshot, null).objective, next);
snapshot.active.progress = [1, 1];
assert.equal(target(snapshot, null), null);
snapshot.active.progress = [0, 0];
for (const status of ["COMPLETED", "CANCELLED", "FAILED", "EXPIRED"]) {
  snapshot.active.status = status;
  assert.equal(target(snapshot, null), null);
}
snapshot.active.status = "ACTIVE";
const hub = { instance: null, config: { entrance: [35, 0, 28], objectives: [] } };
const daily = { objective: next, position: next.position, realm: "WORLD" };
const entranceTarget = { objective: null, position: hub.config.entrance, realm: "WORLD" };
assert.equal(target(null, hub), null, "browsing the hub does not enable guidance");
assert.equal(target(null, null, null, true), null, "wait for authoritative entrance coordinates");
assert.deepEqual(
  target(null, hub, null, true),
  entranceTarget,
  "track the door before a run exists",
);
assert.deepEqual(
  target(snapshot, hub, daily, true),
  entranceTarget,
  "explicit door tracking overrides older daily/world guidance",
);
assert.equal(target(snapshot, hub, daily, false), daily, "daily guidance resumes when untracked");
assert.equal(
  target(snapshot, hub, null, false).objective,
  clue,
  "world guidance resumes when untracked",
);
assert.equal(target(snapshot, hub, daily), daily, "existing daily priority is preserved");
const dungeon = {
  instance: { status: "ACTIVE", realm: "DUNGEON", progress: [0], found: ["clue-0"] },
  config: {
    objectives: [
      {
        ...clue,
        realm: "DUNGEON",
        positions: [
          [1, 0, 1],
          [2, 4, 2],
        ],
      },
    ],
    entrance: [35, 0, 28],
    spawn: [0, 0, 7],
    worldExit: [0, 0, 10],
  },
};
assert.deepEqual(target(snapshot, dungeon).position, [2, 4, 2]);
assert.deepEqual(
  target(snapshot, dungeon, daily, true).position,
  [2, 4, 2],
  "active dungeon objectives take priority over entrance tracking",
);
dungeon.instance.found.push("clue-1");
assert.equal(target(snapshot, dungeon), null);
dungeon.config.objectives = [clue];
assert.deepEqual(target(snapshot, dungeon).position, dungeon.config.worldExit);
assert.equal(target(snapshot, dungeon).objective, null);
dungeon.instance.realm = "WORLD";
assert.equal(target(snapshot, dungeon).objective, clue);
dungeon.config.objectives = [{ ...clue, realm: "DUNGEON" }];
assert.deepEqual(target(snapshot, dungeon).position, dungeon.config.entrance);
dungeon.instance.status = "COMPLETED";
assert.equal(target(snapshot, dungeon), null);
for (const status of ["CREATING", "WAITING", "COMPLETED", "FAILED", "CLOSING"]) {
  dungeon.instance.status = status;
  assert.equal(
    target(snapshot, dungeon, daily, true),
    null,
    "non-active instances must not point to the overworld entrance",
  );
}
console.log(
  "PASS quest guidance: tracked Principal entrance, priority, active clue, progression, terminal states, unfound clues and realm travel",
);

const motionSource = await readFile(
  new URL("../src/game/core/guidance-motion.ts", import.meta.url),
  "utf8",
);
const motionJs = ts.transpileModule(motionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { guidanceAngle, guidanceDirectionVisible } = await import(
  "data:text/javascript;base64," + Buffer.from(motionJs).toString("base64")
);
const from = Math.PI - 0.02,
  to = -Math.PI + 0.02;
const turned = guidanceAngle(from, to, 1 / 60);
assert(turned > from && turned - from < 0.04, "cross ±PI by the short arc");
const turns = [30, 60, 120].map((fps) => {
  let angle = 0;
  for (let i = 0; i < fps / 2; i++) angle = guidanceAngle(angle, 1.8, 1 / fps);
  return angle;
});
assert(Math.max(...turns) - Math.min(...turns) < 1e-10, "frame-rate independent rotation");
assert.equal(guidanceDirectionVisible(0.79, true), false);
assert.equal(guidanceDirectionVisible(0.9, false), false);
assert.equal(guidanceDirectionVisible(1.16, false), true);
assert.equal(guidanceDirectionVisible(0.9, true), true);
console.log("PASS guidance damping: shortest arc, 30/60/120fps equivalence, arrival hysteresis");

const trailSource = await readFile(
  new URL("../src/game/core/guidance-trail.ts", import.meta.url),
  "utf8",
);
const trailJs = ts.transpileModule(trailSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  GUIDANCE_TRAIL: trail,
  guidanceTrailDistance,
  guidanceTrailOpacity,
} = await import("data:text/javascript;base64," + Buffer.from(trailJs).toString("base64"));
const near = (actual, expected, message) =>
  assert(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);
assert.equal(trail.count, 18);
const cycle = trail.spacing / trail.speed;
for (const elapsed of [0, cycle / 3, cycle - 1e-6, cycle, 20, 1000]) {
  for (let index = 1; index < trail.count; index++) {
    near(
      guidanceTrailDistance(index, elapsed) - guidanceTrailDistance(index - 1, elapsed),
      trail.spacing,
      "all flowing markers retain uniform spacing",
    );
  }
}
for (let index = 0; index < trail.count; index++) {
  near(
    guidanceTrailDistance(index, cycle / 2) - guidanceTrailDistance(index, cycle / 4),
    (trail.speed * cycle) / 4,
    "markers advance toward the objective at the configured speed",
  );
}
const epsilon = 1e-6;
for (let index = 1; index < trail.count; index++) {
  near(
    guidanceTrailDistance(index, cycle + epsilon) -
      guidanceTrailDistance(index - 1, cycle - epsilon),
    2 * epsilon * trail.speed,
    "phase wrap hands each visible marker to the next instance without a positional jump",
  );
}
assert(
  guidanceTrailOpacity(guidanceTrailDistance(0, cycle + epsilon), 100) < 1e-8,
  "the newly spawned marker fades in at the feet",
);
assert.equal(
  guidanceTrailOpacity(guidanceTrailDistance(trail.count - 1, cycle - epsilon), 100),
  0,
  "the outgoing last marker is already invisible when the phase wraps",
);

for (const targetDistance of [0, 0.8, 1.35, 1.8, 5, 24, 40, 100]) {
  const end = Math.min(trail.maxLength, targetDistance - trail.targetGap);
  for (const elapsed of [0, cycle / 4, cycle / 2, cycle - epsilon, cycle, 1000]) {
    for (let index = 0; index < trail.count; index++) {
      const along = guidanceTrailDistance(index, elapsed, targetDistance);
      const alpha = guidanceTrailOpacity(along, targetDistance);
      assert(alpha >= 0 && alpha <= 1, "opacity stays bounded");
      if (alpha > 0)
        assert(
          along > trail.start && along < end,
          "visible markers never overshoot the objective gap or maximum trail length",
        );
    }
  }
  assert.equal(guidanceTrailOpacity(end, targetDistance), 0);
  assert.equal(guidanceTrailOpacity(end + 1, targetDistance), 0);
}
for (const targetDistance of [1.8, 2, 2.6]) {
  const steadyPosition = guidanceTrailDistance(0, 0, targetDistance);
  for (const elapsed of [0, 0.4, 0.9]) {
    let visible = 0;
    for (let index = 0; index < trail.count; index++) {
      const along = guidanceTrailDistance(index, elapsed, targetDistance);
      const alpha = guidanceTrailOpacity(along, targetDistance);
      if (alpha > 0) {
        visible++;
        assert.equal(index, 0, "only the leading arrow remains on a short final segment");
        assert(
          along > trail.start && along < targetDistance - trail.targetGap,
          "the steady final arrow stays between the feet and the objective gap",
        );
      }
    }
    assert.equal(visible, 1, `${targetDistance}m: the cue never blinks out during any phase`);
    near(
      guidanceTrailDistance(0, elapsed, targetDistance),
      steadyPosition,
      "the final arrow stays still, including the reduced-motion phase",
    );
  }
}
const fadeIn = [0, 0.05, 0.2, 0.45].map((offset) => guidanceTrailOpacity(trail.start + offset, 10));
assert.equal(fadeIn[0], 0);
assert.equal(fadeIn.at(-1), 1);
assert(fadeIn.every((alpha, index) => index === 0 || alpha > fadeIn[index - 1]));
const end = 10 - trail.targetGap;
const fadeOut = [1.6, 1, 0.2, 0].map((remaining) => guidanceTrailOpacity(end - remaining, 10));
assert.equal(fadeOut[0], 1);
assert.equal(fadeOut.at(-1), 0);
assert(fadeOut.every((alpha, index) => index === 0 || alpha < fadeOut[index - 1]));
for (const invalid of [NaN, Infinity, -Infinity]) {
  assert.equal(guidanceTrailOpacity(2, invalid), 0);
  assert.equal(guidanceTrailOpacity(invalid, 10), 0);
}
for (const closeTarget of [-1, 0, 0.8, trail.start + trail.targetGap])
  for (let index = 0; index < trail.count; index++)
    for (const elapsed of [0, 0.4, 0.9])
      assert.equal(
        guidanceTrailOpacity(guidanceTrailDistance(index, elapsed, closeTarget), closeTarget),
        0,
        "the steady final arrow still disappears on arrival",
      );
const elapsedByFps = [30, 60, 120].map((fps) => {
  let elapsed = 0;
  for (let frame = 0; frame < fps * 2; frame++) elapsed += 1 / fps;
  return elapsed;
});
for (let index = 0; index < trail.count; index++) {
  for (const elapsed of elapsedByFps) {
    const along = guidanceTrailDistance(index, elapsed);
    near(along, guidanceTrailDistance(index, 2), "trail phase is frame-rate independent");
    near(
      guidanceTrailOpacity(along, 10),
      guidanceTrailOpacity(guidanceTrailDistance(index, 2), 10),
      "trail fades are frame-rate independent",
    );
  }
}
console.log(
  "PASS guidance trail: spacing, forward motion, seamless wrap, bounds, fades and FPS independence",
);
