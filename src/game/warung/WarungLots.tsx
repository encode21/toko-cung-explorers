/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useChannels } from "@/net/channel-store";
import { LEVEL_LOOK, type LotCard } from "./model";
import { WARUNG_LOTS } from "./lots";
import { loadLots, useWarung } from "./store";

const POLL_MS = 30_000;
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
): AssetPart => ({ p, s, color, shape: "bevel", finish: "paint" });

/** Storefront added in front of a house; grows from a gerobak (level 1) to a full shop front. */
function storefront(card: LotCard, width: number, front: number): AssetPart[] {
  const look = LEVEL_LOOK[Math.min(card.level, 5) - 1]!;
  if (card.level === 1)
    return [
      part([-width * 0.18, 0.75, front + 1.3], [1.7, 0.8, 0.8], "#b9824f"),
      part([-width * 0.18, 1.2, front + 1.3], [1.8, 0.08, 0.9], "#e8d3ad"),
      part([-width * 0.18 - 0.8, 1.6, front + 1.3], [0.08, 0.9, 0.08], "#6b4a33"),
      part([-width * 0.18 + 0.8, 1.6, front + 1.3], [0.08, 0.9, 0.08], "#6b4a33"),
      part([-width * 0.18, 2.08, front + 1.3], [2, 0.12, 1.1], look.awning),
      part([-width * 0.18 - 0.6, 0.3, front + 1.3], [0.5, 0.5, 0.9], "#3d3d3d"),
      part([-width * 0.18 + 0.6, 0.3, front + 1.3], [0.5, 0.5, 0.9], "#3d3d3d"),
    ];
  const span = Math.min(width - 1, 3 + card.level * 1.2);
  return [
    part([0, 2.45, front + 0.65], [span + 0.4, 0.14, 1.4], look.awning),
    part([0, 2.62, front + 0.12], [span + 0.4, 0.3, 0.12], look.awning),
    part([0, 0.5, front + 0.9], [span * 0.7, 1, 0.7], "#9b6b45"),
    part([0, 1.04, front + 0.9], [span * 0.72, 0.08, 0.8], "#e8d3ad"),
    ...(card.level >= 4 ? [part([0, 3.15, front + 0.18], [span, 0.7, 0.12], "#fffaf0")] : []),
  ];
}

function LotFacade({ card }: { card: LotCard }) {
  const lot = WARUNG_LOTS[card.lot];
  const front = (lot?.depth ?? 0) / 2;
  const parts = useMemo(() => (lot ? storefront(card, lot.width, front) : []), [card, lot, front]);
  if (!lot) return null;
  const signY = card.level >= 4 ? 3.15 : 2.95;
  const status = card.online ? "● Buka · pemilik di sini" : "Dijaga NPC";
  return (
    <group position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <StyledBatch items={parts} />
      <Text
        position={[0, signY, front + 0.26]}
        fontSize={0.36}
        maxWidth={lot.width - 1}
        color={card.level >= 4 ? "#6b4a33" : "#ffffff"}
        outlineWidth={card.level >= 4 ? 0 : 0.02}
        outlineColor="#5a2e0a"
      >
        {card.name}
      </Text>
      <Text
        position={[0, 1.55, front + 1.4]}
        fontSize={0.2}
        color={card.online ? "#2f9e5b" : "#8c6c52"}
        outlineWidth={0.012}
        outlineColor="#ffffff"
      >
        {`${card.ownerName ?? "Pemain"} · ${card.levelName}\n${status}${card.hiring ? "\nLowongan part-time" : ""}`}
      </Text>
    </group>
  );
}

/** Warungs placed on city house lots for the current channel (server decides who sits where). */
export function WarungLots() {
  const room = useChannels((s) => s.lease?.channel);
  const lots = useWarung((s) => s.lots);
  useEffect(() => {
    if (!room?.startsWith("CHANNEL-")) return;
    void loadLots();
    const t = setInterval(() => void loadLots(), POLL_MS);
    return () => clearInterval(t);
  }, [room]);
  return (
    <>
      {lots.map((card) => (
        <LotFacade key={`${card.lot}-${card.id}`} card={card} />
      ))}
    </>
  );
}
