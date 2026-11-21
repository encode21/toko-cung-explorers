/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { LEVEL_LOOK, type LotCard } from "./model";
import { WARUNG_LOTS } from "./lots";
import { loadLots, useWarung } from "./store";

const POLL_MS = 30_000;
const LOT_CULL_DIST_SQ = 95 * 95;
const SIGN_DIST_SQ = 42 * 42;
const DETAIL_DIST_SQ = 24 * 24;

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
  const rootRef = useRef<Group>(null);
  const signRef = useRef<Group>(null);
  const detailRef = useRef<Group>(null);

  // Distance-cull distant storefronts and Troika text without causing React re-renders.
  useFrame(() => {
    if (!lot || !rootRef.current) return;
    const [px, , pz] = useGame.getState().playerPos;
    const dx = px - lot.x;
    const dz = pz - lot.z;
    const d2 = dx * dx + dz * dz;
    const showLot = d2 <= LOT_CULL_DIST_SQ;
    if (rootRef.current.visible !== showLot) rootRef.current.visible = showLot;
    if (!showLot) return;
    if (signRef.current) {
      const showSign = d2 <= SIGN_DIST_SQ;
      if (signRef.current.visible !== showSign) signRef.current.visible = showSign;
    }
    if (detailRef.current) {
      const showDetail = d2 <= DETAIL_DIST_SQ;
      if (detailRef.current.visible !== showDetail) detailRef.current.visible = showDetail;
    }
  });

  if (!lot) return null;
  const isCart = card.level === 1;
  const signX = isCart ? -lot.width * 0.18 : 0;
  const signY = isCart ? 2.48 : card.level >= 4 ? 3.16 : 2.98;
  const signZ = isCart ? front + 1.45 : front + 0.3;
  const detailX = isCart ? -lot.width * 0.18 : 0;
  const detailY = isCart ? 0.78 : 0.62;
  const detailZ = isCart ? front + 1.74 : front + 1.3;
  const status = card.online ? "● Buka" : "Dijaga NPC";
  const detailText = `${card.ownerName ?? "Pemain"} · ${card.levelName} · ${status}${card.hiring ? "\nLowongan part-time" : ""}`;
  return (
    <group ref={rootRef} position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <StyledBatch items={parts} />
      <group ref={signRef}>
        <Text
          position={[signX, signY, signZ]}
          fontSize={isCart ? 0.3 : 0.36}
          maxWidth={isCart ? 2.6 : lot.width - 1}
          textAlign="center"
          color={card.level >= 4 ? "#5a3922" : "#ffffff"}
          outlineWidth={card.level >= 4 ? 0 : 0.022}
          outlineColor="#5a2e0a"
        >
          {card.name}
        </Text>
      </group>
      <group ref={detailRef}>
        <Text
          position={[detailX, detailY, detailZ]}
          fontSize={0.16}
          maxWidth={isCart ? 1.8 : 3.2}
          lineHeight={1.25}
          textAlign="center"
          color={card.online ? "#fff9e9" : "#f6e7d4"}
          outlineWidth={0.015}
          outlineColor="#4b2a12"
        >
          {detailText}
        </Text>
      </group>
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
    <group name="WarungLots">
      {lots.map((card) => (
        <LotFacade key={`${card.lot}-${card.id}`} card={card} />
      ))}
    </group>
  );
}
