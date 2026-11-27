/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useWorldGuidanceTarget } from "@/game/core/use-world-guidance";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { turnToward } from "@/game/npc/behavior";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { useGame } from "@/state/game-store";
import { useTownEvents } from "./store";
import { TownEventObjects } from "./TownEventObjects";
import { currentWeather } from "@/game/weather/store";
import { floodSurfaceAt } from "@/game/weather/flood-surface";

export function TownEventMarkers() {
  return (
    <>
      <TownEventObjects />
      <TownEventGuidance />
    </>
  );
}

/** Only the task currently followed by the ground arrow gets a yellow marker. */
function TownEventGuidance() {
  const events = useTownEvents((s) => s.events);
  const guidance = useWorldGuidanceTarget();
  const muted = useGame((s) => s.guidanceMuted);
  const bob = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (bob.current && guidance)
      bob.current.position.y =
        Math.max(
          0.05,
          floodSurfaceAt(guidance.position[0], guidance.position[2], currentWeather().flood) ?? 0,
        ) +
        Math.sin(clock.elapsedTime * 3) * 0.02;
  });
  const step = guidance?.townEvent;
  const event = events.find((e) => e.host === step?.host);
  if (muted || !guidance || !step || !event) return null;
  const marks = [
    {
      key: `${step.host}:${step.point}`,
      w: guidance.position,
      label: step.label,
      event: event.event.key,
      i: step.point,
    },
  ];
  return (
    <>
      {marks
        .filter((m) => m.i >= 0 && PEOPLE[m.event])
        .map((m) => (
          <PointResident
            key={`npc:${m.key}`}
            at={m.w}
            who={PEOPLE[m.event]![m.i % PEOPLE[m.event]!.length]!}
            id={m.key}
          />
        ))}
      <group name="TownEventTarget" ref={bob}>
        {marks.map((m) => (
          <group key={m.key} position={[m.w[0], 0.06, m.w[2]]}>
            <mesh rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.7, 1, 32]} />
              <meshBasicMaterial color="#ffe14d" transparent opacity={0.85} />
            </mesh>
            <Billboard
              position={[0, m.event === "ronda_malam" && m.i >= 0 ? 2.5 : 1.6, 0]}
              userData={{ ignoreCameraCollision: true }}
            >
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
