/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
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
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

/** Standalone warung structure replacing the house on an occupied lot; grows from Gerobak to Minimarket. */
function warungLotBuilding(card: LotCard, width: number, depth: number): AssetPart[] {
  const look = LEVEL_LOOK[Math.min(card.level, 5) - 1]!;
  const front = depth / 2;
  const pad: AssetPart = part([0, 0.05, 0], [width, 0.1, depth], "#d9cfbe", "box");

  if (card.level === 1) {
    // Level 1: Gerobak warung on an open paved lot with stools & bench.
    return [
      pad,
      part([0, 0.78, 0.6], [2.4, 0.9, 1.1], "#b9824f", "bevel", "wood"),
      part([0, 1.28, 0.6], [2.55, 0.1, 1.2], "#e8d3ad", "box", "wood"),
      part([-1.1, 1.75, 0.6], [0.1, 1.0, 0.1], "#6b4a33", "box", "wood"),
      part([1.1, 1.75, 0.6], [0.1, 1.0, 0.1], "#6b4a33", "box", "wood"),
      part([0, 2.3, 0.6], [2.8, 0.14, 1.5], look.awning, "box", "fabric"),
      part([-0.85, 0.32, 0.6], [0.55, 0.55, 1.2], "#3d3d3d", "cylinder", "plastic"),
      part([0.85, 0.32, 0.6], [0.55, 0.55, 1.2], "#3d3d3d", "cylinder", "plastic"),
      // Plastic stools & bench for customers
      part([-2.1, 0.28, 1.2], [0.46, 0.46, 0.46], "#e2483d", "cylinder", "plastic"),
      part([2.1, 0.28, 1.2], [0.46, 0.46, 0.46], "#3fa7c9", "cylinder", "plastic"),
      part([0, 0.42, -1.6], [2.2, 0.1, 0.55], "#a77b52", "box", "wood"),
    ];
  }

  // Level 2–5: Standalone warung / kios / toko kelontong / minimarket building.
  const bw = Math.min(width - 0.8, 4.6 + card.level * 0.9);
  const bd = Math.min(depth - 1.4, 3.6 + card.level * 0.6);
  const bh = card.level >= 4 ? 3.8 : 3.2;
  const bz = -0.3;
  const bFront = bz + bd / 2;

  return [
    pad,
    // Main building body + wainscot stripe
    part([0, bh / 2 + 0.08, bz], [bw, bh, bd], look.wall),
    part([0, 0.55, bFront + 0.03], [bw + 0.04, 0.95, 0.06], look.awning, "box"),
    // Roof slab + pitched cap
    part([0, bh + 0.16, bz], [bw + 0.5, 0.22, bd + 0.5], "#7a5b45", "bevel"),
    part([0, bh + 0.42, bz], [bw - 0.4, 0.34, bd - 0.4], look.awning, "bevel"),
    // Front door & display window
    part([bw * 0.28, 1.15, bFront + 0.04], [1.2, 2.1, 0.08], "#7c5534", "box", "wood"),
    part([-bw * 0.16, 1.55, bFront + 0.04], [bw * 0.46, 1.25, 0.08], "#bfe6f7", "box", "glass"),
    // Striped/colored storefront awning
    part([0, 2.55, bFront + 0.72], [bw + 0.3, 0.14, 1.35], look.awning, "box", "fabric"),
    // Front etalase counter
    part([-bw * 0.16, 0.55, bFront + 0.65], [bw * 0.48, 0.95, 0.7], "#9b6b45", "bevel", "wood"),
    part([-bw * 0.16, 1.08, bFront + 0.65], [bw * 0.5, 0.08, 0.78], "#e8d3ad", "box", "wood"),
    // Front fascia signboard
    part([0, bh - 0.15, bFront + 0.14], [bw * 0.86, 0.68, 0.14], "#fffaf0", "box"),
    // Plastic stools in front
    part(
      [bw * 0.36, 0.25, Math.min(front - 0.5, bFront + 1.2)],
      [0.44, 0.44, 0.44],
      "#e2483d",
      "cylinder",
      "plastic",
    ),
  ];
}

function LotFacade({ card }: { card: LotCard }) {
  const lot = WARUNG_LOTS[card.lot];
  const parts = useMemo(
    () => (lot ? warungLotBuilding(card, lot.width, lot.depth) : []),
    [card, lot],
  );
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
  const bw = Math.min(lot.width - 0.8, 4.6 + card.level * 0.9);
  const bd = Math.min(lot.depth - 1.4, 3.6 + card.level * 0.6);
  const bh = card.level >= 4 ? 3.8 : 3.2;
  const bFront = -0.3 + bd / 2;

  const signY = isCart ? 2.68 : bh - 0.15;
  const signZ = isCart ? 0.65 : bFront + 0.24;
  const detailY = isCart ? 0.82 : 0.62;
  const detailZ = isCart ? 1.24 : bFront + 1.06;
  const status = card.online ? "● Buka" : "Dijaga NPC";
  const detailText = `${card.ownerName ?? "Pemain"} · ${card.levelName} · ${status}${card.hiring ? "\nLowongan part-time" : ""}`;

  return (
    <group position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={isCart ? [1.25, 1.15, 0.6] : [bw / 2, bh / 2, bd / 2]}
          position={isCart ? [0, 1.15, 0.6] : [0, bh / 2, -0.3]}
        />
      </RigidBody>
      <group ref={rootRef}>
        <StyledBatch items={parts} />
        <group ref={signRef}>
          <Text
            position={[0, signY, signZ]}
            fontSize={isCart ? 0.3 : 0.36}
            maxWidth={isCart ? 2.6 : bw * 0.8}
            textAlign="center"
            color={isCart ? "#ffffff" : "#5a3922"}
            outlineWidth={isCart ? 0.022 : 0}
            outlineColor="#5a2e0a"
          >
            {card.name}
          </Text>
        </group>
        <group ref={detailRef}>
          <Text
            position={[isCart ? 0 : -bw * 0.16, detailY, detailZ]}
            fontSize={0.16}
            maxWidth={isCart ? 2.1 : 3.0}
            lineHeight={1.25}
            textAlign="center"
            color="#fff9e9"
            outlineWidth={0.015}
            outlineColor="#4b2a12"
          >
            {detailText}
          </Text>
        </group>
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
