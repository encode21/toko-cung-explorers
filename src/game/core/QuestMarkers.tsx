/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { useGameCore } from "./store";
/** Lightweight quest props. No collision, map, navigation, or player-root changes. */
export function QuestMarkers() {
  const snapshot = useGameCore((s) => s.snapshot);
  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  if (!quest || !run) return null;
  const index = quest.objectives.findIndex((o, i) => (run.progress[i] ?? 0) < o.required);
  const o = quest.objectives[index];
  if (!o || o.hidden || (quest.dungeon_id && o.realm !== "WORLD")) return null;
  return (
    <group position={[o.position[0], o.position[1], o.position[2]]}>
      {o.type === "TALK" && (
        <group>
          <mesh position={[0, 1, 0]}>
            <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
            <meshStandardMaterial color="#b58b52" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[0.24, 12, 8]} />
            <meshStandardMaterial color="#d5a984" />
          </mesh>
        </group>
      )}
      <mesh position={[0, 0.35, 0]}>
        <octahedronGeometry args={[0.22]} />
        <meshStandardMaterial color="#f6c453" emissive="#b97714" emissiveIntensity={0.3} />
      </mesh>
      <Text
        position={[0, 2.3, 0]}
        fontSize={0.22}
        color="#ffdf7d"
        outlineWidth={0.025}
        outlineColor="#203b35"
        maxWidth={4}
        textAlign="center"
      >
        {o.type === "FIND" ? "✦ Petunjuk" : o.type === "COLLECT" ? "Peti quest" : "! Quest"}{" "}
      </Text>
    </group>
  );
}
