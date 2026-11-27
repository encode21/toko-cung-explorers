/** @jsxImportSource @/game/jsx */
import { Suspense, useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Euler, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import { vehicleParts, type VehicleKind } from "@/game/assets/vehicles";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import type { Vec3 } from "@/game/world/layout";
import { SHOWROOM_ROOM } from "./layout";
import { PREMIUM_EXHIBITS, SHOWROOM_MODELS } from "./models";
import { ShowroomSalesNpc } from "./ShowroomSalesNpc";

const { halfWidth, halfDepth, height, doorWidth, doorHeight } = SHOWROOM_ROOM;
const wallThickness = 0.32;
const graphite = "#292d34";
const slate = "#404550";
const trim = "#151a20";
const coral = "#e75e4c";
const ivory = "#fff1d9";

function box(p: Vec3, s: Vec3, color: string): OutdoorPart {
  return { p, s, color };
}

const frontBayWidth = halfWidth - doorWidth / 2;
const frontBayX = doorWidth / 2 + frontBayWidth / 2;
const shell = [
  box([0, -0.24, 0], [2 * halfWidth, 0.48, 2 * halfDepth], "#3e454f"),
  box([0, height + 0.1, 0], [2 * halfWidth, 0.2, 2 * halfDepth], trim),
  box([0, height / 2, -halfDepth], [2 * halfWidth, height, wallThickness], graphite),
  box(
    [0, (doorHeight + height) / 2, halfDepth],
    [doorWidth, height - doorHeight, wallThickness],
    graphite,
  ),
  ...[-1, 1].flatMap((side) => [
    box([side * halfWidth, height / 2, 0], [wallThickness, height, 2 * halfDepth], graphite),
    box(
      [side * frontBayX, height / 2, halfDepth],
      [frontBayWidth, height, wallThickness],
      graphite,
    ),
  ]),
];

const platformTop = 0.48;
const platforms = [
  { x: 0, z: -3.4, width: 10.9, depth: 6.2 },
  ...[-1, 1].flatMap((side) =>
    [-4.8, 3.9].map((z) => ({ x: side * 10.7, z, width: 5.3, depth: 5.8 })),
  ),
];
const platformBaseHeight = platformTop - 0.04;
const platformBases = platforms.map(({ x, z, width, depth }) =>
  box([x, platformBaseHeight / 2, z], [width, platformBaseHeight, depth], "#22252d"),
);
const platformTops = platforms.map(({ x, z, width, depth }) =>
  box([x, platformTop - 0.038, z], [width - 0.24, 0.076, depth - 0.24], "#545a64"),
);
const platformLights = platforms.flatMap(({ x, z, width, depth }) =>
  [-1, 1].flatMap((side) => [
    box(
      [x + side * (width / 2 - 0.07), platformTop + 0.003, z],
      [0.045, 0.009, depth - 0.16],
      coral,
    ),
    box(
      [x, platformTop + 0.003, z + side * (depth / 2 - 0.07)],
      [width - 0.12, 0.009, 0.045],
      coral,
    ),
  ]),
);

const counter = box([-10.8, 0.58, 9.4], [4.35, 1.16, 1.3], slate);
const counterTop = box([-10.8, 1.19, 9.4], [4.56, 0.12, 1.52], "#d8d5cc");
const fixtures = [
  box([0, 3.36, -11.63], [13.6, 5.8, 0.44], "#232931"),
  box([0, 3.36, -11.37], [9.4, 4.72, 0.14], "#344b55"),
  box([0, 1.04, -11.23], [8.94, 0.085, 0.048], coral),
  ...[-1, 1].flatMap((side) => [
    box([side * 14.57, 1.06, 0], [0.36, 1.8, 23.4], slate),
    box([side * 14.38, 2.02, 0], [0.11, 0.12, 23.4], trim),
    box([side * 14.47, 6.45, 0], [0.54, 1.12, 23.6], trim),
    ...[-7.9, -3.95, 0, 3.95, 7.9].map((z) =>
      box([side * 14.71, 3.9, z], [0.37, 7.8, 0.31], slate),
    ),
    ...[5.03, 5.47, 5.91, 6.35].map((x) => ({
      ...box([side * x, 3.38, -11.34], [0.26, 5.05, 0.29], coral),
      rz: -side * 0.13,
    })),
  ]),
  box([0, 7.82, -1.55], [28.3, 0.24, 0.95], "#353a42"),
  ...[-8.9, 0, 8.9].map((x) => box([x, 7.73, -1.35], [0.66, 0.27, 17.65], "#353a42")),
];
const counterDetails = [
  box([-10.8, 0.32, 8.73], [4.34, 0.2, 0.045], coral),
  box([-11.48, 1.31, 9.44], [0.43, 0.12, 0.33], trim),
  { ...box([-11.48, 1.58, 9.47], [0.78, 0.49, 0.08], trim), rx: -0.13 },
  box([-9.46, 1.3, 9.29], [0.48, 0.1, 0.36], "#56858e"),
  box([-9.46, 1.4, 9.31], [0.42, 0.1, 0.3], ivory),
];
const ceilingLightMaterial = new MeshBasicMaterial({ toneMapped: false });
const ceilingLights = [
  ...[-1, 1].flatMap((side) => [
    box([side * 14.13, 6.18, 0], [0.06, 0.07, 23.55], ivory),
    box([side * 14.38, 2.08, 0], [0.044, 0.041, 23.4], "#ed826d"),
  ]),
  box([0, 6.18, -11.68], [28.3, 0.07, 0.06], ivory),
  ...[-8.9, 0, 8.9].flatMap((x) =>
    [-8, -2.1, 3.8].map((z) => box([x, 7.58, z], [0.22, 0.035, 4.45], ivory)),
  ),
];

const exhibits = [
  ...PREMIUM_EXHIBITS.map((exhibit) => ({
    ...exhibit,
    color: SHOWROOM_MODELS[exhibit.kind].color,
  })),
  { kind: "city-car", color: "#63c6b4", x: -10.7, z: -4.8, yaw: 0.58 },
  { kind: "sedan", color: "#6d98cc", x: -10.7, z: 3.9, yaw: 0.58 },
  { kind: "double-cabin", color: "#d86151", x: 10.7, z: -4.8, yaw: -0.52 },
] satisfies { kind: VehicleKind; color: string; x: number; z: number; yaw: number }[];

/** Bake all stationary vehicles into shared material batches without traffic update loops. */
function displayVehicleParts() {
  const position = new Vector3();
  const yAxis = new Vector3(0, 1, 0);
  const rotation = new Quaternion();
  const partRotation = new Quaternion();
  const euler = new Euler();
  return exhibits.flatMap(({ kind, color, x, z, yaw }) => {
    rotation.setFromAxisAngle(yAxis, yaw);
    return vehicleParts(kind, color, false, true).map((part) => {
      position.set(...part.p).applyQuaternion(rotation);
      partRotation.setFromEuler(euler.set(part.rx ?? 0, part.ry ?? 0, part.rz ?? 0));
      euler.setFromQuaternion(partRotation.premultiply(rotation));
      return {
        ...part,
        p: [x + position.x, platformTop + position.y, z + position.z] as Vec3,
        rx: euler.x,
        ry: euler.y,
        rz: euler.z,
      };
    });
  });
}

const colliderBoxes = [
  ...shell,
  ...platforms.map(({ x, z, width, depth }) =>
    box([x, platformTop / 2, z], [width, platformTop, depth], trim),
  ),
  counter,
  counterTop,
];

export function ShowroomInterior() {
  const displayParts = useMemo(displayVehicleParts, []);
  return (
    <group name="ShowroomInterior" position={SHOWROOM_ROOM.origin}>
      <hemisphereLight args={["#fff4e7", "#80889d", 1.22]} />
      <directionalLight position={[5, 7, 3]} color="#f8f4ff" intensity={1.4} />
      <pointLight position={[0, 5.5, -4]} color="#fff6e9" intensity={87} distance={18} />
      <pointLight position={[0, 5.5, 7]} color="#dbe8ff" intensity={72} distance={17} />
      <OutdoorBatch items={shell} shadows={false} />
      <OutdoorBatch items={fixtures} shadows={false} />
      <OutdoorBatch items={platformBases} shape="bevel" shadows={false} />
      <OutdoorBatch items={platformTops} shadows={false} />
      <OutdoorBatch
        items={[counter, counterTop, ...counterDetails]}
        shape="bevel"
        shadows={false}
      />
      <OutdoorBatch
        items={[...ceilingLights, ...platformLights]}
        shadows={false}
        material={ceilingLightMaterial}
      />
      <mesh position={[0, 0.008, -1.4]} rotation-x={-Math.PI / 2} scale={[7.55, 8.32, 1]}>
        <ringGeometry args={[0.988, 1, 64]} />
        <meshStandardMaterial color="#8391a0" roughness={0.88} />
      </mesh>
      <Suspense fallback={null}>
        <Text position={[0, 3.65, -11.28]} color={ivory} fontSize={0.93} letterSpacing={0.065}>
          CUNG MOTOR
        </Text>
      </Suspense>
      <StyledBatch items={displayParts} />
      <ShowroomSalesNpc />
      <RigidBody type="fixed" colliders={false} name="ShowroomStructure">
        {colliderBoxes.map(({ p, s }, index) => (
          <CuboidCollider key={index} position={p} args={[s[0] / 2, s[1] / 2, s[2] / 2]} />
        ))}
        {exhibits.map(({ kind, x, z, yaw }) => {
          const { half, centerY } = VEHICLE_DEFINITIONS[kind].collision;
          return (
            <CuboidCollider
              key={kind}
              position={[x, platformTop + centerY, z]}
              rotation={[0, yaw, 0]}
              args={half}
            />
          );
        })}
      </RigidBody>
    </group>
  );
}
