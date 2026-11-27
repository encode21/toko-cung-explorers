import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { Quaternion } from "three";
import { create } from "zustand";
import * as model from "../src/game/vehicles/model.ts";
import { VEHICLE_DEFINITIONS } from "../src/game/vehicles/definitions.ts";

const source = readFileSync(
  new URL("../src/game/vehicles/PlayerVehicles.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(
  source
    .replace(/^import [\s\S]*?;$/gm, "")
    .replace("function ParkedVehicle", "export function ParkedVehicle"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;

// Run the production frame callback across scene teardown/remount, with physics/rendering stubbed.
function setup(inside) {
  const useGang = create(() => ({ inside }));
  const useVehicleInput = create(() => ({
    throttle: 0,
    steer: 0,
    brake: false,
    boundaryWarning: false,
  }));
  const maps = Object.fromEntries(
    [
      "renderedVehicles",
      "renderedVehicleMotion",
      "vehicleAccess",
      "vehicleWalkClear",
      "vehicleExits",
      "vehicleJumps",
      "trafficVehicles",
      "npcKnocks",
    ].map((name) => [name, new Map()]),
  );
  let current,
    crossing = null;
  const driverPoses = new Map();
  const jsx = (type, props) => {
    if (type === "body")
      props.ref.current = {
        setEnabled() {},
        setNextKinematicTranslation() {},
        setNextKinematicRotation() {},
      };
    if (type === "group") props.ref.current = { position: { set() {} }, rotation: { set() {} } };
    return { type, props };
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: () => ({ jsx, jsxs: jsx, Fragment: "fragment" }),
    ...model,
    ...maps,
    VEHICLE_DEFINITIONS,
    Quaternion,
    useRef: (value) => (current.refs[current.index++] ??= { current: value }),
    useMemo: (fn) => fn(),
    useEffect: (fn) => {
      if (current.mounting) current.cleanups.push(fn());
    },
    useFrame: (fn) => {
      current.frame = fn;
    },
    useRapier: () => ({
      world: { castShape: () => null },
      rapier: {
        Cuboid: class {},
        QueryFilterFlags: { EXCLUDE_SENSORS: 1 },
      },
    }),
    RigidBody: "body",
    CuboidCollider: "collider",
    VehicleModel: "vehicle",
    useGang,
    useVehicleInput,
    connectionId: "me",
    useGame: { getState: () => ({ playerPos: [0, 0, 0] }) },
    useMobility: { getState: () => ({ vehicleLeaving: false }) },
    ROADS: [],
    waterAt: () => null,
    boundaryDepth: () => 0,
    approachingBoundary: () => false,
    isGangPosition: () => false,
    ojekTripTarget: () => null,
    driveThroughGate: () => {
      const destination = crossing;
      crossing = null;
      if (destination) useGang.setState({ inside: destination.gang });
      return destination;
    },
    publishVehiclePose() {},
    remoteVehiclePose: (v) => driverPoses.get(v.id) ?? v.pose,
    rideVisual: () => ({ lift: 0, roll: 0 }),
    reducedMotion: () => false,
  });
  return {
    ...maps,
    driverPoses,
    useGang,
    useVehicleInput,
    cross: (pose) => {
      crossing = pose;
    },
    mount(vehicle) {
      const instance = { refs: [], cleanups: [], index: 0, mounting: true };
      const render = () => {
        current = instance;
        instance.index = 0;
        const tree = exports.ParkedVehicle({ vehicle });
        instance.mounting = false;
        return tree;
      };
      const tree = render();
      return {
        tree,
        render,
        frame: () => instance.frame({ clock: { elapsedTime: 1 } }, 1 / 60),
        unmount: () => instance.cleanups.forEach((cleanup) => cleanup?.()),
      };
    },
  };
}

const city = { x: -34.4, y: 0, z: 18, yaw: 0, speed: 0, gang: null };
const gang = { x: 6000, y: 0, z: 2997, yaw: 0, speed: 0, gang: 1 };

for (const kind of ["motorcycle", "car"]) {
  test(`${kind}: passenger remounts at the driver's latest position in both directions`, () => {
    const s = setup(null);
    const vehicle = {
      id: "ride",
      model: kind,
      pose: city,
      revision: 1,
      occupants: [
        { seat: 0, connectionId: "driver", status: "active" },
        { seat: 1, connectionId: "me", status: "active" },
      ],
    };
    let scene = s.mount(vehicle);
    for (const target of [gang, city]) {
      scene.frame();
      const before = { ...s.renderedVehicles.get(vehicle.id) };
      s.driverPoses.set(vehicle.id, target);
      scene.frame();
      assert.deepEqual(
        { ...s.renderedVehicles.get(vehicle.id) },
        before,
        "passenger stays in loaded scenery while destination data is pending",
      );
      scene.unmount();
      s.useGang.setState({ inside: target.gang });
      scene = s.mount(vehicle);
      const [body, visual] = scene.tree.props.children;
      for (const node of [body, visual])
        assert.deepEqual(Array.from(node.props.position), [target.x, target.y, target.z]);
      scene.frame();
      assert.deepEqual({ ...s.renderedVehicles.get(vehicle.id) }, target);
      assert.equal(vehicle.occupants[1].status, "active");
      vehicle.pose = target; // Next transfer begins with the previous scene's server snapshot.
    }
    scene.unmount();
  });
}

for (const kind of ["motorcycle", "car"]) {
  for (const [from, to] of [
    [city, gang],
    [gang, city],
  ]) {
    for (const delay of [0, 4]) {
      test(`${kind}: ${from.gang === null ? "city to kampung" : "kampung to city"}, ${delay} old-scene frames`, () => {
        const s = setup(from.gang);
        const vehicle = {
          id: "ride",
          model: kind,
          pose: { ...from },
          revision: 1,
          occupants: [{ seat: 0, connectionId: "me", status: "active" }],
        };
        const oldScene = s.mount(vehicle);
        s.cross(to);
        oldScene.frame();
        oldScene.render(); // The global destination already changed; this instance still belongs to the old scene.
        for (let i = 0; i < delay; i++) oldScene.frame();
        assert.deepEqual(
          s.vehicleJumps.get(vehicle.id),
          to,
          "old scene must not consume the handoff",
        );
        oldScene.unmount();

        // The server heartbeat has not caught up yet; mount with the same stale snapshot.
        const nextScene = s.mount(vehicle);
        const [body, visual] = nextScene.tree.props.children;
        assert.deepEqual(
          Array.from(body.props.position),
          [to.x, to.y, to.z],
          "physics starts at the destination",
        );
        assert.deepEqual(
          Array.from(visual.props.position),
          [to.x, to.y, to.z],
          "visual starts at the destination",
        );
        nextScene.frame();
        assert.deepEqual({ ...s.renderedVehicles.get(vehicle.id) }, to);
        assert.equal(
          s.vehicleJumps.has(vehicle.id),
          false,
          "destination consumes the handoff once",
        );
        assert.deepEqual(vehicle.pose, from, "server snapshot is untouched");
        s.useVehicleInput.setState({ throttle: 1 });
        nextScene.frame();
        assert(s.renderedVehicles.get(vehicle.id).z > to.z, "vehicle can drive after arrival");
        nextScene.unmount();
      });
    }
  }
}

test("a jump without a scene still works inside kampung", () => {
  const s = setup(1);
  const vehicle = {
    id: "ride",
    model: "car",
    pose: gang,
    revision: 1,
    occupants: [{ seat: 0, connectionId: "me", status: "active" }],
  };
  const scene = s.mount(vehicle);
  s.vehicleJumps.set(vehicle.id, { x: 6010, y: 0, z: 3010, yaw: 0, speed: 0 });
  scene.frame();
  assert.equal(s.renderedVehicles.get(vehicle.id).x, 6010);
  assert.equal(s.renderedVehicles.get(vehicle.id).gang, 1);
  assert.equal(s.vehicleJumps.size, 0);
  scene.unmount();
});
