/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { Text } from "@react-three/drei";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { NpcLabel } from "@/game/world/NpcLabel";

// House-local frame (GangScene House): the front faces +z, the teras text sits at z ≈ 7.5.
const SIGN: AssetPart[] = [
  { p: [-3.4, 0.7, 8.3], s: [0.1, 1.4, 0.1], color: "#5a3922", shape: "box", finish: "wood" },
  { p: [-1.8, 0.7, 8.3], s: [0.1, 1.4, 0.1], color: "#5a3922", shape: "box", finish: "wood" },
  { p: [-2.6, 1.55, 8.3], s: [2.0, 0.6, 0.08], color: "#7a4b2a", shape: "bevel", finish: "wood" },
];

/** Mbah's "Langganan sejak 1965" board in front of a house whose owner finished Buku Mbah. */
export function MbahSign({ text }: { text: string }) {
  return (
    <group name="MbahSign">
      <StyledBatch items={SIGN} />
      <Text position={[-2.6, 1.62, 8.36]} fontSize={0.18} color="#f8e6c4" fontWeight={800}>
        WARUNG MBAH
      </Text>
      <Text position={[-2.6, 1.42, 8.36]} fontSize={0.12} color="#f8e6c4">
        {text}
      </Text>
    </group>
  );
}

const BULBS = ["#ffe14d", "#ff5c9a", "#5fe0ff", "#8dff6a"];
const PARTY: AssetPart[] = [
  // Tenda: four poles and a red-white roof over the front yard.
  ...[
    [-3.5, 9],
    [3.5, 9],
    [-3.5, 13],
    [3.5, 13],
  ].map(([x, z]): AssetPart => ({ p: [x!, 1.3, z!], s: [0.1, 2.6, 0.1], color: "#d9d9d9", shape: "cylinder", finish: "metal" })),
  { p: [0, 2.7, 11], s: [7.4, 0.12, 4.4], color: "#d64541", shape: "box", finish: "paint" },
  { p: [0, 2.82, 11], s: [7.4, 0.05, 1.4], color: "#ffffff", shape: "box", finish: "paint" },
  // Lampu warna-warni along the front edge, and a long table.
  ...Array.from({ length: 10 }, (_, i): AssetPart => ({
    p: [-3.4 + i * 0.75, 2.5 - (i % 2) * 0.06, 8.9],
    s: [0.22, 0.26, 0.22],
    color: BULBS[i % 4]!,
    shape: "sphere",
    finish: "plastic",
  })),
  { p: [0, 0.75, 11.4], s: [4.2, 0.1, 1.0], color: "#c99a6a", shape: "bevel", finish: "wood" },
  { p: [0, 0.38, 11.4], s: [3.8, 0.7, 0.8], color: "#ffffff", shape: "box", finish: "paint" },
];

// Story cast at the party (avatar keys from NPC_AVATARS).
const GUESTS: { name: string; avatar: string; at: [number, number, number] }[] = [
  { name: "Pak RT Kosim", avatar: "npc-owner", at: [-2.4, 0, 10.2] },
  { name: "Koko Cung", avatar: "npc_daily_cung", at: [-0.8, 0, 12.3] },
  { name: "Ci Mei", avatar: "npc-cashier", at: [0.8, 0, 12.3] },
  { name: "Bu Romlah", avatar: "npc-shopper-1", at: [2.4, 0, 10.2] },
  { name: "Bang Dimas", avatar: "npc-courier", at: [3.2, 0, 12.6] },
  { name: "Mbak Sari", avatar: "npc-shopper-3", at: [-3.2, 0, 12.6] },
];

function Guest({ name, avatar, at }: (typeof GUESTS)[number]) {
  const animation = useRef<AvatarAnimation | undefined>("Talk");
  const speed = useRef(0);
  const look = NPC_AVATARS[avatar];
  if (!look) return null;
  return (
    <group position={at} rotation-y={Math.PI} name={`PartyGuest:${name}`}>
      <BaseAvatarV2 avatar={look} animation={animation} speed={speed} />
      <NpcLabel text={name} />
    </group>
  );
}

/** Kampung party in front of a house while its owner's finale party runs (F8). */
export function PartyDecor() {
  return (
    <group name="KampungParty">
      <StyledBatch items={PARTY} />
      {GUESTS.map((g) => (
        <Guest key={g.name} {...g} />
      ))}
    </group>
  );
}
