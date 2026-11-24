/** @jsxImportSource @/game/jsx */
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { BaseAvatarV2, type AvatarV2Props } from "@/game/avatar/BaseAvatarV2";
import { EXPLORER_URL } from "@/game/avatar/explorer-rig";
import { NPC_AVATARS, npcExplorerLook } from "@/identity/characters";
import { useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { useGame } from "@/state/game-store";
import { lodCap, selectNear } from "./lod";

useGLTF.preload(EXPLORER_URL);

// One shared selection pass (4 Hz) over every mounted LodAvatar; each reads its own verdict.
const members = new Map<string, Group>();
let near: ReadonlySet<string> = new Set();
let lastStep = -1;
const tmp = new Vector3();
function step(now: number) {
  if (now - lastStep < 0.25) return;
  lastStep = now;
  const [px, , pz] = useGame.getState().playerPos;
  const candidates = [...members].map(([id, g]) => {
    g.getWorldPosition(tmp);
    return { id, x: tmp.x, z: tmp.z };
  });
  near = selectNear({ x: px, z: pz }, candidates, near, lodCap(useRenderBudget.getState().tier));
}

type Props = Pick<AvatarV2Props, "speed" | "animation" | "groundToWorld"> & {
  /** Unique across all LodAvatars (scene-prefix it). */
  lodId: string;
  /** Key into NPC_AVATARS. */
  avatarId: string;
};

/**
 * Light NPC model always mounted; the Explorer-rig twin mounts only while near the player (see lod.ts).
 * Both share the same animation/speed refs, so state carries over on the switch.
 */
export function LodAvatar({ lodId, avatarId, ...rest }: Props) {
  const root = useRef<Group>(null);
  const look = npcExplorerLook(avatarId);
  const [isNear, setNear] = useState(false);
  useEffect(() => {
    if (!look || !root.current) return;
    members.set(lodId, root.current);
    return () => {
      members.delete(lodId);
    };
  }, [lodId, look]);
  useFrame(({ clock }) => {
    if (!look) return;
    step(clock.elapsedTime);
    const n = near.has(lodId);
    if (n !== isNear) setNear(n);
  });
  return (
    <group ref={root}>
      <group visible={!isNear}>
        <BaseAvatarV2 avatar={NPC_AVATARS[avatarId]} {...rest} />
      </group>
      {isNear && look && <BaseAvatarV2 avatar={look} {...rest} playerAvatar />}
    </group>
  );
}
