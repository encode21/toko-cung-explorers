/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ArchitectureBatch } from "./ArchitectureBatch";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { Plang } from "./Plang";
import { CITY_HALL, CITY_HALL_TERRACE, cityHallArchitecture } from "./civic-layout";

const parts = cityHallArchitecture();
const courtyard: OutdoorPart[] = [-9, 9].flatMap((x) => [
  {
    p: [x, 0.3, -11] as [number, number, number],
    s: [3.2, 0.6, 2] as [number, number, number],
    color: "#aaa38e",
  },
  {
    p: [x, 0.65, -11] as [number, number, number],
    s: [2.9, 0.45, 1.7] as [number, number, number],
    color: "#4c6741",
  },
]);

/** Civic landmark beside Masjid Cung, with a public forecourt joined to the sidewalk. */
export function CityHall() {
  const { position, size } = CITY_HALL_TERRACE;
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={position}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
        <mesh receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color="#c2b9a8" roughness={0.95} />
        </mesh>
      </RigidBody>
      <group name="KantorWaliKota" position={[CITY_HALL.x, 0.06, CITY_HALL.z]}>
        <ArchitectureBatch items={parts.masonry} surface="masonry" />
        <ArchitectureBatch items={parts.trim} surface="trim" />
        <ArchitectureBatch items={parts.glazing} surface="glazing" />
        <OutdoorBatch items={courtyard} />
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[11, 4, 7]} position={[0, 4, 0]} />
          <CuboidCollider args={[8, 8, 5.5]} position={[0, 16, 1]} />
          <CuboidCollider args={[4, 1, 5.5]} position={[0, 25, 1]} />
          <CuboidCollider args={[11.35, 0.3, 1.9]} position={[0, 6.2, -7.6]} />
          {[-8, -4, 4, 8].map((x) => (
            <CuboidCollider key={x} args={[0.275, 3, 0.9]} position={[x, 3, -8.1]} />
          ))}
          {[-8, 8].map((x) => (
            <CuboidCollider
              key={`pavilion-${x}`}
              args={[2.1, 1.4, 2.1]}
              position={[x, 9.4, -3.6]}
            />
          ))}
          {[-9, 9].map((x) => (
            <CuboidCollider key={x} args={[1.6, 0.85 / 2, 1]} position={[x, 0.425, -11]} />
          ))}
          <CuboidCollider args={[0.12, 4, 0.12]} position={[-5.5, 4, -11]} />
        </RigidBody>
        {[-8, 8].map((x) => (
          <mesh
            key={x}
            position={[x, 11.7, -3.6]}
            rotation-y={Math.PI / 4}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[4.1, 1.8, 4]} />
            <meshStandardMaterial color="#713e36" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 26.8, 1]} rotation-y={Math.PI / 4} scale={[1, 1, 1.3]} castShadow>
          <coneGeometry args={[6, 1.6, 4]} />
          <meshStandardMaterial color="#815447" roughness={0.9} />
        </mesh>
        <Plang
          text="KANTOR WALI KOTA"
          sub="KOTA CUNG · PELAYANAN WARGA"
          position={[0, 7.2, -7.12]}
          rotationY={Math.PI}
          width={12}
          size={0.64}
          board="#b8a08c"
          textColor="#263f3e"
        />
        <mesh position={[-5.5, 4, -11]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, 8, 8]} />
          <meshStandardMaterial color="#bfc1b7" roughness={0.5} />
        </mesh>
        {(
          [
            [7.45, "#b82f31"],
            [6.85, "#f5eee1"],
          ] as const
        ).map(([y, color]) => (
          <mesh key={color} position={[-4.6, y, -11]} castShadow>
            <boxGeometry args={[1.8, 0.6, 0.035]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.01, -10.3]} receiveShadow>
          <boxGeometry args={[4, 0.02, 6.7]} />
          <meshStandardMaterial color="#a58f7b" roughness={0.96} />
        </mesh>
      </group>
    </>
  );
}
