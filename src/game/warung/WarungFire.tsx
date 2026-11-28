/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";

type V3 = [number, number, number];

/** Flickering flame cluster: three emissive cones whose scale jitters every frame. */
function Flame({ position, size = 1 }: { position: V3; size?: number }) {
  const group = useRef<Group>(null);
  const seed = position[0] * 7.3 + position[2] * 3.1;
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime * 9 + seed;
    g.children.forEach((c, i) => {
      const k = 1 + Math.sin(t + i * 2.1) * 0.18 + Math.sin(t * 1.7 + i) * 0.1;
      c.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    });
  });
  return (
    <group ref={group} position={position} scale={size}>
      {(
        [
          ["#ff5a1f", 0.42, 1.3, 0],
          ["#ff9f1c", 0.3, 0.95, 0.12],
          ["#ffe066", 0.16, 0.6, 0.22],
        ] as const
      ).map(([color, r, h, z]) => (
        <mesh key={color} position={[0, h / 2, z]}>
          <coneGeometry args={[r, h, 7]} />
          {/* Unlit and not tone-mapped so the flame stays saturated in daylight. */}
          <meshBasicMaterial
            color={color}
            toneMapped={false}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Dark smoke puffs rising and fading in a loop. */
function Smoke({ position }: { position: V3 }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      const p = (clock.elapsedTime * 0.35 + i / 3) % 1;
      c.position.set(Math.sin(p * 6 + i) * 0.3, p * 3, 0);
      c.scale.setScalar(0.4 + p * 1.1);
      ((c as Mesh).material as MeshStandardMaterial).opacity = 0.55 * (1 - p);
    });
  });
  return (
    <group ref={group} position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshStandardMaterial color="#3a3532" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function FireGlow({ position }: { position: V3 }) {
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = 5 + Math.sin(clock.elapsedTime * 13) * 1.5;
  });
  return <pointLight ref={light} position={position} color="#ff7a2a" distance={12} decay={1.6} />;
}

/** Petugas damkar aiming a hose; the water jet is a row of drops sliding along an arc. */
function Firefighter({ position, yaw, reach = 3 }: { position: V3; yaw: number; reach?: number }) {
  const drops = useRef<Group>(null);
  useFrame(({ clock }) => {
    drops.current?.children.forEach((c, i) => {
      const p = (clock.elapsedTime * 1.4 + i / 12) % 1;
      c.position.set(0, 1.2 + Math.sin(p * Math.PI) * 0.9 - p * 0.6, 0.4 + p * reach);
    });
  });
  return (
    <group position={position} rotation-y={yaw}>
      <BaseAvatarV2 avatar={NPC_AVATARS["npc-damkar"]} animation="Idle" speed={0} groundToWorld />
      <mesh position={[0.15, 1.15, 0.35]} rotation-x={Math.PI / 2.4}>
        <cylinderGeometry args={[0.05, 0.07, 0.55, 6]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      <group ref={drops}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial color="#8fd3ff" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Red damkar truck with a blinking siren bar. Local +x is its length. */
function FireTruck({ position, yaw }: { position: V3; yaw: number }) {
  const siren = useRef<Group>(null);
  useFrame(({ clock }) => {
    const on = Math.floor(clock.elapsedTime * 4) % 2 === 0;
    siren.current?.children.forEach((c, i) => {
      ((c as Mesh).material as MeshStandardMaterial).emissiveIntensity =
        on === (i === 0) ? 2.5 : 0.1;
    });
  });
  return (
    <group position={position} rotation-y={yaw}>
      <mesh position={[-0.4, 1.0, 0]}>
        <boxGeometry args={[3.2, 1.5, 1.7]} />
        <meshStandardMaterial color="#c8231c" roughness={0.6} />
      </mesh>
      <mesh position={[1.6, 0.85, 0]}>
        <boxGeometry args={[1.0, 1.2, 1.7]} />
        <meshStandardMaterial color="#d92b22" roughness={0.5} />
      </mesh>
      <mesh position={[1.95, 1.05, 0]}>
        <boxGeometry args={[0.32, 0.55, 1.5]} />
        <meshStandardMaterial color="#9fd2ea" roughness={0.2} />
      </mesh>
      {/* Ladder on the roof */}
      <mesh position={[-0.4, 1.85, 0]}>
        <boxGeometry args={[3.0, 0.08, 0.6]} />
        <meshStandardMaterial color="#d8d8d0" />
      </mesh>
      <mesh position={[-0.4, 1.05, 0.86]}>
        <boxGeometry args={[3.2, 0.12, 0.02]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>
      <group ref={siren} position={[1.6, 1.5, 0]}>
        {(["#ff2a2a", "#2a6bff"] as const).map((c, i) => (
          <mesh key={c} position={[0, 0, i ? 0.35 : -0.35]}>
            <boxGeometry args={[0.3, 0.14, 0.4]} />
            <meshStandardMaterial color={c} emissive={c} />
          </mesh>
        ))}
      </group>
      {[-1.4, 0.6, 1.6].flatMap((x) =>
        [-0.85, 0.85].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.32, z]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.32, 0.32, 0.2, 10]} />
            <meshStandardMaterial color="#1d1d1f" />
          </mesh>
        )),
      )}
      <Text
        position={[-0.4, 1.05, 0.87]}
        fontSize={0.32}
        color="#fff6e0"
        outlineWidth={0.015}
        outlineColor="#5a0d08"
      >
        DAMKAR
      </Text>
    </group>
  );
}

/**
 * Burning façade with a damkar truck and petugas spraying it. Same local frame as RenovationSite:
 * façade spans x ∈ [-width/2, width/2] at z = `front`, facing +z. No colliders.
 */
export function BurningSite({
  width,
  front,
  height,
}: {
  width: number;
  front: number;
  height: number;
}) {
  const xs = [-width * 0.36, -width * 0.05, width * 0.3];
  return (
    <group name="BurningSite">
      {xs.map((x, i) => (
        <Flame
          key={x}
          position={[x, i === 1 ? height * 0.55 : 0, front + 0.2]}
          size={1.2 + (i % 2) * 0.4}
        />
      ))}
      <Flame position={[width * 0.1, height - 0.2, front - 0.6]} size={1.6} />
      <Smoke position={[0, height, front - 0.5]} />
      <FireGlow position={[0, height * 0.5, front + 1.2]} />
      <FireTruck position={[0, 0, front + 4.2]} yaw={0} />
      <Firefighter position={[width / 2 - 0.6, 0, front + 3]} yaw={Math.PI + 0.35} />
      <Firefighter position={[-width / 2 + 0.8, 0, front + 2.8]} yaw={Math.PI - 0.3} reach={2.4} />
      <Billboard position={[0, height + 1.2, front + 0.4]}>
        <Text
          fontSize={0.32}
          color="#ffe2b0"
          outlineWidth={0.025}
          outlineColor="#5a0d08"
          textAlign="center"
          maxWidth={width}
        >
          {"🔥 KEBAKARAN · Damkar sedang memadamkan\nRenovasi untuk membangun ulang warung"}
        </Text>
      </Billboard>
    </group>
  );
}

/** Inside a burnt warung: flames on the racks and counter, one petugas at the door. */
export function BurningInside() {
  const spots: V3[] = [
    [-4, 1.2, -4.2],
    [0, 1.4, -4.2],
    [4, 1.2, -4.2],
    [-2.2, 1.1, -1],
    [2.4, 1.1, -1],
    [-5.3, 0, 2],
    [5.2, 0, 0.8],
  ];
  return (
    <group name="BurningInside">
      {spots.map((p) => (
        <Flame key={p.join()} position={p} size={0.9} />
      ))}
      <Smoke position={[0, 2.6, -2]} />
      <FireGlow position={[0, 2.4, -1.5]} />
      <Firefighter position={[3.8, 0, 2.6]} yaw={Math.PI + 0.64} reach={3.2} />
    </group>
  );
}
