/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { lotFront } from "@/game/warung/lots";
import { rupiahShort } from "@/game/warung/model";
import { USAHA_LOTS, type UsahaKind } from "./model";
import { useUsaha } from "./store";

const SIGN: AssetPart[] = [
  { p: [-1, 0.9, 0], s: [0.1, 1.8, 0.1], color: "#5a3922", shape: "box", finish: "wood" },
  { p: [1, 0.9, 0], s: [0.1, 1.8, 0.1], color: "#5a3922", shape: "box", finish: "wood" },
  { p: [0, 1.95, 0], s: [2.4, 0.8, 0.1], color: "#fffaf0", shape: "bevel", finish: "paint" },
];

function LotSign({ kind }: { kind: UsahaKind }) {
  const lot = USAHA_LOTS[kind];
  const owned = useUsaha((s) => !!s.data?.[kind]);
  const price = useUsaha((s) =>
    kind === "warteg" ? s.data?.catalog.wartegPrice : s.data?.catalog.kosPrice,
  );
  if (!lot) return null;
  const [x, z] = lotFront(lot, 0.4);
  const title = kind === "warteg" ? "🍛 WARTEG" : "🏠 KOS-KOSAN";
  const sub = owned ? "Milikmu" : price ? `Dijual ${rupiahShort(price)}` : "Dijual";
  return (
    <group position={[x, 0, z]} rotation-y={lot.rotation}>
      <StyledBatch items={SIGN} />
      <Text position={[0, 2.08, 0.06]} fontSize={0.3} color="#5a3922">
        {title}
      </Text>
      <Text position={[0, 1.78, 0.06]} fontSize={0.18} color="#8b705b">
        {sub}
      </Text>
    </group>
  );
}

/** Entrance signs on two city ruko lots; entering is done from UsahaHud's prompt. */
export function UsahaLots() {
  return (
    <group name="UsahaLots">
      <LotSign kind="warteg" />
      <LotSign kind="kos" />
    </group>
  );
}
