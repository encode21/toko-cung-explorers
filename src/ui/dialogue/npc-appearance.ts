import { NPC_CONFIG } from "@/game/npc/population";
import { NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { DUNGEON_STAFF } from "@/game/dungeon/staff";

export function npcAppearance(id: string, avatarId?: string) {
  const config = NPC_CONFIG.find((npc) => npc.id === id);
  return NPC_AVATARS[avatarId ?? config?.avatarId ?? id] ?? DEFAULT_AVATAR;
}

export function dungeonNpcAppearance(name: string) {
  if (name === "Bima") {
    return {
      ...DEFAULT_AVATAR,
      outfit: "driver" as const,
      hair: "cap" as const,
      outfitColor: "#3d6b52",
    };
  }
  return DUNGEON_STAFF.find((staff) => staff.name === name)?.avatar ?? DEFAULT_AVATAR;
}
