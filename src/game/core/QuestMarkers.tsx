/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { resolveObjective } from "@/game/editor/resolve";
import { useWorldEditor } from "@/game/editor/store";
import { Text } from "@react-three/drei";
import { SecretClueProp } from "@/game/secret/SecretClueProp";
import { useSecretQuest } from "@/game/secret/store";
import { useDungeon } from "@/game/dungeon/store";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { useGameCore } from "./store";
/** Lightweight quest props. No collision, map, navigation, or player-root changes. */
export function QuestMarkers() {
  const marker = useRef<Group>(null);
  const gem = useRef<Mesh>(null);
  const tracked = useRef<Parameters<typeof resolveObjective>[0] | null>(null);
  useWorldEditor((s) => s.targets);
  useWorldEditor((s) => s.saved);
  useWorldEditor((s) => s.mode);
  useFrame(({ clock }) => {
    if (gem.current) {
      gem.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.2);
      gem.current.position.y = 2.05 + Math.sin(clock.elapsedTime * 2) * 0.12;
    }
    if (!marker.current || !tracked.current) return;
    if (tracked.current.targetType !== "NPC" && !tracked.current.targetId) return;
    const p = resolveObjective(tracked.current).position;
    if (p && p.length >= 3) marker.current.position.set(p[0], p[1], p[2]);
  });
  const snapshot = useGameCore((s) => s.snapshot);
  const dungeon = useDungeon((s) => s.data);
  const revealSecrets = useSecretQuest((s) => s.revealMarkers);
  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  // Prefer live dungeon WORLD objective (authoritative while in Principal mission).
  const dObj = (() => {
    const i = dungeon?.instance;
    const c = dungeon?.config;
    if (!i || i.status !== "ACTIVE" || (i.realm ?? "DUNGEON") !== "WORLD" || !c) return null;
    const index = c.objectives.findIndex((o, n) => (i.progress[n] ?? 0) < o.required);
    return index >= 0 ? c.objectives[index] : null;
  })();
  const o =
    dObj ??
    (() => {
      if (!quest || !run) return null;
      const index = quest.objectives.findIndex((obj, i) => (run.progress[i] ?? 0) < obj.required);
      const next = quest.objectives[index];
      if (!next || (quest.dungeon_id && next.realm !== "WORLD")) return null;
      return next;
    })();
  tracked.current = o ?? null;
  if (!o) return <SecretClueProp />;
  // Secret clues use an environmental scrap/sparkle instead of a loud waypoint.
  if (o.secret || quest?.category === "EASTER_EGG") return <SecretClueProp />;
  // DEV reveal still falls through to SecretClueProp via the component itself.
  if (o.hidden && !revealSecrets) return null;
  // Bima / dock landmarks are authoritative when instance config is stale.
  const resolved = resolveObjective(o);
  const at = o.targetId ? resolved.position : worldLandmarkFor(o.target, o.position ?? [0, 0, 0]);
  if (!at || at.length < 3 || at.some((n) => typeof n !== "number" || Number.isNaN(n))) {
    return null;
  }
  return (
    <group ref={marker} position={at}>
      <mesh ref={gem} position={[0, 2.05, 0]}>
        <octahedronGeometry args={[0.22]} />
        <meshStandardMaterial color="#f6c453" emissive="#b97714" emissiveIntensity={0.45} />
      </mesh>
      <Text
        position={[0, 2.55, 0]}
        fontSize={0.22}
        color="#ffdf7d"
        outlineWidth={0.025}
        outlineColor="#203b35"
        maxWidth={4}
        textAlign="center"
      >
        {o.target === "supplier-confirm"
          ? "Bima · Pos Supplier"
          : o.type === "FIND"
            ? "✦ Petunjuk"
            : o.type === "COLLECT"
              ? "Peti quest"
              : o.type === "DELIVER"
                ? "Serahkan di sini"
                : "! Quest"}
      </Text>
    </group>
  );
}
