import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import * as layout from "../src/game/world/halte-jpo.ts";
import { WALK_SPEED, WORLD_GRAVITY } from "../src/game/player/movement.ts";

// Use the authored component's geometry/colliders, not a second copy of the JPO layout.
const jsx = (type, props) => ({ type, props });
const exports = {};
const source = readFileSync(new URL("../src/game/world/HalteJpo.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
new Function("require", "exports", compiled)((name) => {
  if (name.endsWith("jsx-runtime")) return { jsx, jsxs: jsx };
  if (name === "@react-three/rapier") return { RigidBody: "body", CuboidCollider: "collider" };
  if (name === "@/game/gang/Halte") return { Halte: () => null };
  if (name === "./BusModel") return { BusModel: () => null };
  if (name === "./Plang") return { Plang: () => null };
  if (name === "./halte-jpo") return layout;
  if (name === "./bus-ride") return { useBusRide: (select) => select({ riding: false }) };
  throw new Error(`Unexpected import: ${name}`);
}, exports);

function build(world) {
  const boxes = [];
  function visit(node, parent = new THREE.Matrix4()) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach((child) => visit(child, parent));
    if (typeof node.type === "function") return visit(node.type(node.props), parent);
    const p = node.props ?? {};
    const transform = new THREE.Object3D();
    transform.position.fromArray(p.position ?? [0, 0, 0]);
    transform.rotation.set(...(p.rotation ?? [0, p["rotation-y"] ?? 0, p["rotation-z"] ?? 0]));
    transform.updateMatrix();
    const matrix = parent.clone().multiply(transform.matrix);
    if (node.type === "collider") {
      const position = new THREE.Vector3(),
        rotation = new THREE.Quaternion();
      matrix.decompose(position, rotation, new THREE.Vector3());
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(...p.args)
          .setTranslation(position.x, position.y, position.z)
          .setRotation(rotation),
      );
    }
    if (node.type === "boxGeometry") {
      const half = new THREE.Vector3(...p.args).multiplyScalar(0.5);
      boxes.push(new THREE.Box3(half.clone().negate(), half).applyMatrix4(matrix));
    }
    visit(p.children, matrix);
  }
  visit(exports.HalteJpo());
  return boxes;
}

await RAPIER.init();
const { JPO } = layout;
for (const reverse of [false, true]) {
  test(`JPO stairs and deck are walkable ${reverse ? "north to south" : "south to north"}`, () => {
    const world = new RAPIER.World({ x: 0, y: WORLD_GRAVITY, z: 0 });
    try {
      const boxes = build(world);
      for (const side of [-1, 1]) {
        const rail = new THREE.Vector3(
          JPO.x + (side * JPO.width) / 2,
          JPO.height + 0.55,
          (JPO.southZ + JPO.northZ) / 2,
        );
        assert.ok(
          boxes.some((box) => box.containsPoint(rail)),
          "deck side rails remain in place",
        );
      }
      for (const [side, z] of [
        [1, JPO.southZ],
        [-1, JPO.northZ],
      ]) {
        const opening = new THREE.Vector3(JPO.x + (side * JPO.width) / 2, JPO.height + 0.55, z);
        assert.equal(
          boxes.some((box) => box.containsPoint(opening)),
          false,
          "no wall across stair opening",
        );
      }
      world.createCollider(RAPIER.ColliderDesc.cuboid(50, 0.1, 50).setTranslation(0, -0.1, 0));
      const path = [
        [JPO.x + JPO.width / 2 + JPO.run + 1, JPO.southZ],
        [JPO.x, JPO.southZ],
        [JPO.x, JPO.northZ],
        [JPO.x - JPO.width / 2 - JPO.run - 1, JPO.northZ],
      ];
      if (reverse) path.reverse();
      const player = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(path[0][0], 0.83, path[0][1])
          .lockRotations()
          .setCanSleep(false),
      );
      world.createCollider(RAPIER.ColliderDesc.capsule(0.45, 0.38), player);
      for (const [index, [x, z]] of path.slice(1).entries()) {
        let reached = false;
        for (let step = 0; step < 900; step++) {
          const p = player.translation();
          const distance = Math.hypot(x - p.x, z - p.z);
          if (distance < 0.12) {
            reached = true;
            break;
          }
          player.setLinvel(
            {
              x: ((x - p.x) / distance) * WALK_SPEED,
              y: player.linvel().y,
              z: ((z - p.z) / distance) * WALK_SPEED,
            },
            true,
          );
          world.step();
        }
        assert.ok(reached, `walk to ${x}, ${z}: ${JSON.stringify(player.translation())}`);
        if (index < 2) assert.ok(player.translation().y > JPO.height + 0.7, "standing on deck");
      }
      assert.ok(player.translation().y < 1, "back on the sidewalk after descent");
    } finally {
      world.free();
    }
  });
}

test("bus boarding marker fits the empty shelter bay, away from stair traffic", () => {
  const [x, , z] = layout.HALTE_BOARD;
  assert(z - 0.9 > JPO.northZ + JPO.width / 2, "entry radius clears the entire stair corridor");
  assert(x - 0.9 > layout.HALTE.x - 1, "clear of bench");
  assert(z + 0.85 < layout.HALTE.z + layout.HALTE.depth / 2 - 0.1, "clear of back wall");
});
