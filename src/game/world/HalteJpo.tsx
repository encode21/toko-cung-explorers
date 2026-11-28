/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Halte } from "@/game/gang/Halte";
import { Plang } from "./Plang";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { HALTE, JPO, MARKET_HALTE } from "./halte-jpo";

type V3 = [number, number, number];
/** Every box of the JPO and halte goes into one instanced batch (was ~64 draw calls). */
const Box = (p: V3, s: V3, color: string, rz = 0): OutdoorPart => ({ p, s, color, rz });

const RED = "#b8473d";
const STEEL = "#c9cdd1";
const H = JPO.height;
const SLOPE = Math.atan(H / JPO.run);
const RAMP = Math.hypot(JPO.run, H);
const STEPS = 18;

/**
 * One stair flight along x on a sidewalk: visible treads, a smooth tilted ramp collider underneath
 * (capsules don't snag on risers, same as the club stairs) and side rails. dir +1 = descends toward +x.
 */
function stairParts(fromX: number, z: number, dir: 1 | -1) {
  const midX = fromX + (dir * JPO.run) / 2;
  return [
    ...Array.from({ length: STEPS }, (_, i) => {
      const t = (i + 0.5) / STEPS;
      return Box(
        [fromX + dir * t * JPO.run, H * (1 - t) - 0.06, z],
        [JPO.run / STEPS + 0.02, 0.12, JPO.width],
        "#8e8f8c",
      );
    }),
    ...[-1, 1].map((side) =>
      Box([midX, H / 2 + 0.55, z + side * (JPO.width / 2)], [RAMP, 0.08, 0.08], RED, -dir * SLOPE),
    ),
  ];
}
function Stairs({ fromX, z, dir }: { fromX: number; z: number; dir: 1 | -1 }) {
  const midX = fromX + (dir * JPO.run) / 2;
  const rz = -dir * SLOPE;
  return (
    <group>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[midX, H / 2 - 0.06, z]}
        rotation={[0, 0, rz]}
      >
        <CuboidCollider args={[RAMP / 2, 0.06, JPO.width / 2]} />
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={side}
            args={[RAMP / 2, 0.6, 0.05]}
            position={[0, 0.6, side * (JPO.width / 2)]}
          />
        ))}
      </RigidBody>
    </group>
  );
}

const deckLen = JPO.northZ - JPO.southZ + JPO.width;
const deckZ = (JPO.southZ + JPO.northZ) / 2;
// Leave the south-east and north-west landings open where the stairs meet the deck.
const railLen = deckLen - JPO.width;
const halte = (p: V3, s: V3, color: string) =>
  Box([HALTE.x + p[0], p[1], HALTE.z + p[2]], s, color);
const PARTS: OutdoorPart[] = [
  // JPO deck, railings, roof and pillars
  Box([JPO.x, H - 0.15, deckZ], [JPO.width, 0.3, deckLen], "#8e8f8c"),
  ...[-1, 1].flatMap((side) => [
    Box(
      [JPO.x + side * (JPO.width / 2), H + 0.55, deckZ + side * (JPO.width / 2)],
      [0.08, 1.1, railLen],
      RED,
    ),
    Box([JPO.x + side * (JPO.width / 2), H + 2.4, deckZ], [0.12, 0.12, deckLen], RED),
  ]),
  Box([JPO.x, H + 2.55, deckZ], [JPO.width + 0.6, 0.08, deckLen], STEEL),
  ...[JPO.southZ, 20, JPO.northZ].flatMap((z) =>
    [-1, 1].map((side) => Box([JPO.x + side * 0.8, H / 2 - 0.15, z], [0.35, H - 0.3, 0.35], RED)),
  ),
  ...stairParts(JPO.x + JPO.width / 2, JPO.southZ, 1),
  ...stairParts(JPO.x - JPO.width / 2, JPO.northZ, -1),
  // Halte: raised platform, blue roof, glass back wall, bench, gate (tap to pay Rp3.500)
  halte([0, 0.08, 0], [HALTE.width, 0.16, HALTE.depth], "#d9d4c7"),
  halte([0, 3.05, 0], [HALTE.width + 0.6, 0.2, HALTE.depth + 0.6], "#2c5d8a"),
  halte([0, 2.85, 0], [HALTE.width + 0.4, 0.2, HALTE.depth + 0.4], "#e9eef2"),
  ...[-HALTE.width / 2, -HALTE.width / 6, HALTE.width / 6, HALTE.width / 2].map((x) =>
    halte([x, 1.5, HALTE.depth / 2 - 0.1], [0.14, 2.8, 0.14], STEEL),
  ),
  halte([0, 1.4, HALTE.depth / 2 - 0.1], [HALTE.width, 1.8, 0.06], "#a9cfe3"),
  halte([-2.5, 0.45, HALTE.depth / 2 - 0.45], [3, 0.12, 0.5], "#7a5232"),
  halte([2.6, 0.55, -0.6], [0.4, 0.9, 0.3], "#3a3f45"),
  halte([2.6, 1.05, -0.6], [0.3, 0.12, 0.25], "#39b26b"),
];

/** Halte Toko Cung + JPO over 4-lane Jalan Utama (see halte-jpo.ts for the layout). */
export function HalteJpo() {
  return (
    <group name="HalteJpo">
      <Halte position={[MARKET_HALTE.x, 0, MARKET_HALTE.z]} label="HALTE PASAR · Bus Rp3.500" />
      <OutdoorBatch items={PARTS} />
      <Plang
        mode="wall"
        text="JPO TOKO CUNG"
        sub="Jalur pejalan kaki"
        position={[JPO.x + JPO.width / 2 + 0.06, H + 1.6, deckZ]}
        rotationY={Math.PI / 2}
        size={0.3}
        board="#2c5d8a"
        twoSided
      />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[JPO.width / 2, 0.15, deckLen / 2]}
          position={[JPO.x, H - 0.15, deckZ]}
        />
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={side}
            args={[0.05, 0.7, railLen / 2]}
            position={[JPO.x + side * (JPO.width / 2), H + 0.7, deckZ + side * (JPO.width / 2)]}
          />
        ))}
        {[JPO.southZ, 20, JPO.northZ].map((z) => (
          <CuboidCollider
            key={z}
            args={[1, (H - 0.3) / 2, 0.2]}
            position={[JPO.x, (H - 0.3) / 2, z]}
          />
        ))}
      </RigidBody>
      <Stairs fromX={JPO.x + JPO.width / 2} z={JPO.southZ} dir={1} />
      <Stairs fromX={JPO.x - JPO.width / 2} z={JPO.northZ} dir={-1} />

      {/* Halte sign and back-wall collider (its boxes are in PARTS) */}
      <group position={[HALTE.x, 0, HALTE.z]}>
        <Plang
          mode="wall"
          text="HALTE TOKO CUNG"
          sub="TransCung · Rp3.500"
          position={[0, 3.45, -HALTE.depth / 2 - 0.32]}
          rotationY={Math.PI}
          size={0.34}
          board="#2c5d8a"
          twoSided
        />
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[HALTE.width / 2, 0.9, 0.05]}
            position={[0, 0.9, HALTE.depth / 2 - 0.1]}
          />
        </RigidBody>
      </group>
    </group>
  );
}
