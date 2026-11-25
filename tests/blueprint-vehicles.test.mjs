import { test } from "node:test";
import assert from "node:assert/strict";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { CAR_BLUEPRINTS } from "../src/game/vehicles/blueprints.ts";
import { VEHICLE_DEFINITIONS } from "../src/game/vehicles/definitions.ts";
import { blueprintGeometries } from "../src/game/assets/blueprint-geometry.ts";
import { vehicleParts } from "../src/game/assets/vehicles.ts";
import { AMBIENT_FLEET, VEHICLE_IDS } from "../src/game/traffic/fleet.ts";

test("eight reference silhouettes appear in the existing 16-vehicle roster", () => {
  assert.equal(Object.keys(CAR_BLUEPRINTS).length, 8);
  assert.equal(AMBIENT_FLEET.length, 16);
  assert.equal(new Set(VEHICLE_IDS).size, 17);
  for (const model of [...Object.keys(CAR_BLUEPRINTS), "convertible", "bajaj", "jeepney"])
    assert(
      AMBIENT_FLEET.some((v) => v.variant === model),
      model,
    );
  assert.equal(VEHICLE_DEFINITIONS.sport.seats.length, 2);
  assert.equal(VEHICLE_DEFINITIONS["double-cabin"].seats.length, 4);
  assert.equal(VEHICLE_DEFINITIONS["city-car"].seats[2].doorSeat, 0);
  assert.equal(VEHICLE_DEFINITIONS.sedan.seats[3].doorSeat, 1);
});

test("wheel arches are genuine cutouts and every animated panel has a valid hinge", () => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  for (const [model, b] of Object.entries(CAR_BLUEPRINTS)) {
    const d = VEHICLE_DEFINITIONS[model],
      parts = vehicleParts(model, "#d8e2e8", true, true);
    const body = parts.filter(
      (p) => p.shape?.startsWith(model + "-") && /-(flank|door[01])(-left)?$/.test(p.shape),
    );
    for (const part of parts) {
      assert(
        part.p.every(Number.isFinite) && part.s.every((n) => Number.isFinite(n) && n > 0),
        `${model}: finite dimensions`,
      );
      if (part.door !== undefined)
        assert(d.seats[part.door]?.hinge, `${model}: hinge ${part.door}`);
      if (part.shape?.startsWith(model + "-")) assert(blueprintGeometries[part.shape], part.shape);
    }
    for (const part of body) {
      const mesh = new Mesh(blueprintGeometries[part.shape], material);
      mesh.position.set(...part.p);
      mesh.updateMatrixWorld();
      for (const z of b.axles) {
        const ray = new Raycaster(
          new Vector3(b.width + 1, b.radius + 0.04, z),
          new Vector3(-1, 0, 0),
        );
        assert.equal(ray.intersectObject(mesh).length, 0, `${model}/${part.shape}: wheel opening`);
      }
    }
    assert(!vehicleParts(model, "#fff").some((p) => p.npc), `${model}: no duplicate parked driver`);
    for (const grip of d.seats[0].grips)
      assert(
        parts.some((p) => p.npc && p.shape === "sphere" && p.p.every((n, i) => n === grip[i])),
        `${model}: NPC reaches steering wheel`,
      );
  }
  material.dispose();
});

test("all generated body geometry is finite and the compact EV is shorter than the pickups", () => {
  for (const [name, g] of Object.entries(blueprintGeometries)) {
    const positions = g.getAttribute("position");
    if (!positions) continue;
    assert(Array.from(positions.array).every(Number.isFinite), name);
    g.computeBoundingBox();
    assert(g.boundingBox.max.y < 2.7, name);
  }
  assert(VEHICLE_DEFINITIONS["city-car"].size[2] < VEHICLE_DEFINITIONS.pickup.size[2]);
  assert(VEHICLE_DEFINITIONS.sport.roof < VEHICLE_DEFINITIONS.car.roof);
  assert(VEHICLE_DEFINITIONS["double-cabin"].size[2] > VEHICLE_DEFINITIONS.pickup.size[2]);
});
