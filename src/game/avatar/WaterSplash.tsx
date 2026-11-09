/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { waterAt } from "@/game/swimming/model";
import { emitSplash } from "@/game/swimming/splash-pool";
/** Local and remote avatars only emit contacts; one world pool renders them all. */
export function WaterSplash() {
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
    }),
    [],
  );
  useFrame(({ camera }, dt) => {
    if (!root.current) return;
    root.current.getWorldPosition(s.world);
    const water = waterAt(s.world.x, s.world.z),
      wet = !!water && s.world.y < water.surface + 0.025;
    const distance = s.ready ? s.world.distanceTo(s.previous) : 0,
      speed = distance / Math.max(dt, 0.001);
    s.elapsed += dt;
    s.travel += distance;
    if (s.ready && distance < 3 && camera.position.distanceToSquared(s.world) < 1024) {
      if (wet !== s.wet) {
        const p = wet ? s.world : s.wetPoint;
        emitSplash(p.x, p.z, 0.55 + speed * 0.12);
        s.elapsed = s.travel = 0;
      } else if (wet && s.travel > 0.3 && s.elapsed > (water!.depth > 1 ? 0.5 : 0.32)) {
        emitSplash(s.world.x, s.world.z, 0.3 + speed * 0.14);
        s.elapsed = s.travel = 0;
      }
    }
    if (wet) s.wetPoint.copy(s.world);
    if (distance >= 3) s.elapsed = s.travel = 0;
    s.wet = wet;
    s.ready = true;
    s.previous.copy(s.world);
  });
  return <group ref={root} />;
}
