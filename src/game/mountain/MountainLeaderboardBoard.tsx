/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useSummitLeaderboard } from "./leaderboard";
import { MOUNTAIN_CHECKPOINT_COUNT, MOUNTAIN_NAME, mountainWorldPoint } from "./model";

/** All names and totals come from the authenticated account service. */
export function MountainLeaderboardBoard() {
  const { entries, ownSummits, loaded, loading, error } = useSummitLeaderboard();
  const note =
    error ??
    (loading || !loaded
      ? "Menghubungkan catatan summit…"
      : "Belum ada pendaki yang mencapai puncak.\nJadilah yang pertama!");
  return (
    <group position={mountainWorldPoint([376, 8, 55])} name="MountainLeaderboardBoard">
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4.4, 3.4, 0.28]} position={[0, 3.4, 0]} />
        {[-4.25, 4.25].map((x) => (
          <mesh key={x} position={[x, 3.3, 0]} castShadow>
            <boxGeometry args={[0.32, 6.6, 0.4]} />
            <meshStandardMaterial color="#533820" roughness={0.95} />
          </mesh>
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[0, 1.1 + i * 0.62, 0]} castShadow receiveShadow>
            <boxGeometry args={[8.5, 0.6, 0.28]} />
            <meshStandardMaterial color={i % 2 ? "#7c5734" : "#89613b"} roughness={0.95} />
          </mesh>
        ))}
        {[0.7, 6.48].map((y) => (
          <mesh key={y} position={[0, y, 0.05]} castShadow>
            <boxGeometry args={[9, 0.3, 0.42]} />
            <meshStandardMaterial color="#4c3322" roughness={0.95} />
          </mesh>
        ))}
      </RigidBody>
      <Text position={[0, 6.02, 0.2]} fontSize={0.43} color="#fff4d4" anchorX="center" maxWidth={8}>
        LEADERBOARD SUMMIT
      </Text>
      <Text position={[-3.75, 5.5, 0.2]} fontSize={0.22} color="#f1cf86" anchorX="left">
        PENDAKI
      </Text>
      <Text position={[3.75, 5.5, 0.2]} fontSize={0.22} color="#f1cf86" anchorX="right">
        SUMMIT
      </Text>
      {entries.slice(0, 10).map((entry, i) => (
        <group key={entry.playerId} position={[0, 5.05 - i * 0.4, 0.2]}>
          <Text
            position={[-3.75, 0, 0]}
            fontSize={0.28}
            color={i < 3 ? "#ffe190" : "#fff4d4"}
            anchorX="left"
            maxWidth={6.3}
            whiteSpace="nowrap"
            overflowWrap="normal"
          >
            {`#${entry.rank}  ${entry.name}`}
          </Text>
          <Text position={[3.75, 0, 0]} fontSize={0.28} color="#ffe190" anchorX="right">
            {entry.summits.toLocaleString("id-ID")}
          </Text>
        </group>
      ))}
      {!entries.length && (
        <Text
          position={[0, 3.4, 0.2]}
          fontSize={0.3}
          color="#fff4d4"
          maxWidth={7.3}
          textAlign="center"
          lineHeight={1.5}
        >
          {note}
        </Text>
      )}
      <Text
        position={[0, 1.05, 0.23]}
        fontSize={0.22}
        color="#f1cf86"
        maxWidth={8}
        textAlign="center"
      >
        {loaded
          ? `Summit kamu: ${ownSummits.toLocaleString("id-ID")}${error ? " · Menunggu koneksi" : " · Catatan semua pendaki"}`
          : `Capai ${MOUNTAIN_CHECKPOINT_COUNT} pos, lalu puncak ${MOUNTAIN_NAME}`}
      </Text>
    </group>
  );
}
