/** @jsxImportSource @/game/jsx */
import { useEffect } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useChannels } from "@/net/channel-store";
import { rupiahShort } from "./model";
import { loadLeaderboard, useWarung } from "./store";

// North edge of Alun-alun Cung, between the two minigame arenas, facing the square (+z).
const LEADERBOARD_POSITION: [number, number, number] = [104, 0, 24.5];
const POLL_MS = 60_000;
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
): AssetPart => ({
  p,
  s,
  color,
  shape: "bevel",
  finish: "wood",
});
const FRAME: AssetPart[] = [
  part([-3.1, 2, 0], [0.25, 4, 0.25], "#7a4b2a"),
  part([3.1, 2, 0], [0.25, 4, 0.25], "#7a4b2a"),
  part([0, 2.55, 0], [6, 3.2, 0.14], "#fffaf0"),
  part([0, 4.35, 0], [6.6, 0.55, 0.3], "#ff9a3d"),
  part([0, 0.95, 0], [6, 0.12, 0.2], "#7a4b2a"),
];
const MEDAL = ["#f2b705", "#b8c2cc", "#cd7f32"];

/** Papan Juara Warung: weekly omzet (NPC + player) top 5 for everyone in the city. */
export function LeaderboardBoard() {
  const room = useChannels((s) => s.lease?.channel);
  const board = useWarung((s) => s.leaderboard);
  useEffect(() => {
    if (!room?.startsWith("CHANNEL-")) return;
    void loadLeaderboard();
    const t = setInterval(() => void loadLeaderboard(), POLL_MS);
    return () => clearInterval(t);
  }, [room]);
  const top = board?.top.slice(0, 5) ?? [];
  return (
    <group position={LEADERBOARD_POSITION}>
      <StyledBatch items={FRAME} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[3.2, 2.2, 0.2]} position={[0, 2.2, 0]} />
      </RigidBody>
      <Text
        position={[0, 4.36, 0.17]}
        fontSize={0.32}
        color="#ffffff"
        outlineWidth={0.015}
        outlineColor="#8a3d00"
      >
        PAPAN JUARA WARUNG
      </Text>
      <Text position={[0, 3.85, 0.09]} fontSize={0.17} color="#8c6c52">
        Omzet minggu ini · pembeli NPC + pemain
      </Text>
      {top.length === 0 ? (
        <Text
          position={[0, 2.6, 0.09]}
          fontSize={0.22}
          color="#8c6c52"
          maxWidth={5.4}
          textAlign="center"
        >
          Belum ada penjualan minggu ini. Buka warungmu lewat HP → Warungku!
        </Text>
      ) : (
        top.map((r, i) => (
          <group key={r.id} position={[0, 3.4 - i * 0.5, 0.09]}>
            <Text
              position={[-2.7, 0, 0]}
              fontSize={0.26}
              color={MEDAL[i] ?? "#6b4a33"}
              anchorX="left"
            >
              {String(r.rank)}
            </Text>
            <Text
              position={[-2.35, 0.06, 0]}
              fontSize={0.21}
              color="#6b4a33"
              anchorX="left"
              maxWidth={3}
            >
              {r.name}
            </Text>
            <Text position={[-2.35, -0.15, 0]} fontSize={0.13} color="#9a7b62" anchorX="left">
              {`${r.ownerName ?? "Pemain"} · NPC ${rupiahShort(r.npc)} · Pemain ${rupiahShort(r.player)}`}
            </Text>
            <Text position={[2.75, 0, 0]} fontSize={0.24} color="#b4541a" anchorX="right">
              {rupiahShort(r.total)}
            </Text>
          </group>
        ))
      )}
    </group>
  );
}
