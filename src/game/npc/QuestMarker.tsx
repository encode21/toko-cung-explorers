/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useDaily } from "@/game/daily/store";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";
import { dayKey, questMarkerState, type QuestMarkerState } from "./quest-marker";

export function useQuestMarkerState(): QuestMarkerState {
  const data = useDaily((s) => s.data);
  const skippedOn = useQuestGiverDialogue((s) => s.skippedOn);
  return questMarkerState({
    available: !!data?.quests.some((q) => q.status === "AVAILABLE"),
    hasQuests: !!data?.quests.length,
    skippedOn,
    today: dayKey(),
  });
}

/** Bobbing glowing "!" while a quest is on offer; grey "…" once taken or skipped. */
export function QuestMarker({ height = 2.55 }: { height?: number }) {
  const state = useQuestMarkerState();
  const bob = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 2.4) * 0.07;
  });
  if (state === "none") return null;
  const hot = state === "available";
  return (
    <Billboard position={[0, height, 0]} userData={{ ignoreCameraCollision: true }}>
      <group ref={bob}>
        {hot && (
          <mesh>
            <circleGeometry args={[0.3, 20]} />
            <meshBasicMaterial color="#ffd54a" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        )}
        <Text
          fontSize={hot ? 0.5 : 0.3}
          color={hot ? "#ffd54a" : "#aeb4bc"}
          outlineColor="#35251c"
          outlineWidth={0.04}
        >
          {hot ? "!" : "…"}
        </Text>
      </group>
    </Billboard>
  );
}

/** Black peci cap; the avatar catalog has none. */
export function Peci() {
  return (
    <mesh position={[0, 1.67, 0]}>
      <cylinderGeometry args={[0.15, 0.16, 0.11, 14]} />
      <meshStandardMaterial color="#1c1917" roughness={0.85} />
    </mesh>
  );
}
