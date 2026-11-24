/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { lotFront } from "@/game/warung/lots";
import { rupiahShort } from "@/game/warung/model";
import { USAHA_LOTS, usahaOpen, type UsahaKind } from "./model";
import { useUsaha } from "./store";
import { useWarung } from "@/game/warung/store";
import { PARTNER_CENTERS } from "@/game/world/outdoor-layout";
import { PLACES } from "@/game/world/places";
import { DEFAULT_CLUB_TARGETS } from "@/game/club/defaults";

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
  // F7: Ruko Usaha Cung, many rented units behind one door; show who is in right now.
  const online = useWarung((s) => s.usahaOnline?.[kind]);
  if (!lot) return null;
  const [x, z] = lotFront(lot, 0.4);
  const title = kind === "warteg" ? "🍛 WARTEG" : "🏠 KOS-KOSAN";
  const sub = !usahaOpen(kind)
    ? "Segera hadir"
    : owned
      ? "Milikmu"
      : price
        ? `Dijual ${rupiahShort(price)}`
        : "Dijual";
  return (
    <group position={[x, 0, z]} rotation-y={lot.rotation}>
      <StyledBatch items={SIGN} />
      <Text position={[0, 2.08, 0.06]} fontSize={0.3} color="#5a3922">
        {title}
      </Text>
      <Text position={[0, 1.78, 0.06]} fontSize={0.18} color="#8b705b">
        {sub}
      </Text>
      {online && (
        <Text
          position={[0, 1.6, 0.06]}
          fontSize={0.12}
          maxWidth={2.3}
          textAlign="center"
          color="#8b705b"
        >
          {online.length ? `Ruko Usaha Cung · buka: ${online.join(", ")}` : "Ruko Usaha Cung"}
        </Text>
      )}
    </group>
  );
}

const FOR_RENT: AssetPart[] = [
  { p: [0, 0.75, 0], s: [0.08, 1.5, 0.08], color: "#4a545c", shape: "cylinder", finish: "metal" },
  { p: [0, 1.55, 0], s: [1.6, 0.6, 0.08], color: "#2f7fd0", shape: "bevel", finish: "paint" },
];
/** Front-row ruko facing Toko Cung that no named place uses yet: status "soon" (storyboard §9). */
const VACANT_RUKO = PARTNER_CENTERS.filter(
  ([x, z]) =>
    !PLACES.some((p) => p.c[0] === x && p.c[1] === z) &&
    // The Cung Underground door sits in front of one of these ruko.
    !DEFAULT_CLUB_TARGETS.some((t) => (t.position.x - x) ** 2 + (t.position.z - z) ** 2 < 8 ** 2),
);

/** "Disewakan" board in front of a vacant front-row ruko (city lots v2 only). */
function ForRentSign({ x, z }: { x: number; z: number }) {
  // Partner ruko face -z (rotation π); the board stands on the pavement in front.
  return (
    <group position={[x, 0, z - 4.6]} rotation-y={Math.PI}>
      <StyledBatch items={FOR_RENT} />
      <Text position={[0, 1.62, 0.05]} fontSize={0.2} color="#ffffff" fontWeight={800}>
        DISEWAKAN
      </Text>
      <Text position={[0, 1.4, 0.05]} fontSize={0.11} color="#ffffff">
        Hubungi Koko Cung
      </Text>
    </group>
  );
}

/** Entrance signs on two city ruko lots; entering is done from UsahaHud's prompt. */
export function UsahaLots() {
  const cityV2 = useWarung((s) => s.landmark !== null);
  return (
    <group name="UsahaLots">
      <LotSign kind="warteg" />
      <LotSign kind="kos" />
      {cityV2 && VACANT_RUKO.map(([x, z]) => <ForRentSign key={`${x}:${z}`} x={x} z={z} />)}
    </group>
  );
}
