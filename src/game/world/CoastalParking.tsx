/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { Plang } from "./Plang";
import { PARKING_BAYS } from "./civic-layout";

const paint: OutdoorPart[] = [
  ...[90, 94, 98, 102, 106, 110, 114].map((z) => ({
    p: [87.3, 0.061, z] as [number, number, number],
    s: [6.2, 0.025, 0.12] as [number, number, number],
    color: "#eee7cc",
  })),
  { p: [90.3, 0.061, 102], s: [0.12, 0.025, 24], color: "#eee7cc" },
  ...[94, 102, 110].flatMap((z): OutdoorPart[] => [
    { p: [80.5, 0.061, z], s: [0.15, 0.025, 1.7], color: "#eee7cc" },
    { p: [80.15, 0.061, z + 0.6], s: [0.15, 0.025, 0.9], ry: -Math.PI / 4, color: "#eee7cc" },
    { p: [80.85, 0.061, z + 0.6], s: [0.15, 0.025, 0.9], ry: Math.PI / 4, color: "#eee7cc" },
  ]),
];
const stops: OutdoorPart[] = PARKING_BAYS.map(({ z }) => ({
  p: [90, 0.1495, z],
  s: [0.22, 0.2, 2.2],
  color: "#c6b985",
}));
const border: OutdoorPart[] = [
  { p: [90.7, 0.1695, 102], s: [0.2, 0.24, 26], color: "#b0ada0" },
  ...[89.1, 114.9].map((z) => ({
    p: [83.6, 0.1695, z] as [number, number, number],
    s: [14.2, 0.24, 0.2] as [number, number, number],
    color: "#b0ada0",
  })),
];
export function CoastalParking() {
  return (
    <group name="ParkiranTamanPantai">
      <OutdoorBatch items={paint} shadows={false} />
      <OutdoorBatch items={[...stops, ...border]} />
      <RigidBody type="fixed" colliders={false}>
        {[...stops, ...border].map((p, i) => (
          <CuboidCollider key={i} position={p.p} args={[p.s[0] / 2, p.s[1] / 2, p.s[2] / 2]} />
        ))}
      </RigidBody>
      <Plang
        text="P · TAMAN PANTAI"
        sub="PARKIR KENDARAAN PRIBADI"
        position={[77.8, 0.0495, 96]}
        rotationY={-Math.PI / 2}
        mode="post"
        size={0.3}
        width={3.6}
        board="#255766"
        withCollider
      />
      <Plang
        text="MASUK →"
        position={[77.5, 0.0495, 89.5]}
        rotationY={-Math.PI / 2}
        mode="post"
        size={0.2}
        board="#255766"
      />
      <Plang
        text="KELUAR"
        position={[77.5, 0.0495, 114.4]}
        rotationY={Math.PI / 2}
        mode="post"
        size={0.2}
        board="#255766"
      />
    </group>
  );
}
