/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGang } from "@/game/gang/store";
import { useSceneTime } from "@/game/time/scene-time";
import { currentWeather } from "@/game/weather/store";
import { floodSurfaceAt } from "@/game/weather/flood-surface";
import { ROAD_STYLE } from "@/game/world/road-surfaces";
import { liveEvents } from "./model";
import { eventPointWorld, useTownEvents } from "./store";

/** Physical task objects remain visible when guidance is muted; completed points disappear. */
export function TownEventObjects() {
  const events = useTownEvents((s) => s.events);
  const hour = useSceneTime((s) => s.hour);
  useGang((s) => s.inside);
  useGang((s) => s.data?.layout);
  return liveEvents(events, hour).flatMap((e) => {
    const trash = e.event.key === "bersih_gang" || e.event.key === "bersih_kota";
    if (!trash && e.event.key !== "ronda_malam") return [];
    return e.event.points.flatMap((point, i) => {
      const at = eventPointWorld(e, point);
      return at && !e.progress.includes(i)
        ? [<TaskObject key={`${e.host}:${i}`} id={`${e.host}:${i}`} at={at} trash={trash} />]
        : [];
    });
  });
}

function TaskObject({
  id,
  at,
  trash,
}: {
  id: string;
  at: [number, number, number];
  trash: boolean;
}) {
  const root = useRef<Group>(null);
  useFrame(() => {
    if (root.current)
      root.current.position.y = trash
        ? Math.max(
            ROAD_STYLE.sidewalkY,
            floodSurfaceAt(at[0], at[2], currentWeather().flood) ?? 0,
          ) + 0.02
        : ROAD_STYLE.sidewalkY;
  });
  return (
    <group
      ref={root}
      name={`TownEventObject:${id}`}
      position={[at[0], ROAD_STYLE.sidewalkY + 0.02, at[2]]}
    >
      {trash ? <Trash /> : <Kentongan />}
    </group>
  );
}

function Trash() {
  return (
    <group name="TownEventTrash">
      <mesh position={[-0.25, 0.24, 0.02]} scale={[0.36, 0.3, 0.3]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4a5860" roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, 0.52, 0.02]} castShadow>
        <coneGeometry args={[0.12, 0.18, 5]} />
        <meshStandardMaterial color="#57676d" roughness={0.9} />
      </mesh>
      <group position={[0.26, 0.15, -0.12]} rotation={[0, 0.45, Math.PI / 2 - 0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.48, 8]} />
          <meshStandardMaterial color="#b8dfd7" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.1, 8]} />
          <meshStandardMaterial color="#24858c" roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[0.25, 0.13, 0.3]} rotation={[0.3, 0, 0.7]} scale={[1, 0.7, 1]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.3, 8]} />
        <meshStandardMaterial color="#dc7654" roughness={0.7} />
      </mesh>
      <mesh position={[-0.22, 0.08, 0.43]} scale={[0.21, 0.08, 0.18]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#eee1bd" roughness={1} />
      </mesh>
    </group>
  );
}

function Kentongan() {
  return (
    <group name="TownEventKentongan">
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 1.05, 0]} castShadow>
          <boxGeometry args={[0.12, 2.1, 0.14]} />
          <meshStandardMaterial color="#775437" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[1.55, 0.14, 0.18]} />
        <meshStandardMaterial color="#775437" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.83, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
        <meshStandardMaterial color="#c1a879" roughness={1} />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.26, 1.15, 12]} />
        <meshStandardMaterial color="#bc8b43" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.12, 0.243]}>
        <boxGeometry args={[0.075, 0.8, 0.018]} />
        <meshStandardMaterial color="#3e2c20" roughness={1} />
      </mesh>
      {[0.64, 1.59].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.265, 0.265, 0.045, 12]} />
          <meshStandardMaterial color="#79552d" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0.48, 1.14, 0.18]} rotation-z={-0.3} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.65, 8]} />
        <meshStandardMaterial color="#dcc08b" roughness={0.85} />
      </mesh>
    </group>
  );
}
