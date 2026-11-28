/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { useProfile } from "@/identity/profile-store";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { rupiah, type LotCard, type WarungLotOffer } from "./model";
import { RenovationSite } from "./RenovationSite";
import { BurningSite } from "./WarungFire";
import { isBurning } from "./disaster-alert";
import { ArchitectureBatch } from "@/game/world/ArchitectureBatch";
import type { BuildingLot } from "@/game/world/outdoor-layout";
import { PropertyBeacon, PropertySign } from "@/game/world/PropertySign";
import { gangArchitecture } from "@/game/gang/architecture";
import type { GangHouse } from "@/game/gang/model";
import { WARUNG_LOTS, lotFront, lotRoadZ } from "./lots";
import { loadLots, useWarung } from "./store";
import { ShopStaff } from "@/game/staff/ShopStaff";
import { DeliveryFleet, DeliveryTruck, PickupPiles } from "./KulakanDeliveryScene";
import { Passers, type Passer } from "@/game/npc/Passers";
import { WarungEntranceDoor } from "./WarungEntranceDoor";
import {
  lotFit,
  warungBuildingHeight,
  warungDoorFront,
  warungEnvelope,
  WARUNG_SIGN,
} from "./storefront";

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

const LOT_STYLE: GangHouse["style"] = {
  paint: { id: "cream", name: "Cat krem", color: "#e7d1aa" },
  roof: { id: "clay", name: "Genteng merah", color: "#a6533f" },
  fence: { id: "none", name: "", color: "" },
  plants: { id: "none", name: "", color: "" },
  lamp: { id: "none", name: "", color: "" },
};
/** A city-lot warung is the same kampung house + per-level warung kit as in the gang, fitted to the lot. */
export function lotHouse(
  card: Pick<LotCard, "id" | "name" | "level" | "levelName">,
  number = 1,
): GangHouse {
  return {
    number,
    ownerId: "lot",
    ownerName: null,
    mine: false,
    inactive: false,
    style: LOT_STYLE,
    warung: {
      id: card.id,
      name: card.name,
      level: card.level,
      levelName: card.levelName,
      lot: null,
      open: true,
    },
  };
}
/** Body front and the teras edge (where the sign board hangs) of a fitted lot house. */
function lotFrontage(level: number, width: number, depth: number) {
  const fit = lotFit(width, depth);
  const bodyFront = fit.depth / 2 - 0.3;
  return {
    fit,
    bodyWidth: Math.min(fit.width, level === 5 ? 14 : 10),
    height: warungBuildingHeight(level),
    bodyFront,
    board: bodyFront + 4.92 * fit.teras,
  };
}

function ownerSignPosition(lot: BuildingLot): [number, number, number] {
  // Step back from the near lane by 1.7 m of road, 2 m of sidewalk and 0.3 m of yard.
  const sidewalkSetback = lotRoadZ(lot) - 4;
  return [-lot.width / 2 + 1.65, 0, Math.max(lot.depth / 2 + 0.4, sidewalkSetback)];
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
  const displayName = useProfile((s) => (mine ? s.profile?.displayName : undefined));
  const parts = useMemo(
    () =>
      lot ? gangArchitecture(lotHouse(card, card.lot + 1), lotFit(lot.width, lot.depth)) : null,
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

  if (!lot || !parts) return null;
  const { fit, bodyWidth, height, bodyFront, board } = lotFrontage(
    card.level,
    lot.width,
    lot.depth,
  );
  const status =
    card.damage?.status === "damaged"
      ? "RUSAK"
      : card.renovation
        ? "Renovasi"
        : card.online
          ? "● Buka"
          : "Dijaga NPC";
  const detailText = `${card.levelName} · ${status}${card.hiring ? "\nLowongan part-time" : ""}`;
  const ownerName = displayName?.trim() || card.ownerName?.trim();
  const signPosition = ownerSignPosition(lot);

  return (
    <group position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[bodyWidth / 2, height / 2, fit.depth / 2]}
          position={[0, height / 2, -0.3]}
        />
      </RigidBody>
      {mine && ownerName && <PropertyBeacon position={signPosition} />}
      <group ref={rootRef}>
        <ArchitectureBatch items={parts.masonry} surface="masonry" />
        <ArchitectureBatch items={parts.trim} surface="trim" />
        <ArchitectureBatch items={parts.glazing} surface="glazing" />
        <WarungEntranceDoor
          front={warungDoorFront(fit)}
          back={warungEnvelope(bodyWidth, card.level, fit).back}
          width={bodyWidth}
          enabled={!card.sealed || mine}
        />
        {ownerName && <PropertySign ownerName={ownerName} kind="warung" position={signPosition} />}
        <group ref={signRef}>
          <Text
            position={[0, WARUNG_SIGN.centerY, board + 0.19]}
            fontSize={0.36}
            maxWidth={bodyWidth * 0.85}
            textAlign="center"
            color="#35543e"
          >
            {card.name}
          </Text>
          {card.trucks?.length ? (
            card.trucks.map((t) => (
              <DeliveryTruck
                key={`${t.eta}:${t.slot}`}
                card={{ id: card.id, truckEta: t.eta }}
                depth={lot.depth}
                roadZ={lotRoadZ(lot)}
                slot={t.slot}
              />
            ))
          ) : (
            <DeliveryTruck card={card} depth={lot.depth} roadZ={lotRoadZ(lot)} />
          )}
          {(card.sealed || (card.rentDue ?? 0) >= COLLECT_FROM_DAYS) && (
            <RentCollectors card={card} depth={lot.depth} />
          )}
        </group>
        {mine && <ShopStaff where="lot" />}
        {isBurning(card.damage) && (
          <BurningSite width={bodyWidth} front={board - 0.3} height={Math.min(height, 4.2)} />
        )}
        {card.renovation && (
          <RenovationSite
            renovation={card.renovation}
            repair={card.damage?.status === "repairing"}
            width={bodyWidth}
            front={board - 0.3}
            height={Math.min(height, 4.2)}
          />
        )}
        <group ref={detailRef}>
          <Text
            position={[0, 0.62, board + 0.6]}
            fontSize={0.16}
            maxWidth={3.0}
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

/** The market can confirm who owns a lot before its live storefront arrives. */
function OccupiedLotSign({ offer, mine }: { offer: WarungLotOffer; mine: boolean }) {
  const displayName = useProfile((s) => (mine ? s.profile?.displayName : undefined));
  const lot = WARUNG_LOTS[offer.lot];
  if (!lot) return null;
  const ownerName = displayName?.trim() || offer.ownerName?.trim();
  const position = ownerSignPosition(lot);
  return (
    <group position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      {ownerName && <PropertySign ownerName={ownerName} kind="warung" position={position} />}
      {mine && ownerName && <PropertyBeacon position={position} />}
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
  return [
    {
      id: `lot-street-${i}`,
      avatar,
      from: lotFront(first, 2.6),
      to: lotFront(last, 2.6),
      speed: 1.1,
      offset: i * 7,
    },
  ];
});

/** Warungs placed on city house lots for the current channel (server decides who sits where). */
export function WarungLots() {
  const room = useChannels((s) => s.lease?.channel);
  const lots = useWarung((s) => s.lots);
  const market = useWarung((s) => s.data?.lotMarket);
  const myWarungId = useWarung((s) => s.data?.warung?.id);
  const shown = useMemo(() => new Set(lots.map((c) => c.lot)), [lots]);
  const unlistedOwnLot = lots.some((c) => c.id === myWarungId)
    ? undefined
    : market?.find((m) => m.mine)?.lot;
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
        ?.filter((m) => !shown.has(m.lot))
        .map((m) =>
          m.mine || (m.unique && m.ownerName) ? (
            <OccupiedLotSign key={`owner-${m.lot}`} offer={m} mine={m.lot === unlistedOwnLot} />
          ) : (
            <LotSign key={`sign-${m.lot}`} offer={m} />
          ),
        )}
      <PickupPiles />
      <DeliveryFleet area="city" />
      {LOT_PASSERS.map((p) => (
        <Passers key={p.id} passers={[p]} />
      ))}
    </group>
  );
}
