/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { DoubleSide, Shape } from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { CityBench } from "@/game/world/props/CityBench";
import { Plang } from "@/game/world/Plang";
import { FISHING_DECKS, FISHING_RAILS } from "./pier-layout";

const boards: OutdoorPart[] = FISHING_DECKS.flatMap((d) => {
  const count = Math.ceil(d.depth / 0.38);
  return Array.from({ length: count }, (_, i) => ({
    p: [d.x, 0.1, d.z - d.depth / 2 + ((i + 0.5) * d.depth) / count],
    s: [d.width, 0.2, d.depth / count - 0.018],
    color: ["#b8875b", "#c5966a", "#ad7d54"][i % 3]!,
  }));
});
const piles: OutdoorPart[] = [];
const ropes: OutdoorPart[] = [];
for (const [x0, z0, x1, z1] of FISHING_RAILS) {
  const length = Math.hypot(x1 - x0, z1 - z0);
  const count = Math.ceil(length / 3);
  for (let i = 0; i <= count; i++)
    piles.push({
      p: [x0 + ((x1 - x0) * i) / count, -1.5, z0 + ((z1 - z0) * i) / count],
      s: [0.24, 5.4, 0.24],
      color: "#6e4f3c",
    });
  for (const y of [0.6, 1.02])
    ropes.push({
      p: [(x0 + x1) / 2, y, (z0 + z1) / 2],
      s: [length, 0.045, 0.045],
      ry: -Math.atan2(z1 - z0, x1 - x0),
      color: "#dfcc9e",
    });
}
const sail = new Shape();
sail.moveTo(0, 0);
sail.lineTo(0, 5.3);
sail.lineTo(3.2, 0.3);
sail.closePath();

function Sailboat({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group name="MooredSailboat" position={[x, -1.1, z]}>
      <mesh scale={[1.25, 0.65, 3.3]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.4, 0]} scale={[1.1, 0.12, 2.8]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshStandardMaterial color="#e8d8b9" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.75, 0.75]} castShadow>
        <boxGeometry args={[1.4, 0.65, 1.7]} />
        <meshStandardMaterial color="#f4ead5" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.86, 1.61]}>
        <boxGeometry args={[1.1, 0.3, 0.025]} />
        <meshStandardMaterial color="#345766" roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.2, -0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.065, 6.2, 8]} />
        <meshStandardMaterial color="#796451" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.8, -0.45]} rotation-y={-Math.PI / 2} castShadow>
        <shapeGeometry args={[sail]} />
        <meshStandardMaterial color="#fff2d4" roughness={1} side={DoubleSide} />
      </mesh>
    </group>
  );
}

export function FishingPier() {
  return (
    <group name="CoastalFishingPier">
      <OutdoorBatch items={boards} />
      <OutdoorBatch items={piles} shape="round" />
      <OutdoorBatch items={ropes} shadows={false} />
      <RigidBody type="fixed" colliders={false}>
        {FISHING_DECKS.map((d) => (
          <CuboidCollider
            key={`${d.x}:${d.z}`}
            args={[d.width / 2, 0.1, d.depth / 2]}
            position={[d.x, 0.1, d.z]}
          />
        ))}
        {FISHING_RAILS.map(([x0, z0, x1, z1], i) => (
          <CuboidCollider
            key={i}
            args={[Math.hypot(x1 - x0, z1 - z0) / 2, 0.5, 0.08]}
            position={[(x0 + x1) / 2, 0.7, (z0 + z1) / 2]}
            rotation={[0, -Math.atan2(z1 - z0, x1 - x0), 0]}
          />
        ))}
      </RigidBody>
      <CityBench position={[-78, 0.2, -42]} yaw={Math.PI} />
      <CityBench position={[-68, 0.2, -42]} yaw={Math.PI} />
      {[-78, -66].map((x) => (
        <group key={x} position={[x, 0.7, -68.14]}>
          <mesh>
            <torusGeometry args={[0.31, 0.09, 8, 16]} />
            <meshStandardMaterial color="#ed8b43" roughness={0.85} />
          </mesh>
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => (
            <mesh key={a} rotation-z={a}>
              <torusGeometry args={[0.31, 0.095, 6, 4, 0.3]} />
              <meshStandardMaterial color="#fff1d4" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      <Sailboat x={-84} z={-61} color="#4a8f9d" />
      <Sailboat x={-60} z={-61} color="#b86449" />
      <Plang
        mode="post"
        text="DERMAGA CUNG"
        sub="MEMANCING · DI UJUNG DERMAGA"
        position={[-67, 0.2, -50.5]}
        size={0.36}
        board="#27616b"
        textColor="#fff1d4"
        twoSided
      />
    </group>
  );
}
