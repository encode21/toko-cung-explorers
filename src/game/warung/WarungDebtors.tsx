/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { useGame } from "@/state/game-store";
import { useWarung } from "./store";
import { debtorSpot, rupiahShort, type WarungDebt } from "./model";

const DEBTOR_CULL_DIST_SQ = 42 * 42;
const DEBTOR_AVATARS = ["npc-shopper-2", "npc-pedestrian-2", "npc-shopper-1", "npc-pedestrian-1"];

function DebtorNpc({ debt }: { debt: WarungDebt }) {
  const ref = useRef<Group>(null);
  const spot = debtorSpot(debt.id);
  const avatarKey = DEBTOR_AVATARS[debt.id % DEBTOR_AVATARS.length]!;

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const [px, , pz] = useGame.getState().playerPos;
    const dx = px - spot.x;
    const dz = pz - spot.z;
    const show = dx * dx + dz * dz <= DEBTOR_CULL_DIST_SQ;
    if (g.visible !== show) g.visible = show;
  });

  return (
    <group ref={ref} position={[spot.x, 0.06, spot.z]} name={`WarungDebtor-${debt.id}`}>
      <BaseAvatarV2 avatar={NPC_AVATARS[avatarKey]} animation="Idle" speed={0} groundToWorld />
      <Text position={[0, 2.75, 0]} fontSize={0.3}>
        💸
      </Text>
      <Text
        position={[0, 2.38, 0]}
        fontSize={0.21}
        color="#a2421f"
        outlineWidth={0.02}
        outlineColor="#fffaf3"
      >
        {`${debt.npc} · Utang ${rupiahShort(debt.amount)}`}
      </Text>
    </group>
  );
}

/** Active warung debtors spotted on city streets so the owner can collect in person. */
export function WarungDebtors() {
  const debts = useWarung((s) => s.data?.debts);
  if (!debts || debts.length === 0) return null;
  return (
    <group name="WarungDebtors">
      {debts
        .filter((debt) => debt.kind !== "pinjam_uang")
        .map((debt) => (
          <DebtorNpc key={debt.id} debt={debt} />
        ))}
    </group>
  );
}
