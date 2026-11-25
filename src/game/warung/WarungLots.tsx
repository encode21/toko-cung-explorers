/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { LEVEL_LOOK, rupiah, type LotCard, type WarungLotOffer } from "./model";
import { RenovationSite } from "./RenovationSite";
import { WARUNG_LOTS, lotFront } from "./lots";
import { loadLots, useWarung } from "./store";
import { ShopStaff } from "@/game/staff/ShopStaff";
import { DeliveryFleet, DeliveryTruck, PickupPiles } from "./KulakanDeliveryScene";
import { Passers, type Passer } from "@/game/npc/Passers";

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
export function warungLotBuilding(card: LotCard, width: number, depth: number): AssetPart[] {
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

/** Tunggakan days at which Koko Cung and his crew start waiting in front of the warung. */
const COLLECT_FROM_DAYS = 2;

/** Koko Cung + two satpam in front of a warung close to (or past) the seal day; everyone sees them. */
function RentCollectors({ card, depth }: { card: LotCard; depth: number }) {
  const z = depth / 2 + 1.3;
  const line = card.sealed
    ? "🔒 DISEGEL · Koko Cung"
    : `🧧 Koko Cung: "Sewa nunggak ${card.rentDue} hari!"`;
  return (
    <group name="RentCollectors">
      {/* Face the house (lots front local +z). */}
      <group position={[0, 0, z]} rotation-y={Math.PI}>
        <BaseAvatarV2
          avatar={NPC_AVATARS["npc_daily_cung"]}
          animation="Idle"
          speed={0}
          groundToWorld
        />
      </group>
      {[-1.15, 1.15].map((x) => (
        <group key={x} position={[x, 0, z + 0.5]} rotation-y={Math.PI + (x < 0 ? -0.35 : 0.35)}>
          <BaseAvatarV2
            avatar={NPC_AVATARS["npc-satpam"]}
            animation="Idle"
            speed={0}
            groundToWorld
          />
        </group>
      ))}
      <Billboard position={[0, 2.55, z]}>
        <Text
          fontSize={0.24}
          maxWidth={4}
          textAlign="center"
          color={card.sealed ? "#ffd1c4" : "#fff9e9"}
          outlineWidth={0.03}
          outlineColor="#7a1f12"
        >
          {line}
        </Text>
      </Billboard>
    </group>
  );
}

function LotFacade({ card }: { card: LotCard }) {
  const lot = WARUNG_LOTS[card.lot];
  const mine = useWarung((s) => s.data?.warung?.id === card.id);
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
  const status = card.renovation ? "🚧 Renovasi" : card.online ? "● Buka" : "Dijaga NPC";
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
          <DeliveryTruck card={card} depth={lot.depth} />
          {(card.sealed || (card.rentDue ?? 0) >= COLLECT_FROM_DAYS) && (
            <RentCollectors card={card} depth={lot.depth} />
          )}
        </group>
        {mine && <ShopStaff where="lot" />}
        {card.renovation && (
          <RenovationSite
            renovation={card.renovation}
            width={bw}
            front={bFront}
            height={isCart ? 2.6 : bh}
          />
        )}
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

const SIGN_LOOK = {
  exclusive: { title: "EKSKLUSIF", board: "#1d1d1f", text: "#e8c35a" },
  soon: { title: "AKAN HADIR", board: "#2f7fd0", text: "#ffffff" },
  sale: { title: "DIJUAL", board: "#e0623d", text: "#ffffff" },
  landmark: { title: "WARUNG MBAH", board: "#7a4b2a", text: "#f8e6c4" },
} as const;

/** Papan kavling in the front corner of a lot nobody shows a warung on: status, tier, price, level. */
function LotSign({ offer }: { offer: WarungLotOffer }) {
  const lot = WARUNG_LOTS[offer.lot];
  const ref = useRef<Group>(null);
  const landmark = useWarung((s) => (s.landmark?.lot === offer.lot ? s.landmark : null));
  const look = SIGN_LOOK[landmark ? "landmark" : offer.status];
  const x = lot ? lot.width / 2 - 1.2 : 0;
  // Just past the lot front, on the pavement edge, so the house never hides it.
  const z = lot ? lot.depth / 2 + 0.4 : 0;
  const parts = useMemo(
    () => [
      part([x, 0.9, z], [0.12, 1.8, 0.12], "#4a545c", "cylinder", "metal"),
      part([x, 1.75, z + 0.08], [1.9, 0.95, 0.08], look.board, "bevel"),
    ],
    [x, z, look.board],
  );
  useFrame(() => {
    if (!lot || !ref.current) return;
    const [px, , pz] = useGame.getState().playerPos;
    const show = (px - lot.x) ** 2 + (pz - lot.z) ** 2 <= SIGN_DIST_SQ;
    if (ref.current.visible !== show) ref.current.visible = show;
  });
  if (!lot) return null;
  const sub = landmark
    ? landmark.caption
    : offer.status === "sale"
      ? `#${offer.lot + 1} · ${offer.tierName}\n${offer.price ? rupiah(offer.price) : "Gratis"} · Lv.${offer.level}`
      : `Kavling #${offer.lot + 1} · ${offer.tierName}`;
  return (
    <group ref={ref} position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <StyledBatch items={parts} />
      <Text position={[x, 1.98, z + 0.13]} fontSize={0.26} color={look.text} fontWeight={800}>
        {look.title}
      </Text>
      <Text
        position={[x, 1.6, z + 0.13]}
        fontSize={0.14}
        lineHeight={1.2}
        textAlign="center"
        color={look.text}
      >
        {sub}
      </Text>
    </group>
  );
}

// Orang lewat di trotoar depan kavling warung kota: one walker per street of lots (first ↔ last lot front).
const LOT_STREETS: [number, number, string][] = [
  [0, 2, "npc-shopper-1"],
  [3, 5, "npc-store-staff"],
  [6, 10, "npc-courier"],
  [11, 14, "npc-cashier"],
  [15, 24, "npc-shopper-2"],
];
const LOT_PASSERS: Passer[] = LOT_STREETS.flatMap(([a, b, avatar], i) => {
  const first = WARUNG_LOTS[a],
    last = WARUNG_LOTS[b];
  if (!first || !last) return [];
  return [{ id: `lot-street-${i}`, avatar, from: lotFront(first, 2.6), to: lotFront(last, 2.6), speed: 1.1, offset: i * 7 }];
});

/** Warungs placed on city house lots for the current channel (server decides who sits where). */
export function WarungLots() {
  const room = useChannels((s) => s.lease?.channel);
  const lots = useWarung((s) => s.lots);
  const market = useWarung((s) => s.data?.lotMarket);
  const shown = useMemo(() => new Set(lots.map((c) => c.lot)), [lots]);
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
      {market
        ?.filter((m) => !shown.has(m.lot) && !(m.unique && m.ownerName))
        .map((m) => (
          <LotSign key={`sign-${m.lot}`} offer={m} />
        ))}
      <PickupPiles />
      <DeliveryFleet area="city" />
      {LOT_PASSERS.map((p) => (
        <Passers key={p.id} passers={[p]} />
      ))}
    </group>
  );
}
