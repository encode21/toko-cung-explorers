/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGang } from "@/game/gang/store";
import { eventPointWorld, loadTownEvents, useTownEvents } from "./store";

/** Yellow rings with the task label on every unfinished point of an accepted Kades / Wali Kota event. */
export function TownEventMarkers() {
  const events = useTownEvents((s) => s.events);
  useGang((s) => s.inside); // re-place markers when entering or leaving the gang
  const bob = useRef<Group>(null);
  // Events rotate every game day (48 real minutes); a light poll keeps the "!" and markers current.
  useEffect(() => {
    void loadTownEvents();
    const t = setInterval(() => void loadTownEvents(), 60_000);
    return () => clearInterval(t);
  }, []);
  useFrame(({ clock }) => {
    if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.05;
  });
  const marks = events
    .filter((e) => e.status === "active")
    .flatMap((e) =>
      e.event.points.flatMap((pt, i) => {
        const w = e.progress.includes(i) ? null : eventPointWorld(e, pt);
        return w ? [{ key: `${e.host}:${i}`, w, label: e.event.verb }] : [];
      }),
    );
  if (!marks.length) return null;
  return (
    <group ref={bob}>
      {marks.map((m) => (
        <group key={m.key} position={[m.w[0], 0.06, m.w[2]]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.7, 1, 32]} />
            <meshBasicMaterial color="#ffe14d" transparent opacity={0.85} />
          </mesh>
          <Billboard position={[0, 1.6, 0]} userData={{ ignoreCameraCollision: true }}>
            <Text fontSize={0.28} color="#fff6c8" outlineWidth={0.03} outlineColor="#3b2a07">
              {m.label}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
}
