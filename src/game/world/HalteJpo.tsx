/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Halte } from "@/game/gang/Halte";
import { Plang } from "./Plang";
import { HALTE, JPO, MARKET_HALTE } from "./halte-jpo";

type V3 = [number, number, number];
function Box({ p, s, color, rz = 0 }: { p: V3; s: V3; color: string; rz?: number }) {
  return (
    <mesh position={p} rotation-z={rz} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

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
function Stairs({ fromX, z, dir }: { fromX: number; z: number; dir: 1 | -1 }) {
  const midX = fromX + (dir * JPO.run) / 2;
  const rz = -dir * SLOPE;
  return (
    <group>
      {Array.from({ length: STEPS }, (_, i) => {
        const t = (i + 0.5) / STEPS;
        return (
          <Box
            key={i}
            p={[fromX + dir * t * JPO.run, H * (1 - t) - 0.06, z]}
            s={[JPO.run / STEPS + 0.02, 0.12, JPO.width]}
            color="#8e8f8c"
          />
        );
      })}
      {[-1, 1].map((side) => (
        <Box
          key={side}
          p={[midX, H / 2 + 0.55, z + side * (JPO.width / 2)]}
          s={[RAMP, 0.08, 0.08]}
          color={RED}
          rz={rz}
        />
      ))}
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

/** Halte Toko Cung + JPO over 4-lane Jalan Utama (see halte-jpo.ts for the layout). */
export function HalteJpo() {
  const deckLen = JPO.northZ - JPO.southZ + JPO.width;
  const deckZ = (JPO.southZ + JPO.northZ) / 2;
  // Leave the south-east and north-west landings open where the stairs meet the deck.
  const railLen = deckLen - JPO.width;
  return (
    <group name="HalteJpo">
      <Halte position={[MARKET_HALTE.x, 0, MARKET_HALTE.z]} label="HALTE PASAR · Bus Rp3.500" />
      {/* JPO deck, railings, roof and pillars */}
      <Box p={[JPO.x, H - 0.15, deckZ]} s={[JPO.width, 0.3, deckLen]} color="#8e8f8c" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            p={[JPO.x + side * (JPO.width / 2), H + 0.55, deckZ + side * (JPO.width / 2)]}
            s={[0.08, 1.1, railLen]}
            color={RED}
          />
          <Box
            p={[JPO.x + side * (JPO.width / 2), H + 2.4, deckZ]}
            s={[0.12, 0.12, deckLen]}
            color={RED}
          />
        </group>
      ))}
      <Box p={[JPO.x, H + 2.55, deckZ]} s={[JPO.width + 0.6, 0.08, deckLen]} color={STEEL} />
      {[JPO.southZ, 20, JPO.northZ].map((z) =>
        [-1, 1].map((side) => (
          <Box
            key={`${z}:${side}`}
            p={[JPO.x + side * 0.8, H / 2 - 0.15, z]}
            s={[0.35, H - 0.3, 0.35]}
            color={RED}
          />
        )),
      )}
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

      {/* Halte: raised platform, blue roof, glass back wall, gate, sign */}
      <group position={[HALTE.x, 0, HALTE.z]}>
        <Box p={[0, 0.08, 0]} s={[HALTE.width, 0.16, HALTE.depth]} color="#d9d4c7" />
        <Box p={[0, 3.05, 0]} s={[HALTE.width + 0.6, 0.2, HALTE.depth + 0.6]} color="#2c5d8a" />
        <Box p={[0, 2.85, 0]} s={[HALTE.width + 0.4, 0.2, HALTE.depth + 0.4]} color="#e9eef2" />
        {[-HALTE.width / 2, -HALTE.width / 6, HALTE.width / 6, HALTE.width / 2].map((x) => (
          <Box key={x} p={[x, 1.5, HALTE.depth / 2 - 0.1]} s={[0.14, 2.8, 0.14]} color={STEEL} />
        ))}
        <Box p={[0, 1.4, HALTE.depth / 2 - 0.1]} s={[HALTE.width, 1.8, 0.06]} color="#a9cfe3" />
        <Box p={[-2.5, 0.45, HALTE.depth / 2 - 0.45]} s={[3, 0.12, 0.5]} color="#7a5232" />
        {/* Gate: tap to pay Rp3.500 */}
        <Box p={[2.6, 0.55, -0.6]} s={[0.4, 0.9, 0.3]} color="#3a3f45" />
        <Box p={[2.6, 1.05, -0.6]} s={[0.3, 0.12, 0.25]} color="#39b26b" />
        <Plang
          mode="wall"
          text="HALTE TOKO CUNG"
          sub="Bus Kota · Rp3.500"
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
