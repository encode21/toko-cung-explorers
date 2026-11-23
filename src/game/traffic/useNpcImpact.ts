import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { emptyImpact } from "./ImpactReaction";
import { npcKnocks } from "./traffic-runtime";
import { NPC_KNOCK_COOLDOWN, NPC_KNOCK_SECONDS, npcImpactPose } from "./npc-impact";

/** Shared by pedestrians and waiting passengers; animation never moves their navigation root. */
export function useNpcImpact(
  id: string,
  root: RefObject<Group | null>,
  body: RefObject<Group | null>,
  enabled: boolean,
  onHit?: () => void,
) {
  const hit = useRef(emptyImpact());
  const [knocked, setKnocked] = useState(false);
  const clock = useThree((s) => s.clock);
  const callback = useRef(onHit);
  callback.current = onHit;
  useEffect(() => {
    if (!enabled) return;
    npcKnocks.set(id, (vx, vz) => {
      const g = root.current;
      if (!g || !g.visible || clock.elapsedTime - hit.current.at < NPC_KNOCK_COOLDOWN) return false;
      hit.current = {
        at: clock.elapsedTime,
        x: g.position.x,
        z: g.position.z,
        vx,
        vz,
        vy: 2.4,
        kind: "car",
        recovered: false,
      };
      callback.current?.();
      setKnocked(true);
      return true;
    });
    return () => {
      npcKnocks.delete(id);
    };
  }, [id, enabled, root, clock]);
  useFrame(() => {
    if (hit.current.recovered || !body.current || !root.current) return;
    const age = clock.elapsedTime - hit.current.at;
    const pose = npcImpactPose(age);
    const direction = Math.atan2(hit.current.vx, hit.current.vz) - root.current.rotation.y;
    body.current.position.set(
      Math.sin(direction) * pose.slide,
      pose.lift,
      Math.cos(direction) * pose.slide,
    );
    body.current.rotation.set(-pose.lean * Math.cos(direction), 0, pose.lean * Math.sin(direction));
    if (age >= NPC_KNOCK_SECONDS) {
      hit.current.recovered = true;
      setKnocked(false);
    }
  });
  return { hit, knocked };
}
