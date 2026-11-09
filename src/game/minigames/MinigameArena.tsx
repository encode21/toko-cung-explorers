/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { Group, Object3D } from "three";
import { useGame } from "@/state/game-store";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { useMinigames, miniRacePose } from "./store";
import { MINI_NAMES } from "./model";

const raceLines: OutdoorPart[] = [
  ...Array.from(
    { length: 9 },
    (_, i) =>
      ({ p: [100, 0.05, 28.7 + i * 1.6], s: [26, 0.03, 0.07], color: "#f9edd2" }) as OutdoorPart,
  ),
  { p: [88, 0.06, 35], s: [0.15, 0.03, 13], color: "#f5cd66" },
  { p: [112, 0.06, 35], s: [0.3, 0.03, 13], color: "#ef887a" },
];
const fence: OutdoorPart[] = [
  ...[90, 118].flatMap((x) =>
    [0.4, 0.85].map(
      (y) => ({ p: [x, y, 35.5], s: [0.12, 0.12, 14], color: "#c28f66" }) as OutdoorPart,
    ),
  ),
  ...[0.4, 0.85].flatMap(
    (y) =>
      [
        { p: [104, y, 28.5], s: [28, 0.12, 0.12], color: "#c28f66" },
        ...[96, 112].map((x) => ({ p: [x, y, 42.5], s: [12, 0.12, 0.12], color: "#c28f66" })),
      ] as OutdoorPart[],
  ),
  ...[90, 97, 104, 111, 118].flatMap((x) =>
    [28.5, 42.5].map(
      (z) => ({ p: [x, 0.55, z], s: [0.18, 1.1, 0.18], color: "#91694f" }) as OutdoorPart,
    ),
  ),
];
function Chicken({ id }: { id: number }) {
  const ref = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const legs = useRef<(Object3D | null)[]>([]);
  const track = useRef({ server: 0, at: 0, x: 0, z: 0, vx: 0, vz: 0, step: 0 });
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05),
      s = useMinigames.getState(),
      c = s.round?.chickens[id],
      g = ref.current,
      k = track.current;
    if (!c || !g) return;
    g.visible = c.available;
    if (s.receivedAt !== k.at) {
      // Polls arrive ~1 Hz; the server path is a slow smooth curve, so dead-reckon between them.
      const span = (s.serverNow - k.server) / 1000,
        moved = Math.hypot(c.x - k.x, c.z - k.z),
        fresh = !k.at || moved > 4;
      k.vx = !fresh && span > 0.2 && span < 3 ? (c.x - k.x) / span : 0;
      k.vz = !fresh && span > 0.2 && span < 3 ? (c.z - k.z) / span : 0;
      if (fresh) g.position.set(c.x, 0, c.z);
      Object.assign(k, { server: s.serverNow, at: s.receivedAt, x: c.x, z: c.z });
    }
    const ahead = Math.min(1.5, (performance.now() - k.at) / 1000),
      blend = 1 - Math.exp(-6 * dt),
      speed = Math.hypot(k.vx, k.vz);
    g.position.x += (k.x + k.vx * ahead - g.position.x) * blend;
    g.position.z += (k.z + k.vz * ahead - g.position.z) * blend;
    if (speed > 0.05) {
      const turn = Math.atan2(k.vx, k.vz) - g.rotation.y;
      g.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-5 * dt));
    }
    const gait = Math.min(1, speed / 0.6);
    k.step += dt * (3 + speed * 12);
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(k.step + i * Math.PI) * 0.7 * gait;
    });
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.abs(Math.sin(k.step)) * 0.05 * gait;
      bodyRef.current.rotation.z = Math.sin(k.step) * 0.08 * gait;
    }
  });
  return (
    <group ref={ref} name={`event-chicken-${id}`}>
      <group ref={bodyRef}>
        <mesh position={[0, 0.42, 0]} scale={[0.55, 0.5, 0.7]}>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial color="#fff1d6" />
        </mesh>
        <mesh position={[0, 0.67, 0.28]}>
          <sphereGeometry args={[0.16, 8, 6]} />
          <meshStandardMaterial color="#fff1d6" />
        </mesh>
        <mesh position={[0, 0.82, 0.28]}>
          <boxGeometry args={[0.08, 0.15, 0.18]} />
          <meshStandardMaterial color="#df6858" />
        </mesh>
        <mesh position={[0, 0.65, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.09, 0.18, 4]} />
          <meshStandardMaterial color="#edb54f" />
        </mesh>
      </group>
      {[-0.12, 0.12].map((x, i) => (
        // Pivot at the hip so the swing reads as a step.
        <group key={x} position={[x, 0.25, 0]} ref={(m) => void (legs.current[i] = m)}>
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.05, 0.23, 0.06]} />
            <meshStandardMaterial color="#edb54f" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Sack({ id }: { id: string }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const p = miniRacePose(id),
      g = ref.current;
    if (!g) return;
    g.visible = !!p;
    if (p) g.position.set(p.x, p.y - 0.83, p.z);
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.43, 0.32, 0.72, 8, 1, true]} />
        <meshStandardMaterial color="#c6a371" side={2} />
      </mesh>
      <mesh position={[0, 0.69, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.035, 4, 8]} />
        <meshStandardMaterial color="#866b49" />
      </mesh>
    </group>
  );
}
export function MinigameArena() {
  const r = useMinigames((s) => s.round),
    near = useGame((s) => Math.hypot(s.playerPos[0] - 104, s.playerPos[2] - 35) <= 55);
  if (!r || !near) return null;
  return (
    <group name="minigame-arena">
      <Text position={[104, 3.4, 43.4]} rotation={[0, Math.PI, 0]} fontSize={0.65} color="#fff5dd">
        {MINI_NAMES[r.game]}
      </Text>
      {r.game === "QUIZ" && (
        <>
          <OutdoorBatch
            items={[
              { p: [93, 0.05, 35], s: [18, 0.04, 14], color: "#85c4ad" },
              { p: [115, 0.05, 35], s: [18, 0.04, 14], color: "#e7a28c" },
            ]}
          />
          {[
            { x: 93, label: "B · BENAR" },
            { x: 115, label: "S · SALAH" },
          ].map((v) => (
            <Text
              key={v.x}
              position={[v.x, 0.09, 35]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.2}
              color="#fff8ee"
            >
              {v.label}
            </Text>
          ))}
        </>
      )}
      {r.game === "SACK" && (
        <>
          <OutdoorBatch items={raceLines} />
          {[
            { x: 88, label: "MULAI" },
            { x: 112, label: "FINIS" },
          ].map((v) => (
            <Text
              key={v.x}
              position={[v.x, 0.1, 42]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.7}
              color="#79584d"
            >
              {v.label}
            </Text>
          ))}
          {r.players.map((p) => (
            <Sack key={p.connectionId} id={p.connectionId} />
          ))}
        </>
      )}
      {r.game === "CHICKEN" && (
        <>
          <OutdoorBatch items={fence} />
          <RigidBody type="fixed" colliders={false}>
            {[90, 118].map((x) => (
              <CuboidCollider key={x} position={[x, 0.5, 35.5]} args={[0.1, 0.5, 7]} />
            ))}
            <CuboidCollider position={[104, 0.5, 28.5]} args={[14, 0.5, 0.1]} />
            {[96, 112].map((x) => (
              <CuboidCollider key={x} position={[x, 0.5, 42.5]} args={[6, 0.5, 0.1]} />
            ))}
          </RigidBody>
          {[0, 1, 2, 3, 4].map((i) => (
            <Chicken key={i} id={i} />
          ))}
        </>
      )}
    </group>
  );
}
