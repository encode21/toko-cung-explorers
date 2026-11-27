/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { useSceneTime } from "@/game/time/scene-time";
import { useGang } from "@/game/gang/store";
import type { DanceState } from "@/game/club/model";
import { eventOpen } from "./model";
import { useTownEvents } from "./store";

const dance: DanceState = { id: "step", startedAt: 0, groupId: "senam-pagi" };
/** The instructor demonstrates throughout the morning slot, even before a player accepts. */
export function MorningExerciseInstructor() {
  const event = useTownEvents((s) => s.events.find((e) => e.host === "walikota"));
  const hour = useSceneTime((s) => s.hour);
  const gang = useGang((s) => s.inside);
  if (gang || event?.event.key !== "senam_pagi" || !eventOpen(event.event.hours, hour)) return null;
  const [x, z] = event.event.points[0]!;
  return (
    <group name="InstrukturSenam" position={[x, 0.06, z - 3]}>
      <LodAvatar lodId="town-senam-instructor" avatarId="npc-pedestrian-2" dance={dance} />
      <Billboard position={[0, 2.1, 0]} userData={{ ignoreCameraCollision: true }}>
        <Text fontSize={0.2} color="#fff0d6" outlineWidth={0.02} outlineColor="#553c30">
          Instruktur Senam
        </Text>
      </Billboard>
    </group>
  );
}
