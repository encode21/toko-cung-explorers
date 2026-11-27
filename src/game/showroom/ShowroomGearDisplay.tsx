/** @jsxImportSource @/game/jsx */
import { Suspense, useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { MeshBasicMaterial } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useGarasi, type GarasiItem } from "@/game/garasi/store";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import type { Vec3 } from "@/game/world/layout";
import { SHOWROOM_GEAR_DISPLAY } from "./gear-display";

const { position, width, depth, height } = SHOWROOM_GEAR_DISPLAY;
const frame = "#455461";
const interior = "#a8b5b6";
const shelf = "#e5dace";
const cream = "#fff1d9";
const lining = "#25313a";
const center = 2.03;
const front = -depth / 2;
const displaySlots = 4;
const helmetShelves = [1.02, 1.92];

function box(p: Vec3, s: Vec3, color: string): OutdoorPart {
  return { p, s, color };
}

const frameParts = [
  box([0, 0.31, 0], [width, 0.62, depth], frame),
  box([0, 0.62, 0], [width - 0.1, 0.12, depth - 0.04], shelf),
  box([0, 1.95, 0.59], [width - 0.1, 2.68, 0.16], interior),
  box([0, height - 0.175, 0], [width, 0.35, depth], frame),
  ...[-width / 2 + 0.06, 0, width / 2 - 0.06].map((x) =>
    box([x, 1.98, 0], [0.12, 2.64, depth], frame),
  ),
  ...helmetShelves.map((y) => box([center, y - 0.05, -0.02], [3.92, 0.1, 1.18], shelf)),
  box([-center, 2.49, -0.045], [3.62, 0.055, 0.055], frame),
  box([0, 0.18, front - 0.005], [width - 0.24, 0.08, 0.018], "#e75e4c"),
];
const rackLight = new MeshBasicMaterial({ toneMapped: false });
const strip = [box([0, 2.96, front + 0.03], [width - 0.24, 0.038, 0.03], cream)];

// The rack stays stocked in the scene while the catalog is loading, without inventing prices.
const displayHelmets: Pick<GarasiItem, "color" | "shape">[] = [
  { color: "#1f9d55", shape: "half" },
  { color: "#e9dcc0", shape: "half" },
  { color: "#c42f2f", shape: "full" },
  { color: "#1d2024", shape: "full" },
];
const displayJackets: Pick<GarasiItem, "color" | "trim">[] = [
  { color: "#1f9d55", trim: "#0f3d24" },
  { color: "#1f2326", trim: "#27b35a" },
  { color: "#ef7d22", trim: "#2a2a2a" },
  { color: "#1f5fae", trim: "#f2c230" },
];

function helmetParts(
  { color, shape }: Pick<GarasiItem, "color" | "shape">,
  index: number,
): AssetPart[] {
  const x = center + (index % 2 === 0 ? 0.86 : -0.86);
  const y = helmetShelves[index < 2 ? 1 : 0]! + 0.27;
  const helmet: AssetPart[] = [
    {
      p: [x, y - 0.235, 0.03],
      s: [0.31, 0.06, 0.31],
      color: frame,
      shape: "cylinder",
      finish: "metal",
    },
    {
      p: [x, y, 0.025],
      s: [0.7, 0.65, 0.76],
      color,
      shape: "dome",
      finish: "autoPaint",
    },
    {
      p: [x, y - 0.025, 0.025],
      s: [0.67, 0.59, 0.067],
      color: lining,
      shape: "ring",
      finish: "rubber",
      rx: Math.PI / 2,
    },
  ];
  if (shape === "full") {
    helmet.push(
      {
        p: [x, y - 0.09, -0.03],
        s: [0.64, 0.28, 0.67],
        color,
        shape: "coach",
        finish: "autoPaint",
      },
      {
        p: [x, y - 0.005, -0.304],
        s: [0.57, 0.19, 0.155],
        color: "#30434f",
        shape: "coach",
        finish: "glass",
      },
    );
  } else {
    helmet.push({
      p: [x, y - 0.025, -0.34],
      s: [0.52, 0.048, 0.23],
      color,
      shape: "coach",
      finish: "autoPaint",
    });
    for (const side of [-1, 1])
      helmet.push({
        p: [x + side * 0.244, y - 0.13, -0.15],
        s: [0.035, 0.21, 0.032],
        color: lining,
        finish: "rubber",
        rz: -side * 0.11,
      });
  }
  return helmet;
}

function jacketParts(
  { color, trim = lining }: Pick<GarasiItem, "color" | "trim">,
  index: number,
): AssetPart[] {
  const x = -center + (1.5 - index) * 0.85;
  const y = 1.79;
  const rackZ = -0.12;
  const fabric = (p: Vec3, s: Vec3, tint: string, rz = 0): AssetPart => ({
    p,
    s,
    color: tint,
    rz,
    shape: "coach",
    finish: "fabric",
  });
  return [
    {
      p: [x, 2.38, -0.045],
      s: [0.06, 0.22, 0.07],
      color: frame,
      shape: "cylinder",
      finish: "metal",
    },
    fabric([x, y, rackZ], [0.43, 0.87, 0.25], color),
    fabric([x, y - 0.37, rackZ - 0.012], [0.44, 0.073, 0.252], trim),
    fabric([x, y + 0.412, rackZ], [0.26, 0.1, 0.225], trim),
    { p: [x, y + 0.01, rackZ - 0.127], s: [0.02, 0.72, 0.019], color: trim, finish: "fabric" },
    {
      p: [x + 0.108, y + 0.22, rackZ - 0.13],
      s: [0.1, 0.06, 0.017],
      color: cream,
      finish: "fabric",
    },
    ...[-1, 1].flatMap((side) => [
      fabric([x + side * 0.27, y - 0.025, rackZ], [0.177, 0.7, 0.213], color, side * 0.25),
      fabric([x + side * 0.345, y - 0.339, rackZ], [0.15, 0.105, 0.213], trim, side * 0.25),
    ]),
  ];
}

/** One static retail cabinet, facing the open showroom aisle. */
export function ShowroomGearDisplay() {
  const helmets = useGarasi((state) => state.data?.catalog.helmet) ?? displayHelmets;
  const jackets = useGarasi((state) => state.data?.catalog.jacket) ?? displayJackets;
  const gear = useMemo(
    () => [
      ...helmets.slice(0, displaySlots).flatMap(helmetParts),
      ...jackets.slice(0, displaySlots).flatMap(jacketParts),
    ],
    [helmets, jackets],
  );

  return (
    <group name="ShowroomGearDisplay" position={position}>
      <OutdoorBatch items={frameParts} shape="bevel" shadows={false} />
      <OutdoorBatch items={strip} material={rackLight} shadows={false} />
      <StyledBatch items={gear} />
      <Suspense fallback={null}>
        <Text
          position={[center, 3.17, front - 0.013]}
          rotation-y={Math.PI}
          color={cream}
          fontSize={0.22}
          letterSpacing={0.1}
        >
          HELM
        </Text>
        <Text
          position={[-center, 3.17, front - 0.013]}
          rotation-y={Math.PI}
          color={cream}
          fontSize={0.22}
          letterSpacing={0.1}
        >
          JAKET
        </Text>
      </Suspense>
      <RigidBody type="fixed" colliders={false} name="ShowroomGearCabinet">
        <CuboidCollider args={[width / 2, height / 2, depth / 2]} position={[0, height / 2, 0]} />
      </RigidBody>
    </group>
  );
}
