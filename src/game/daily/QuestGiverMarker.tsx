/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useDaily } from "./store";
import { dailyMarker } from "./types";
export function QuestGiverMarker() {
  const data = useDaily((s) => s.data);
  if (!data) return null;
  const marker = dailyMarker(data);
  return (
    <Billboard position={[0, 2.35, 0]} userData={{ ignoreCameraCollision: true }}>
      {marker && (
        <Text
          fontSize={0.3}
          color={marker === "✓" ? "#a8dfab" : "#ffdc83"}
          outlineColor="#35251c"
          outlineWidth={0.025}
        >
          {marker}
        </Text>
      )}
      {!data.introduced && (
        <Text
          position={[0, 0.3, 0]}
          fontSize={0.12}
          color="#ffdc83"
          outlineColor="#35251c"
          outlineWidth={0.012}
        >
          Daily Quest
        </Text>
      )}
    </Billboard>
  );
}
