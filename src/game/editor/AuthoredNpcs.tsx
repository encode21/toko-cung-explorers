/** @jsxImportSource @/game/jsx */
import { QuestGiverMarker } from "@/game/daily/QuestGiverMarker";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useDaily } from "@/game/daily/store";
import { useRef } from "react";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { useMovingInteractable } from "@/game/interactions/dynamic";
import { useWorldEditor, type WorldTarget } from "./store";
function AuthoredNpc({ target: t }: { target: WorldTarget }) {
  const ref = useRef<Group>(null);
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
        animation="Idle"
        {...(t.archetype === "QUEST_GIVER" ? { character: "koko-cung" as const } : {})}
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
