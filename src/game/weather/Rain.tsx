/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRenderBudget, selectBudgetLow } from "@/game/engine/AdaptiveQuality";
import { useGame } from "@/state/game-store";
import { isHomeRoom } from "@/game/home/model";
import { isMountainPosition } from "@/game/mountain/model";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { useClub } from "@/game/club/store";
import { currentWeather } from "./store";
import { audioZoneAt } from "@/game/audio/world-acoustics";

const SPAN = 36,
  HEIGHT = 18,
  FALL = 20;

/** Rain streaks in a box that follows the camera; count scales with rain strength. Outdoors only. */
export function Rain() {
  const low = useRenderBudget(selectBudgetLow);
  const max = low ? 500 : 1400;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: 1400 }, () => [
        (Math.random() - 0.5) * SPAN,
        Math.random() * HEIGHT,
        (Math.random() - 0.5) * SPAN,
      ]),
    [],
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ camera }, delta) => {
    const r = mesh.current;
    if (!r) return;
    const p = useGame.getState().playerPos;
    const indoors =
      isHomeRoom(p[0], p[2]) ||
      ["retail", "cashier", "warehouse"].includes(audioZoneAt(p[0], p[2])) ||
      isMountainPosition(p[0], p[2]) ||
      !!useWarung.getState().inside ||
      !!useUsaha.getState().inside ||
      (!!useClub.getState().inside && !useClub.getState().outdoor);
    const rain = indoors ? 0 : currentWeather().rain;
    r.count = Math.round(max * rain);
    r.visible = r.count > 0;
    if (!r.visible) return;
    const cx = camera.position.x,
      cz = camera.position.z,
      top = camera.position.y + HEIGHT / 2;
    for (let i = 0; i < r.count; i++) {
      const d = drops[i]!;
      d[1] = d[1]! - FALL * Math.min(delta, 0.1);
      if (d[1]! < 0) d[1] = HEIGHT;
      // Wrap around the camera so streaks never run out as the player moves.
      const x = cx + ((((d[0]! - cx) % SPAN) + SPAN * 1.5) % SPAN) - SPAN / 2;
      const z = cz + ((((d[2]! - cz) % SPAN) + SPAN * 1.5) % SPAN) - SPAN / 2;
      m.makeTranslation(x, top - HEIGHT + d[1]!, z);
      r.setMatrixAt(i, m);
    }
    r.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 1400]} frustumCulled={false}>
      <boxGeometry args={[0.015, 0.55, 0.015]} />
      <meshBasicMaterial color="#b9d2e3" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}
