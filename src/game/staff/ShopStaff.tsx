/** @jsxImportSource @/game/jsx */
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

/** Hired warung staff, standing where the shop actually is. */
export function ShopStaff({ where }: { where: keyof typeof DEPTH }) {
  const staff = useStaff((s) => s.data?.staff);
  const hired = (staff ?? []).filter((e) => e.business === "warung" && e.status === "active" && LOOK[e.kind]);
  if (!hired.length) return null;
  return (
    <group name={`ShopStaff-${where}`}>
      {hired.map((member) => {
        const look = LOOK[member.kind]!;
        return (
          <group key={member.kind} position={[look.x, 0, DEPTH[where]]}>
            <LodAvatar lodId={`staff:${where}:${member.kind}`} avatarId={look.avatar} />
            <Billboard position={[0, 2.15, 0]}>
              <Text fontSize={0.16} color="#fff6d0" outlineWidth={0.02} outlineColor="#3a2414">
                {member.name}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
