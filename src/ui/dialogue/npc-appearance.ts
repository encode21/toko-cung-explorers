import { NPC_CONFIG } from "@/game/npc/population";
import { NPC_AVATARS, npcExplorerLook } from "@/identity/characters";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { DUNGEON_STAFF } from "@/game/dungeon/staff";

/** Portrait look: the gendered explorer twin when there is one, so a "Mbak" never shows a male body. */
export function npcAppearance(id: string, avatarId?: string) {
  const config = NPC_CONFIG.find((npc) => npc.id === id);
  const preset = avatarId ?? config?.avatarId ?? id;
  return npcExplorerLook(preset) ?? NPC_AVATARS[preset] ?? DEFAULT_AVATAR;
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
