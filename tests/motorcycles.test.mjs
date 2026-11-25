import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { MOTORCYCLES, isMotorcycle, motorThumbnail } from "../src/game/vehicles/motorcycles.ts";
import { VEHICLE_DEFINITIONS } from "../src/game/vehicles/definitions.ts";
import { vehicleParts, STAGED_VEHICLES } from "../src/game/assets/vehicles.ts";
import { motorcycleGeometries } from "../src/game/assets/motorcycle-geometry.ts";
import { AMBIENT_FLEET } from "../src/game/traffic/fleet.ts";
import { rideAnimation } from "../src/game/vehicles/model.ts";

test("the dealer and actual game models agree, preserving saved tier IDs", () => {
  const config = JSON.parse(
    execFileSync(
      "php",
      [
        "-r",
        "function env($key,$default=null){return $default;} echo json_encode(require $argv[1]);",
        new URL("../../toko-cung/config/world-ojek.php", import.meta.url).pathname,
      ],
      { encoding: "utf8" },
    ),
  );
  for (const [model, motor] of Object.entries(MOTORCYCLES)) {
    assert.equal(config.motors.find((m) => m.id === motor.id).name, motor.name);
    assert.equal(config.vehicle_models[motor.id], model);
    assert.equal(config.vehicle_colors[motor.id], motor.color);
    assert.equal(motorThumbnail(motor.id), `/assets/vehicles/dealer/${motor.id}.png`);
    assert(
      AMBIENT_FLEET.some((v) => v.variant === model),
      model + " appears in traffic",
    );
    assert.equal(VEHICLE_DEFINITIONS[model].seats.length, 2);
    assert.equal(
      rideAnimation(
        { model, occupants: [{ connectionId: "driver", seat: 0, status: "active" }] },
        "driver",
        0,
      ),
      "RideBike",
    );
  }
});

test("bike bodies have animated wheels, no duplicate parked rider, and finite geometry", () => {
  for (const model of Object.keys(MOTORCYCLES)) {
    const parts = vehicleParts(model, "#ffffff");
    assert(!parts.some((p) => p.npc));
    assert.deepEqual(
      [...new Set(parts.filter((p) => p.wheel !== undefined).map((p) => p.wheel))].sort(),
      [0, 1],
    );
    assert(
      parts.every(
        (p) => p.p.every(Number.isFinite) && p.s.every((n) => Number.isFinite(n) && n > 0),
      ),
    );
    assert(vehicleParts(model, "#ffffff", true).some((p) => p.npc));
  }
  for (const geometry of Object.values(motorcycleGeometries))
    assert([...geometry.getAttribute("position").array].every(Number.isFinite));
  assert(
    !STAGED_VEHICLES.some((v) => isMotorcycle(v.kind)),
    "decorative colliders no longer block the two playable shop bikes",
  );
});
