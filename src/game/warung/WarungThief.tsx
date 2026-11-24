/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { useGame } from "@/state/game-store";
import { useGang } from "@/game/gang/store";
import {
  catchThief,
  thiefEscaped,
  updateThiefPosition,
  useWarung,
  type ActiveThief,
} from "./store";

const THIEF_SPEED = 3.2; // m/s — slower than player run so chasing feels fair & exciting.
const CATCH_RADIUS = 2.4;

function ThiefBadge({ name }: { name: string }) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(220, 38, 38, 0.94)";
    ctx.beginPath();
    ctx.roundRect(14, 14, 228, 68, 22);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fef08a";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 26px system-ui, sans-serif";
    ctx.fillText("🚨 MALING!", 128, 38);
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.fillStyle = "#fef9c3";
    ctx.fillText(`${name} · Kejar!`, 128, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [name]);

  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;

  return (
    <Billboard position={[0, 2.38, 0]} follow>
      <mesh>
        <planeGeometry args={[1.65, 0.62]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

function ThiefActor({ thief }: { thief: ActiveThief }) {
  const ref = useRef<Group>(null);
  const posRef = useRef({ x: thief.x, z: thief.z });
  const lastSyncRef = useRef(0);
  const resolvedRef = useRef(false);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g || resolvedRef.current) return;
    const dt = Math.min(delta, 0.1);
    const dx = thief.targetX - posRef.current.x;
    const dz = thief.targetZ - posRef.current.z;
    const distToGoal = Math.hypot(dx, dz);

    if (distToGoal > 0.4) {
      const step = Math.min(distToGoal, THIEF_SPEED * dt);
      posRef.current.x += (dx / distToGoal) * step;
      posRef.current.z += (dz / distToGoal) * step;
      g.position.set(posRef.current.x, 0, posRef.current.z);
      g.rotation.y = Math.atan2(dx, dz);
    }

    // Check if the player caught up to the thief.
    const [px, , pz] = useGame.getState().playerPos;
    const distToPlayer = Math.hypot(px - posRef.current.x, pz - posRef.current.z);
    if (distToPlayer <= CATCH_RADIUS) {
      resolvedRef.current = true;
      catchThief();
      return;
    }

    const now = Date.now();
    if (distToGoal <= 1.8 || now >= thief.deadlineAt) {
      resolvedRef.current = true;
      thiefEscaped();
      return;
    }

    if (now - lastSyncRef.current > 250) {
      lastSyncRef.current = now;
      updateThiefPosition(posRef.current.x, posRef.current.z);
    }
  });

  return (
    <group ref={ref} position={[thief.x, 0, thief.z]} name={`WarungThief-${thief.id}`}>
      <BaseAvatarV2
        avatar={NPC_AVATARS["npc-pedestrian-2"]}
        animation="Walk"
        speed={2.2}
        groundToWorld
      />
      {/* Black ski beanie + burglar eye mask */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.245, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color="#111827" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.48, 0.19]}>
        <boxGeometry args={[0.3, 0.08, 0.06]} />
        <meshStandardMaterial color="#09090b" roughness={0.6} />
      </mesh>
      {/* Brown loot sack on back */}
      <mesh position={[0, 1.12, -0.26]} rotation={[0.22, 0, 0]}>
        <sphereGeometry args={[0.26, 10, 8]} />
        <meshStandardMaterial color="#92623a" roughness={0.9} />
      </mesh>
      <ThiefBadge name={thief.name} />
    </group>
  );
}

/** Renders the fleeing thief (city or kampung) when the player leaves their warung unlocked. */
export function WarungThief() {
  const inside = useWarung((s) => !!s.inside);
  const thief = useWarung((s) => s.thief);
  const inGang = useGang((s) => s.inside !== null);
  const wrongScene = !!thief && !!thief.gang !== inGang;
  // Changing scene mid-chase: the thief just gets away empty-handed, no instant loss on return.
  useEffect(() => {
    if (wrongScene) useWarung.setState({ thief: null, nextThiefAt: Date.now() + 90_000 });
  }, [wrongScene]);
  if (inside || !thief || wrongScene) return null;
  return <ThiefActor key={thief.id} thief={thief} />;
}
