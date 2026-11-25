/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useWarung } from "@/game/warung/store";
import { Billboard, Text } from "@react-three/drei";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { useStaff } from "./store";
import type { StaffKind } from "./types";

const LOOK: Partial<Record<StaffKind, { avatar: string; x: number }>> = {
  guard: { avatar: "npc-store-staff", x: -1.35 },
  courier: { avatar: "npc-courier", x: 1.35 },
};
/** Porch of the gang shop, behind the city-lot counter, or behind the interior counter. */
const DEPTH = { porch: 4.4, lot: 2.15, counter: -2.15 } as const;

function StaffActor({
  kind,
  name,
  where,
}: {
  kind: StaffKind;
  name: string;
  where: keyof typeof DEPTH;
}) {
  const ref = useRef<Group>(null);
  const action = useWarung((s) => (where === "counter" && kind === "guard" ? s.guardAction : null));
  const look = LOOK[kind]!;
  useFrame((_, dt) => {
    if (!ref.current) return;
    const x = action?.kind === "confront" ? -0.85 : action ? -2.1 : look.x;
    ref.current.position.x += (x - ref.current.position.x) * Math.min(1, dt * 6);
  });
  return (
    <group ref={ref} position={[look.x, 0, DEPTH[where]]}>
      <LodAvatar
        lodId={`staff:${where}:${kind}`}
        avatarId={look.avatar}
        animation={action?.kind === "confront" ? "Angry" : action ? "Wave" : "Idle"}
      />
      <Billboard position={[0, 2.15, 0]} visible={!action}>
        <Text
          fontSize={0.16}
          maxWidth={2.4}
          textAlign="center"
          color="#fff6d0"
          outlineWidth={0.02}
          outlineColor="#3a2414"
        >
          {action?.kind === "confront" ? "😠 Penjaga warung" : action ? "Melayani antrean" : name}
        </Text>
      </Billboard>
    </group>
  );
}

/** Hired warung staff, standing where the shop actually is. */
export function ShopStaff({ where }: { where: keyof typeof DEPTH }) {
  const staff = useStaff((s) => s.data?.staff);
  const hired = (staff ?? []).filter(
    (e) => e.business === "warung" && e.status === "active" && LOOK[e.kind],
  );
  if (!hired.length) return null;
  return (
    <group name={`ShopStaff-${where}`}>
      {hired.map((member) => (
        <StaffActor key={member.kind} kind={member.kind} name={member.name} where={where} />
      ))}
    </group>
  );
}
