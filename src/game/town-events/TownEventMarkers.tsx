/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGang } from "@/game/gang/store";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { turnToward } from "@/game/npc/behavior";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { useGame } from "@/state/game-store";
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
        return w ? [{ key: `${e.host}:${i}`, w, label: e.event.verb, event: e.event.key, i }] : [];
      }),
    );
  if (!marks.length) return null;
  return (
    <>
      {marks
        .filter((m) => PEOPLE[m.event])
        .map((m) => (
          <PointResident
            key={`npc:${m.key}`}
            at={m.w}
            who={PEOPLE[m.event]![m.i % PEOPLE[m.event]!.length]!}
            id={m.key}
          />
        ))}
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
    </>
  );
}

/** Door-to-door events get a person waiting at each spot: the one receiving the invite, dues, order. */
const RESIDENTS = [
  { name: "Bu Lastri", avatar: "npc-shopper-1" },
  { name: "Pak Darsono", avatar: "npc-pedestrian-2" },
  { name: "Teh Imas", avatar: "npc-hijab-a" },
  { name: "Mas Gilang", avatar: "npc-shopper-2" },
];
const PEOPLE: Record<string, { name: string; avatar: string }[]> = {
  antar_undangan: RESIDENTS,
  iuran_sampah: RESIDENTS,
  antar_gorengan: [
    { name: "Bu Arisan", avatar: "npc-shopper-3" },
    { name: "Pak Satpam Ruko", avatar: "npc-pedestrian-1" },
    { name: "Mbak Kantoran", avatar: "npc-shopper-1" },
  ],
  antar_parsel_buah: [
    { name: "Keluarga Hajatan", avatar: "npc-hijab-b" },
    { name: "Pak Haji Somad", avatar: "npc-pedestrian-2" },
    { name: "Bu Ningsih", avatar: "npc-shopper-3" },
  ],
};

function PointResident({
  at,
  who,
  id,
}: {
  at: [number, number, number];
  who: { name: string; avatar: string };
  id: string;
}) {
  const root = useRef<Group>(null);
  const animation = useRef<AvatarAnimation | undefined>("Idle");
  const speed = useRef(0);
  // Stands just past the ring and turns to whoever walks up.
  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const p = useGame.getState().playerPos;
    const near = Math.hypot(p[0] - at[0], p[2] - at[2]) < 6;
    animation.current = near ? "Wave" : "Idle";
    g.rotation.y = turnToward(
      g.rotation.y,
      Math.atan2(p[0] - g.position.x, p[2] - g.position.z),
      dt,
    );
  });
  return (
    <group ref={root} position={[at[0] + 1.3, 0, at[2]]}>
      <LodAvatar lodId={`event:${id}`} avatarId={who.avatar} animation={animation} speed={speed} />
      <Billboard position={[0, 2.25, 0]} userData={{ ignoreCameraCollision: true }}>
        <Text fontSize={0.22} color="#fff" outlineWidth={0.025} outlineColor="#1f2a33">
          {who.name}
        </Text>
      </Billboard>
    </group>
  );
}
