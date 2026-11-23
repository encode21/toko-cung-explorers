/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { waterAt } from "@/game/swimming/model";
import { emitSplash } from "@/game/swimming/splash-pool";
import type { AvatarAnimation } from "./avatar-source";
/** Local and remote avatars only emit contacts; one world pool renders them all. */
export function WaterSplash({
  animation,
}: {
  animation?: AvatarAnimation | { current: AvatarAnimation | undefined } | undefined;
}) {
  const root = useRef<Group>(null);
  const s = useMemo(
    () => ({
      world: new Vector3(),
      previous: new Vector3(),
      wetPoint: new Vector3(),
      ready: false,
      wet: false,
      elapsed: 0,
      travel: 0,
      airborne: false,
    }),
    [],
  );
  useFrame(({ camera }, dt) => {
    if (!root.current) return;
    root.current.getWorldPosition(s.world);
    const water = waterAt(s.world.x, s.world.z),
      wet = !!water && water.depth >= 0.035 && s.world.y < water.surface + 0.025;
    const distance = s.ready ? s.world.distanceTo(s.previous) : 0,
      speed = distance / Math.max(dt, 0.001);
    const pose = typeof animation === "object" ? animation.current : animation;
    const airborne = pose === "Jump" || pose === "JumpFall";
    s.elapsed += dt;
    s.travel += distance;
    if (s.ready && distance < 3 && camera.position.distanceToSquared(s.world) < 1024) {
      if (wet !== s.wet) {
        const p = wet ? s.world : s.wetPoint;
        const fallSpeed = (s.previous.y - s.world.y) / Math.max(dt, 0.001);
        const kind = wet
          ? fallSpeed > 2.5 && (airborne || s.airborne)
            ? "plunge"
            : "entry"
          : "ripple";
        emitSplash(p.x, p.z, kind === "plunge" ? 1.5 : 0.55 + speed * 0.12, kind);
        s.elapsed = s.travel = 0;
      } else if (wet && s.travel > 0.3 && s.elapsed > (water!.depth > 1 ? 0.5 : 0.32)) {
        emitSplash(s.world.x, s.world.z, 0.3 + speed * 0.14, water!.depth > 1 ? "ripple" : "step");
        s.elapsed = s.travel = 0;
      }
    }
    if (wet) s.wetPoint.copy(s.world);
    if (distance >= 3) s.elapsed = s.travel = 0;
    s.wet = wet;
    s.airborne = airborne;
    s.ready = true;
    s.previous.copy(s.world);
  });
  return <group ref={root} />;
}
