/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { NpcLabel } from "@/game/world/NpcLabel";
import { Peci, QuestMarker } from "@/game/npc/QuestMarker";
import { KADES_LOCAL } from "@/game/npc/quest-marker";
import { useGame } from "@/state/game-store";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";

/** Fixed quest giver near the gang halte: stands still, waves when the player is close. Scene-local coords. */
export function PakKades() {
  const animation = useRef<AvatarAnimation | undefined>("Idle");
  useFrame(({ clock }) => {
    const p = useGame.getState().playerPos;
    const d = useQuestGiverDialogue.getState();
    const near = Math.hypot(p[0] - KADES_LOCAL[0], p[2] - KADES_LOCAL[2]) < 8;
    animation.current =
      d.open && d.giverId === "npc-pak-kades"
        ? "Talk"
        : near && Math.floor(clock.elapsedTime / 4) % 2 === 0
          ? "Wave"
          : "Idle";
  });
  return (
    <group name="PakKades" position={KADES_LOCAL} rotation-y={-Math.PI / 2}>
      <BaseAvatarV2 avatar={NPC_AVATARS["npc-pak-kades"]} animation={animation} playerAvatar />
      <Peci />
      <NpcLabel text="Pak Kades · Kerja Sambilan" />
      <QuestMarker host="kades" />
    </group>
  );
}
