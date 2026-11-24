/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { PICKUP_SPOT, type LotCard } from "./model";
import { useWarung } from "./store";

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "box",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

/** A small stack of cardboard boxes (dus) with tape, n boxes, max 6 drawn. */
function boxStack(n: number, ox = 0, oz = 0): AssetPart[] {
  const out: AssetPart[] = [];
  for (let i = 0; i < Math.min(n, 6); i++) {
    const x = ox + (i % 2) * 0.55;
    const y = 0.2 + Math.floor(i / 2) * 0.4;
    out.push(
      part([x, y, oz], [0.5, 0.38, 0.42], "#c49a6c"),
      part([x, y + 0.195, oz], [0.5, 0.015, 0.1], "#e8d6a8", "box", "plastic"),
    );
  }
  return out;
}

/** Ground ring + label while this player still has dus to pick up. */
function PickupBeacon() {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.08);
  });
  return (
    <group name="KulakanPickupBeacon">
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.08}>
        <ringGeometry args={[1.15, 1.35, 40]} />
        <meshBasicMaterial color="#ffce52" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Billboard position={[0, 2.2, 0]}>
        <Text fontSize={0.28} color="#fff4cc" outlineWidth={0.02} outlineColor="#4b2a12">
          AMBIL DUS DI SINI
        </Text>
      </Billboard>
    </group>
  );
}

/** "Bawa sendiri" boxes waiting at Toko Cung's pickup area, one labelled stack per player. */
export function PickupPiles() {
  const pickups = useWarung((s) => s.pickups);
  const mine = useWarung((s) =>
    (s.data?.shipments ?? []).some((x) => x.mode === "ambil" && x.status === "PENDING"),
  );
  if (!pickups.length && !mine) return null;
  return (
    <group name="KulakanPickups" position={[PICKUP_SPOT[0], 0, PICKUP_SPOT[1]]}>
      {mine && <PickupBeacon />}
      {pickups.slice(0, 6).map((p, i) => {
        const ox = (i % 3) * 1.4 - 1.4;
        const oz = Math.floor(i / 3) * 1.3;
        return (
          <group key={p.warungId} position={[ox, 0, oz]}>
            <StyledBatch items={boxStack(p.boxes)} />
            <Billboard position={[0.27, 1.55, 0]}>
              <Text fontSize={0.2} color="#fff9e9" outlineWidth={0.02} outlineColor="#4b2a12">
                {`📦 ${p.owner ?? "Pemain"} · ${p.boxes} dus`}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

/** Boxes in your arms while carrying a "bawa sendiri" kulakan; mounted in the player's visual group. */
export function CarriedBoxes() {
  const boxes = useWarung((s) =>
    (s.data?.shipments ?? [])
      .filter((x) => x.status === "CARRYING")
      .reduce((a, x) => a + x.boxes, 0),
  );
  const items = useMemo(() => boxStack(Math.min(boxes, 3), -0.27, 0), [boxes]);
  if (!boxes) return null;
  // Held in front of the chest, like MissionParcel.
  return (
    <group name="CarriedBoxes" position={[0, 0.8, 0.45]}>
      <StyledBatch items={items} />
    </group>
  );
}

const TRUCK: AssetPart[] = [
  part([1.7, 0.95, 0], [1.3, 1.5, 2.0], "#e2483d", "bevel"),
  part([2.12, 1.2, 0], [0.5, 0.6, 1.8], "#bfe6f7", "box", "glass"),
  part([-0.6, 1.25, 0], [3.4, 2.1, 2.1], "#fffaf0", "bevel"),
  part([-0.6, 0.32, 0], [4.6, 0.25, 2.0], "#40525c", "box", "metal"),
  ...[-1.6, 0.4, 1.8].flatMap((x) => [
    part([x, 0.35, 1.02], [0.7, 0.7, 0.25], "#2b2b2b", "cylinder"),
    part([x, 0.35, -1.02], [0.7, 0.7, 0.25], "#2b2b2b", "cylinder"),
  ]),
];

/** Unload window before the truck's eta: a helper walks boxes from the truck to the door. */
const UNLOAD_MS = 25_000;

/**
 * Toko Cung delivery truck parked in front of a warung until its eta (everyone in the channel sees
 * it), with an NPC carrying dus to the door in the last stretch.
 */
export function DeliveryTruck({ card, depth }: { card: LotCard; depth: number }) {
  const root = useRef<Group>(null);
  const porter = useRef<Group>(null);
  const roadZ = depth / 2 + 3.4;
  useFrame(() => {
    const eta = card.truckEta ?? 0;
    const left = eta - Date.now();
    if (root.current) root.current.visible = left > -5_000;
    const p = porter.current;
    if (!p) return;
    p.visible = left > -2_000 && left < UNLOAD_MS;
    if (!p.visible) return;
    // Ping-pong between the truck tail and the house front every 5 s.
    const t = (Date.now() % 5_000) / 5_000;
    const k = t < 0.5 ? t * 2 : 2 - t * 2;
    p.position.set(-2.4 + k * 2.4, 0, roadZ - 1.2 - k * (roadZ - depth / 2 - 0.4));
    p.rotation.y = t < 0.5 ? Math.PI * 0.85 : -Math.PI * 0.15;
  });
  if (!card.truckEta) return null;
  return (
    <group ref={root} name="DeliveryTruck">
      <group position={[0, 0, roadZ]}>
        <StyledBatch items={TRUCK} />
        <Text position={[-0.6, 1.5, 1.07]} fontSize={0.34} color="#e2483d" fontWeight={800}>
          TOKO CUNG
        </Text>
      </group>
      <group ref={porter} visible={false}>
        <BaseAvatarV2
          avatar={NPC_AVATARS["npc-courier"]}
          animation="Walk"
          speed={1.2}
          groundToWorld
        />
        <group position={[0, 1.05, 0.32]}>
          <StyledBatch items={boxStack(1, 0, 0)} />
        </group>
      </group>
    </group>
  );
}
