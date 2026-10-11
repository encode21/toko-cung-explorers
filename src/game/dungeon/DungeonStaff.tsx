/** @jsxImportSource @/game/jsx */
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NpcLabel } from "@/game/world/NpcLabel";
import { DUNGEON_STAFF } from "./staff";
export function DungeonStaff({ legacy = false }: { legacy?: boolean }) {
  return (
    <group>
      {(legacy ? DUNGEON_STAFF.slice(0, 1) : DUNGEON_STAFF).map((staff) => (
        <group key={staff.id} position={legacy ? [0, 0, 7] : staff.position}>
          <BaseAvatarV2 avatar={staff.avatar} speed={0} />
          <NpcLabel text={`${staff.name} · ${staff.role}`} />
        </group>
      ))}
    </group>
  );
}
