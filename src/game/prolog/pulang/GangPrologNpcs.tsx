/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useGang } from "@/game/gang/store";
import { useProlog } from "../store";
import { NEIGHBOR_AVATAR, neighborSpot, type Neighbor } from "./steps";

function NeighborNpc({
  who,
  at,
  yaw,
}: {
  who: Neighbor;
  at: [number, number, number];
  yaw: number;
}) {
  const animation = useRef<AvatarAnimation | undefined>("Talk");
  const speed = useRef(0);
  const name = useProlog((s) => s.data?.text[who] ?? "");
  return (
    <group position={at} rotation-y={yaw} name={`PrologNeighbor:${who}`}>
      <BaseAvatarV2
        avatar={NPC_AVATARS[NEIGHBOR_AVATAR[who]]}
        animation={animation}
        speed={speed}
      />
      <NpcLabel text={name} />
    </group>
  );
}
/** Bu Romlah + Pak RT Kosim wait at the own teras during prolog v2 (Bu Romlah stays as first buyer). */
export function GangPrologNpcs() {
  const step = useProlog((s) =>
    s.data?.version === 2 && !s.data.completedAt ? s.data.step : null,
  );
  useGang((s) => s.data);
  if (!step || !["gang", "reveal", "map", "koko", "path", "goal"].includes(step)) return null;
  const who: Neighbor[] = step === "gang" ? ["romlah", "kosim"] : ["romlah"];
  return (
    <>
      {who.map((n) => {
        const at = neighborSpot(n);
        return at ? (
          <NeighborNpc key={n} who={n} at={at} yaw={at[0] < 6000 ? Math.PI / 2 : -Math.PI / 2} />
        ) : null;
      })}
    </>
  );
}
