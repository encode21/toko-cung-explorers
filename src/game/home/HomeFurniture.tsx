/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, interactionGroups } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { HOME_BED, HOME_SOFA, HOME_SPOTS, HOME_WARDROBE } from "./model";

type Vec3 = AssetPart["p"];

const oak = "#c69a6e";
const deepOak = "#997052";
const ivory = "#f7eddd";
const ink = "#2d3d47";
const denim = "#4e6f86";
const deepDenim = "#3d5a72";
const seaGlass = "#79a9a0";
const saffron = "#dca95a";
const deskWhite = "#fbf6e9";
const graphite = "#333d46";

const [bedX, bedZ] = HOME_SPOTS.bed;
const [boxX, boxZ] = HOME_SPOTS.box;
const desk: Vec3 = [-5.47, 0, -2.72];
const chair: Vec3 = [-4.57, 0, -2.86];
const consoleTable: Vec3 = [-5.5, 0, 0.72];
const coffeeTable: Vec3 = [-4.53, 0, 0.72];
const nightstand: Vec3 = [-1.38, 0, -4.15];

function collider(id: string, [x, , z]: Vec3, width: number, depth: number, height: number) {
  const halfExtents: Vec3 = [width / 2, height / 2, depth / 2];
  const position: Vec3 = [x, height / 2, z];
  return { id, position, halfExtents };
}

const furnitureColliders = [
  collider("bed", [bedX, 0, bedZ], HOME_BED.halfWidth * 2, HOME_BED.halfDepth * 2, HOME_BED.top),
  collider("box", [boxX, 0, boxZ], 0.89, 0.82, 0.55),
  collider(
    "wardrobe",
    HOME_WARDROBE.position,
    HOME_WARDROBE.width,
    HOME_WARDROBE.depth,
    HOME_WARDROBE.height,
  ),
  collider("desk", desk, 0.89, 2.02, 0.86),
  collider("desk-chair", chair, 0.73, 0.73, 1.04),
  collider("media-console", consoleTable, 0.64, 2.35, 0.52),
  collider("coffee-table", coffeeTable, 0.47, 0.92, 0.35),
  collider("sofa", HOME_SOFA.position, 0.94, 2.24, 0.93),
  collider("nightstand", nightstand, 0.65, 0.58, 0.52),
];

export function HomeFurnitureColliders() {
  return furnitureColliders.map(({ id, position, halfExtents }) => (
    <CuboidCollider
      key={id}
      args={halfExtents}
      position={position}
      {...(id === "sofa" ? { collisionGroups: interactionGroups(0, [0, 1]) } : {})}
    />
  ));
}

function part(
  p: Vec3,
  s: Vec3,
  color: string,
  finish: AssetPart["finish"] = "wood",
  shape: AssetPart["shape"] = "bevel",
  rotation?: Pick<AssetPart, "rx" | "ry" | "rz">,
): AssetPart {
  return { p, s, color, finish, shape, ...rotation };
}

function feet(width: number, depth: number, y: number, height: number, color: string) {
  return [-1, 1].flatMap((x) =>
    [-1, 1].map((z) => part([(x * width) / 2, y, (z * depth) / 2], [0.095, height, 0.095], color)),
  );
}

const bedParts: AssetPart[] = [
  ...feet(1.6, 1.76, 0.08, 0.16, deepOak),
  part([0, 0.27, 0], [1.96, 0.3, 2.17], oak),
  part([0, 0.22, 0.008], [1.84, 0.12, 2.17], deepOak),
  part([0, 0.49, 0], [1.86, 0.22, 2.02], ivory, "fabric", "coach"),
  part([0, 0.61, 0.23], [1.89, 0.09, 1.46], denim, "fabric", "coach"),
  part([0, 0.52, 0.971], [1.87, 0.24, 0.12], denim, "fabric", "coach"),
  part([0, 0.67, -0.44], [1.89, 0.045, 0.16], "#65889a", "fabric"),
  part([0, 0.71, -1.02], [1.96, 1.34, 0.13], oak),
  part([0, 0.97, -0.937], [1.77, 0.68, 0.1], deepDenim, "fabric", "coach"),
  ...[-0.42, 0.42].map((x) =>
    part([x, 0.66, -0.69], [0.73, 0.18, 0.4], ivory, "fabric", "coach", { rx: 0.16 }),
  ),
  part([0.61, 0.674, 0.52], [0.56, 0.045, 1.04], seaGlass, "fabric"),
  part([0.61, 0.683, 0.91], [0.56, 0.028, 0.042], "#aed0bb", "fabric"),
];

const wardrobeParts: AssetPart[] = [
  ...feet(1.42, 0.53, 0.055, 0.11, deepOak),
  part([0, 1.31, -0.015], [1.7, 2.45, 0.72], oak),
  part([0, 0.23, 0.352], [1.55, 0.21, 0.065], oak),
  ...[-1, 1].flatMap((side) => [
    part([side * 0.403, 1.42, 0.355], [0.785, 1.99, 0.07], ivory),
    part([side * 0.403, 0.99, 0.395], [0.75, 0.025, 0.012], "#dfc8ab"),
    part([side * 0.092, 1.42, 0.414], [0.032, 0.3, 0.052], deepOak),
  ]),
  part([0, 2.51, 0], [1.71, 0.055, 0.75], deepOak),
];

const nightstandParts: AssetPart[] = [
  ...feet(0.51, 0.44, 0.05, 0.1, deepOak),
  part([0, 0.3, 0], [0.63, 0.39, 0.56], oak),
  part([0, 0.33, 0.286], [0.55, 0.24, 0.032], ivory),
  part([0, 0.35, 0.31], [0.15, 0.026, 0.028], deepOak),
  part([-0.063, 0.53, -0.03], [0.26, 0.055, 0.26], ink, "metal", "cylinder"),
  part([-0.063, 0.75, -0.03], [0.045, 0.41, 0.045], deepOak, "metal", "cylinder"),
  part([-0.063, 0.98, -0.03], [0.34, 0.27, 0.34], saffron, "fabric", "dome"),
];

const sofaParts: AssetPart[] = [
  ...feet(1.78, 0.6, 0.075, 0.15, deepOak),
  part([0, 0.26, 0], [2.19, 0.28, 0.88], deepDenim, "fabric", "coach"),
  part([0, 0.62, -0.337], [2.08, 0.63, 0.26], deepDenim, "fabric", "coach", { rx: -0.09 }),
  ...[-1, 1].flatMap((side) => [
    part(
      [side * 0.5, HOME_SOFA.seatHeight - 0.115, 0.071],
      [0.98, 0.23, 0.67],
      denim,
      "fabric",
      "coach",
    ),
    part([side * 0.5, 0.741, -0.227], [0.98, 0.41, 0.22], denim, "fabric", "coach", { rx: -0.12 }),
    part([side * 1.018, 0.51, 0.046], [0.2, 0.43, 0.8], denim, "fabric", "coach"),
  ]),
  part([-0.68, 0.687, -0.085], [0.44, 0.38, 0.18], saffron, "fabric", "coach", {
    rx: -0.22,
    rz: -0.18,
  }),
  part([0.64, 0.676, -0.085], [0.41, 0.35, 0.18], seaGlass, "fabric", "coach", {
    rx: -0.24,
    rz: 0.2,
  }),
];

const coffeeTableParts: AssetPart[] = [
  ...feet(0.62, 0.32, 0.15, 0.3, deepOak),
  part([0, 0.315, 0], [0.92, 0.075, 0.47], oak, "wood", "coach"),
  part([-0.19, 0.36, 0.06], [0.25, 0.025, 0.17], seaGlass, "wood", "bevel", { ry: 0.13 }),
  part([0.2, 0.37, -0.028], [0.18, 0.036, 0.18], ivory, "plastic", "cylinder"),
  part([0.2, 0.415, -0.028], [0.079, 0.08, 0.079], saffron, "plastic", "cylinder"),
];

function screen([x, y, z]: Vec3, width: number, height: number, color: string): AssetPart[] {
  return [
    part([x, y, z], [width, height, 0.075], ink, "plastic"),
    part([x, y, z + 0.043], [width - 0.075, height - 0.073, 0.015], color, "plastic", "box"),
    part(
      [x + 0.02, y - height / 4, z + 0.055],
      [width * 0.86, height * 0.14, 0.005],
      "#3a5264",
      "plastic",
      "box",
    ),
  ];
}

const mediaParts: AssetPart[] = [
  ...feet(1.98, 0.44, 0.055, 0.11, deepOak),
  part([0, 0.308, 0], [2.32, 0.41, 0.62], oak),
  part([0, 0.31, 0.314], [2.21, 0.31, 0.043], ivory),
  ...[-0.71, 0, 0.71].map((x) => part([x, 0.33, 0.342], [0.18, 0.028, 0.024], deepOak)),
  part([0, 0.528, -0.04], [0.57, 0.035, 0.26], ink, "plastic"),
  part([0, 0.63, -0.08], [0.105, 0.18, 0.085], ink, "plastic"),
  ...screen([0, 1.019, -0.085], 1.69, 0.88, "#263a4b"),
  part([0.95, 0.586, 0.048], [0.16, 0.145, 0.16], saffron, "plastic", "cylinder"),
  part([0.95, 0.663, 0.048], [0.15, 0.035, 0.15], "#4f6953", "wood", "cylinder"),
  ...[-0.58, 0.2, 0.63].map((rz) =>
    part([0.95, 0.76, 0.048], [0.064, 0.21, 0.075], seaGlass, "fabric", "coach", { rz }),
  ),
];

const deskParts: AssetPart[] = [
  part([0, 0.808, 0], [2.02, 0.098, 0.89], deskWhite, "paint"),
  part([0, 0.732, -0.295], [1.86, 0.085, 0.095], graphite, "metal"),
  part([-0.67, 0.414, -0.014], [0.46, 0.64, 0.69], "#d9d4c9", "paint"),
  part([-0.67, 0.067, -0.018], [0.37, 0.11, 0.61], graphite, "metal"),
  ...[0.287, 0.577].flatMap((y) => [
    part([-0.67, y, 0.343], [0.416, 0.255, 0.052], deskWhite, "paint"),
    part([-0.67, y + 0.077, 0.373], [0.133, 0.028, 0.025], graphite, "metal"),
  ]),
  ...[-0.29, 0.29].map((z) =>
    part([0.86, 0.381, z], [0.077, 0.776, 0.078], graphite, "metal", "bevel", { rz: 0.1 }),
  ),
  part([0.86, 0.106, 0], [0.075, 0.065, 0.67], graphite, "metal"),
  part([0.28, 0.865, 0.23], [0.94, 0.021, 0.31], "#585967", "fabric"),
  part([0.13, 0.89, 0.209], [0.58, 0.035, 0.18], "#c3c8c7", "plastic"),
  ...[0.157, 0.2, 0.243].map((z) =>
    part([0.13, 0.911, z], [0.51, 0.013, 0.021], "#515b65", "plastic", "box"),
  ),
  part([0.65, 0.904, 0.225], [0.106, 0.064, 0.152], graphite, "plastic", "coach"),
];

const monitorParts: AssetPart[] = [
  part([0.23, 0.875, -0.148], [0.39, 0.036, 0.225], graphite, "metal"),
  part([0.23, 0.998, -0.205], [0.085, 0.215, 0.073], graphite, "metal"),
  ...screen([0.23, 1.271, -0.224], 1.17, 0.478, "#334959"),
  part([0.72, 1.047, -0.176], [0.031, 0.011, 0.01], "#8bcaca", "plastic", "box"),
];

const towerParts: AssetPart[] = [
  part([-0.716, 0.868, -0.108], [0.296, 0.023, 0.388], graphite, "metal"),
  part([-0.716, 1.175, -0.12], [0.335, 0.596, 0.44], "#303745", "metal"),
  part([-0.716, 1.178, 0.109], [0.291, 0.541, 0.034], "#242a35", "plastic"),
  part([-0.529, 1.164, -0.133], [0.016, 0.503, 0.355], "#4c5564", "glass", "box"),
  part([-0.536, 1.328, -0.133], [0.025, 0.023, 0.265], "#70a8af", "plastic"),
  ...[1.03, 1.177, 1.324].flatMap((y, index) => [
    part([-0.716, y, 0.132], [0.134, 0.017, 0.134], "#46515e", "metal", "cylinder", {
      rx: Math.PI / 2,
    }),
    part(
      [-0.716, y, 0.146],
      [0.111, 0.111, 0.033],
      ["#77c5be", "#7f92e8", "#bb93df"][index]!,
      "plastic",
      "ring",
    ),
    part([-0.716, y, 0.151], [0.047, 0.012, 0.047], "#9aa4b6", "plastic", "cylinder", {
      rx: Math.PI / 2,
    }),
  ]),
  part([-0.716, 1.444, 0.106], [0.084, 0.016, 0.018], "#78b6c2", "plastic"),
];

const chairParts: AssetPart[] = [
  part([0, 0.27, 0], [0.091, 0.31, 0.091], graphite, "metal", "cylinder"),
  ...Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 5;
    const x = Math.sin(angle);
    const z = Math.cos(angle);
    return [
      part([x * 0.148, 0.125, z * 0.148], [0.06, 0.047, 0.31], graphite, "metal", "bevel", {
        ry: angle,
      }),
      part([x * 0.286, 0.08, z * 0.286], [0.062, 0.1, 0.065], graphite, "plastic"),
      part([x * 0.29, 0.054, z * 0.29], [0.108, 0.073, 0.108], "#242a31", "rubber", "cylinder", {
        rx: Math.PI / 2,
        ry: angle,
      }),
    ];
  }).flat(),
  part([0, 0.465, 0.016], [0.58, 0.09, 0.55], graphite, "plastic", "coach"),
  part([0, 0.521, 0.022], [0.55, 0.105, 0.52], deskWhite, "fabric", "coach"),
  part([0, 0.643, -0.265], [0.12, 0.27, 0.084], graphite, "metal", "bevel", { rx: -0.13 }),
  part([0, 0.757, -0.238], [0.52, 0.483, 0.09], "#e6ddd0", "plastic", "coach", { rx: -0.13 }),
  part([0, 0.771, -0.192], [0.49, 0.447, 0.099], deskWhite, "fabric", "coach", { rx: -0.13 }),
  ...[-1, 1].flatMap((side) => [
    part([side * 0.307, 0.608, -0.011], [0.049, 0.233, 0.051], graphite, "metal"),
    part([side * 0.307, 0.726, 0.015], [0.092, 0.052, 0.254], graphite, "plastic", "coach"),
  ]),
];

const carton = "#bd8a55";
const cartonEdge = "#d9a572";
const boxParts: AssetPart[] = [
  part([0, 0.03, 0], [0.75, 0.06, 0.69], carton, "cardboard", "box"),
  ...[-1, 1].flatMap((side) => [
    part([side * 0.35, 0.25, 0], [0.05, 0.46, 0.71], carton, "cardboard", "box"),
    part([0, 0.25, side * 0.33], [0.75, 0.46, 0.05], cartonEdge, "cardboard", "box"),
    part([side * 0.407, 0.512, 0], [0.12, 0.045, 0.71], cartonEdge, "cardboard", "box", {
      rz: side * 0.32,
    }),
  ]),
  part([0, 0.536, -0.336], [0.73, 0.158, 0.043], carton, "cardboard", "box", { rx: -0.62 }),
  part([0, 0.493, 0.337], [0.74, 0.04, 0.15], cartonEdge, "cardboard", "box", { rx: 0.32 }),
  part([-0.22, 0.25, -0.04], [0.24, 0.034, 0.31], ivory, "cardboard", "box", { ry: 0.19, rz: 0.2 }),
  part([0.112, 0.375, 0.055], [0.31, 0.073, 0.23], seaGlass, "fabric", "bevel", { ry: -0.32 }),
  part([0.112, 0.416, 0.055], [0.023, 0.016, 0.22], ivory, "fabric", "box", { ry: -0.32 }),
  part([0, 0.273, 0.363], [0.55, 0.148, 0.014], ivory, "cardboard", "bevel"),
];

export function HomeFurniture() {
  return (
    <group name="HomeFurniture">
      <group name="Kasur" position={[bedX, 0, bedZ]}>
        <StyledBatch items={bedParts} />
      </group>
      <group name="Lemari" position={HOME_WARDROBE.position}>
        <StyledBatch items={wardrobeParts} />
      </group>
      <group name="Nakas" position={nightstand}>
        <StyledBatch items={nightstandParts} />
      </group>
      <group name="Meja" position={desk} rotation-y={Math.PI / 2}>
        <StyledBatch items={deskParts} />
        <group name="Monitor desktop">
          <StyledBatch items={monitorParts} />
        </group>
        <group name="Casing PC">
          <StyledBatch items={towerParts} />
        </group>
      </group>
      <group name="Kursi meja" position={chair} rotation-y={-Math.PI / 2}>
        <StyledBatch items={chairParts} />
      </group>
      <group name="Meja TV" position={consoleTable} rotation-y={Math.PI / 2}>
        <StyledBatch items={mediaParts} />
      </group>
      <group name="Meja sofa" position={coffeeTable} rotation-y={Math.PI / 2}>
        <StyledBatch items={coffeeTableParts} />
      </group>
      <group name="Sofa" position={HOME_SOFA.position} rotation-y={HOME_SOFA.yaw}>
        <StyledBatch items={sofaParts} />
      </group>
      <group name="Kardus Barang Mbah" position={[boxX, 0, boxZ]} rotation-y={0.12}>
        <StyledBatch items={boxParts} />
        <Text position={[0, 0.273, 0.376]} fontSize={0.07} fontWeight={700} color="#62432c">
          Barang Mbah
        </Text>
      </group>
    </group>
  );
}
