/** @jsxImportSource @/game/jsx */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { SpeechBubble } from "@/game/net/PlayerChatBubble";
import { useRenderBudget, selectBudgetLow } from "@/game/engine/AdaptiveQuality";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";
import { barkSituation, pickBark, type BarkRole, type BarkWeather } from "./barks";
import { quarrels } from "./quarrel";

export interface BarkActor {
  id: string;
  role: BarkRole;
  /** World position. */
  x: number;
  z: number;
}

/** One bubble at a time: every 6-12 s a nearby NPC says a line for ~4 s. */
export function Barks({
  list,
  weather,
  warung,
}: {
  list: (seconds: number) => BarkActor[];
  /** Plug-in point for the weather module; absent means dry. */
  weather?: () => BarkWeather;
  /** World x, z of the shop front; NPCs within 10 m use the "warung" lines. */
  warung?: [number, number];
}) {
  const low = useRenderBudget(selectBudgetLow);
  const group = useRef<Group>(null);
  const [say, setSay] = useState<{ id: string; text: string } | null>(null);
  const next = useRef(6 + Math.random() * 6);
  const until = useRef(0);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (say) {
      const a = list(t).find((n) => n.id === say.id);
      if (a) group.current?.position.set(a.x, 0, a.z);
      if (t > until.current || !a) {
        setSay(null);
        next.current = t + 6 + Math.random() * 6;
      }
      return;
    }
    if (t < next.current) return;
    next.current = t + 6 + Math.random() * 6;
    const game = useGame.getState();
    if (low || quarrels.active) return;
    const [px, , pz] = game.playerPos;
    const near = list(t).filter(
      (n) => n.id !== game.activeNpc && n.role !== "owner" && Math.hypot(n.x - px, n.z - pz) < 12,
    );
    const a = near[Math.floor(Math.random() * near.length)];
    if (!a) return;
    const nearWarung = !!warung && Math.hypot(a.x - warung[0], a.z - warung[1]) < 10;
    const text = pickBark(
      a.role,
      barkSituation(useSceneTime.getState().minutes, nearWarung, weather?.()),
      Math.floor(Math.random() * 1000),
    );
    until.current = t + 4;
    setSay({ id: a.id, text });
  });
  return (
    <group ref={group}>
      {say && <SpeechBubble senderId={say.id} text={say.text} height={2.3} />}
    </group>
  );
}
