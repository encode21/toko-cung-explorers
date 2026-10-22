/** @jsxImportSource @/game/jsx */
import { NPC_AVATARS } from "@/identity/characters";
import { QuestGiverMarker } from "@/game/daily/QuestGiverMarker";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useDaily } from "@/game/daily/store";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "@/state/game-store";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { useMovingInteractable } from "@/game/interactions/dynamic";
import { useWorldEditor, type WorldTarget } from "./store";
function AuthoredNpc({ target: t }: { target: WorldTarget }) {
  const ref = useRef<Group>(null);
  const talking = useGame((s) => s.overlay === "dialogue" && s.activeNpc === t.id);
  const giverOpen = useQuestGiverDialogue((s) => s.open);
  const greeting = talking || (t.archetype === "QUEST_GIVER" && giverOpen);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const p = useGame.getState().playerPos;
    const angle = greeting ? Math.atan2(p[0] - t.position.x, p[2] - t.position.z) : t.rotation.y;
    const diff = Math.atan2(
      Math.sin(angle - ref.current.rotation.y),
      Math.cos(angle - ref.current.rotation.y),
    );
    ref.current.rotation.y += diff * (1 - Math.exp(-8 * dt));
  });
  useMovingInteractable(ref, {
    id: t.id,
    label: t.name,
    persona: t.name,
    role: "warga",
    radius: t.radius,
  });
  return (
    <group
      ref={ref}
      position={[t.position.x, t.position.y, t.position.z]}
      rotation={[t.rotation.x, t.rotation.y, t.rotation.z]}
      scale={[t.scale.x, t.scale.y, t.scale.z]}
    >
      <BaseAvatarV2
        animation={greeting ? "Talk" : "Idle"}
        avatar={
          NPC_AVATARS[t.id] ??
          (t.archetype === "QUEST_GIVER" ? NPC_AVATARS["npc_daily_cung"] : undefined)
        }
      />
      <NpcLabel text={t.name} />
      {t.archetype === "QUEST_GIVER" && <QuestGiverMarker />}
    </group>
  );
}
/** An external entityId binds an existing actor; unbound NPC targets create stationary actors. */
export function AuthoredNpcs() {
  const dailyEnabled = useDaily((s) => s.enabled);
  const targets = useWorldEditor((s) => s.targets);
  const mode = useWorldEditor((s) => s.mode);
  const saved = useWorldEditor((s) => s.saved);
  const published: WorldTarget[] = mode === "EDITOR" ? targets : JSON.parse(saved);
  return (
    <>
      {published
        .filter(
          (t) =>
            (dailyEnabled || !t.tags.includes("daily")) &&
            t.active &&
            t.type === "NPC" &&
            (!t.entityId || t.entityId === t.id),
        )
        .map((t) => (
          <AuthoredNpc key={t.id} target={t} />
        ))}
    </>
  );
}
