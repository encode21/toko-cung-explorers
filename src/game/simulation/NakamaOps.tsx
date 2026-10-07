/** @jsxImportSource @/game/jsx */
import { conversationStep, createBehavior, turnToward } from "@/game/npc/behavior";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useRef, useState } from "react";
import * as THREE from "three";
import { GAME_ASSETS } from "@/assets/game-assets";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { Model } from "@/game/world/Model";
import { interactableById } from "@/game/interactions/interactables";
import { P } from "@/game/world/palette";
import { useGame } from "@/state/game-store";
import { useOps } from "@/state/ops-store";

type Pt = { x: number; z: number };

const SHELF_FRONT: Pt = { x: 3.4, z: -19 };
const PALLET: Pt = { x: 5.2, z: -16.6 };
const PALLET_SIDE: Pt = { x: 3.9, z: -16.6 };
const PACK_TABLE: Pt = { x: -3.6, z: -15.3 };
const COURIER: Pt = { x: 6.8, z: -15.1 };

// Worker routes stay inside the approved operational footprint.
const TO_PALLET: Pt[] = [{ x: 3.4, z: -17.8 }, PALLET_SIDE];
const TO_SHELF: Pt[] = [{ x: 3.4, z: -17.8 }, SHELF_FRONT];
const TABLE_TO_PALLET: Pt[] = [{ x: 0, z: -17.8 }, { x: 3.9, z: -17.8 }, PALLET_SIDE];
const PALLET_TO_TABLE: Pt[] = [
  { x: 3.9, z: -17.8 },
  { x: 0, z: -17.8 },
  { x: -1.8, z: -17.8 },
  { x: -1.8, z: -14.4 },
  { x: -3.6, z: -14.4 },
  PACK_TABLE,
];
const TABLE_TO_COURIER: Pt[] = [{ x: -3.6, z: -14.4 }, { x: 2.4, z: -14.4 }, COURIER];
const COURIER_TO_TABLE: Pt[] = [...TABLE_TO_COURIER].reverse().slice(1).concat(PACK_TABLE);

const WALK_SPEED = 1.9;

/** Gerakkan group ke target; true jika sudah sampai. */
function step(group: THREE.Group, target: Pt, delta: number, speed = WALK_SPEED) {
  const dx = target.x - group.position.x;
  const dz = target.z - group.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.12) return true;
  const k = Math.min(1, (speed * delta) / dist);
  const player = useGame.getState().playerPos;
  if (
    Math.hypot(group.position.x + dx * k - player[0], group.position.z + dz * k - player[2]) < 0.9
  )
    return false;
  group.position.x += dx * k;
  group.position.z += dz * k;
  const want = Math.atan2(dx, dz);
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, want, 1 - Math.exp(-9 * delta));
  return false;
}

function CarriedBox({ visible }: { visible: boolean }) {
  return (
    <mesh visible={visible} position={[0.16, 1.02, 0.42]} castShadow>
      <boxGeometry args={[0.44, 0.36, 0.4]} />
      <meshStandardMaterial color={P.carton} roughness={0.8} />
    </mesh>
  );
}

/** Palet gudang: tumpukan dus tumbuh saat Nakama menaruh stok. */
function Pallet() {
  const boxes = useOps((s) => s.palletBoxes);
  return (
    <group position={[PALLET.x, 0.06, PALLET.z]}>
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.5, 0.16, 1.5]} />
        <meshStandardMaterial color={P.woodDark} roughness={0.9} />
      </mesh>
      {Array.from({ length: boxes }).map((_, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        return (
          <mesh
            key={i}
            position={[col === 0 ? -0.32 : 0.32, 0.4 + row * 0.5, (i % 3) * 0.06]}
            castShadow
          >
            <boxGeometry args={[0.56, 0.48, 0.56]} />
            <meshStandardMaterial color={i % 2 ? P.carton : P.cartonTape} roughness={0.85} />
          </mesh>
        );
      })}
      <Text position={[0, 2.5, 0]} fontSize={0.22} color="#8c8272" anchorX="center">
        {`PALET · ${boxes} DUS`}
      </Text>
    </group>
  );
}

function Label({ text, show }: { text: string; show: boolean }) {
  void show;
  return <NpcLabel text={text} />;
}

/**
 * Nakama Gudang: inspect stock and carry cartons within the warehouse.
 */
function Restocker() {
  const ref = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  const [carry, setCarry] = useState(false);
  // Start beside stock; the retail aisle remains reserved for customers/store staff.
  const phase = useRef<"toShelf" | "pick" | "toPallet" | "place">("pick");
  const idx = useRef(0);
  const timer = useRef(0);
  const nearby = useGame((s) => s.activeNpc === "npc-nakama-warehouse" && s.overlay === "dialogue");

  const conversation = useRef(createBehavior(23));
  const gait = useRef(0);
  const activity = useRef<AvatarAnimation | undefined>("Idle");
  useFrame((_, rawDelta) => {
    const g = ref.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05);

    const entry = interactableById("npc-nakama-warehouse");
    if (entry) entry.position = [g.position.x, 0, g.position.z];

    const paused = conversationStep(conversation.current, nearby, delta);
    gait.current = moving && !paused ? WALK_SPEED : 0;
    activity.current = paused
      ? nearby
        ? "Talk"
        : "Idle"
      : carry
        ? "CarryBox"
        : !moving
          ? "PickItem"
          : undefined;
    if (paused) {
      if (nearby) {
        const p = useGame.getState().playerPos;
        g.rotation.y = turnToward(
          g.rotation.y,
          Math.atan2(p[0] - g.position.x, p[2] - g.position.z),
          delta,
        );
      }
      return;
    }

    if (phase.current === "toShelf" || phase.current === "toPallet") {
      const route = phase.current === "toShelf" ? TO_SHELF : TO_PALLET;
      const target = route[Math.min(idx.current, route.length - 1)]!;
      if (step(g, target, delta)) {
        idx.current += 1;
        if (idx.current >= route.length) {
          idx.current = 0;
          timer.current = 0;
          if (phase.current === "toShelf") {
            phase.current = "pick";
            setMoving(false);
          } else {
            phase.current = "place";
            setMoving(false);
          }
        }
      }
      return;
    }

    timer.current += delta;
    if (phase.current === "pick" && timer.current > 1.6) {
      setCarry(true);
      setMoving(true);
      phase.current = "toPallet";
      idx.current = 0;
      useOps.getState().setStatus("Nakama gudang membawa stok ke gudang");
    } else if (phase.current === "place" && timer.current > 1.4) {
      setCarry(false);
      setMoving(true);
      phase.current = "toShelf";
      idx.current = 0;
      useOps.getState().addPalletBox();
    }
  });

  return (
    <group ref={ref} position={[SHELF_FRONT.x, 0, SHELF_FRONT.z]}>
      <BaseAvatarV2
        avatar={NPC_AVATARS["npc-nakama-warehouse"]}
        speed={gait}
        animation={activity}
        groundToWorld
      />
      <CarriedBox visible={carry} />
      <Label text="Nakama · Staf Gudang" show={nearby} />
    </group>
  );
}

/**
 * Nakama Packing: ambil dus dari palet → packing di meja → staging internal dan
 * memanggil truk saat ada order masuk.
 */
function Packer() {
  const ref = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  const [carry, setCarry] = useState(false);
  const phase = useRef<
    | "wait"
    | "toPallet"
    | "grab"
    | "toTable"
    | "pack"
    | "toCourier"
    | "waitTruck"
    | "handover"
    | "backToTable"
  >("wait");
  const idx = useRef(0);
  const timer = useRef(0);
  const nearby = useGame((s) => s.activeNpc === "npc-nakama-packing" && s.overlay === "dialogue");

  const conversation = useRef(createBehavior(23));
  const gait = useRef(0);
  const activity = useRef<AvatarAnimation | undefined>("Idle");
  useFrame((_, rawDelta) => {
    const g = ref.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05);
    const ops = useOps.getState();

    const entry = interactableById("npc-nakama-packing");
    if (entry) entry.position = [g.position.x, 0, g.position.z];

    const paused = conversationStep(conversation.current, nearby, delta);
    gait.current = moving && !paused ? WALK_SPEED : 0;
    activity.current = paused
      ? nearby
        ? "Talk"
        : "Idle"
      : carry
        ? "CarryBox"
        : !moving
          ? "PickItem"
          : undefined;
    if (paused) {
      if (nearby) {
        const p = useGame.getState().playerPos;
        g.rotation.y = turnToward(
          g.rotation.y,
          Math.atan2(p[0] - g.position.x, p[2] - g.position.z),
          delta,
        );
      }
      return;
    }

    const walkRoute = (route: Pt[], onDone: () => void) => {
      const target = route[Math.min(idx.current, route.length - 1)]!;
      if (step(g, target, delta)) {
        idx.current += 1;
        if (idx.current >= route.length) {
          idx.current = 0;
          timer.current = 0;
          onDone();
        }
      }
    };

    switch (phase.current) {
      case "wait": {
        if (ops.pendingOrders > 0 && ops.palletBoxes > 0) {
          ops.startPacking();
          phase.current = "toPallet";
          idx.current = 0;
          setMoving(true);
        }
        return;
      }
      case "toPallet":
        walkRoute(TABLE_TO_PALLET, () => {
          phase.current = "grab";
          setMoving(false);
        });
        return;
      case "toTable":
        walkRoute(PALLET_TO_TABLE, () => {
          phase.current = "pack";
          setMoving(false);
        });
        return;
      case "toCourier":
        walkRoute(TABLE_TO_COURIER, () => {
          phase.current = "waitTruck";
          setMoving(false);
          useOps.getState().callTruck();
        });
        return;
      case "backToTable":
        walkRoute(COURIER_TO_TABLE, () => {
          phase.current = "wait";
          setMoving(false);
        });
        return;
      default:
        break;
    }

    timer.current += delta;
    switch (phase.current) {
      case "grab":
        if (timer.current > 1.2) {
          ops.takePalletBox();
          setCarry(true);
          setMoving(true);
          phase.current = "toTable";
          idx.current = 0;
        }
        break;
      case "pack":
        if (timer.current > 2.2) {
          ops.setStatus("Pesanan selesai dipacking — menuju pickup kurir");
          setMoving(true);
          phase.current = "toCourier";
          idx.current = 0;
        }
        break;
      case "waitTruck":
        if (ops.truck === "loading") {
          phase.current = "handover";
          timer.current = 0;
          setMoving(false);
        }
        break;
      case "handover":
        if (timer.current > 1.6) {
          setCarry(false);
          ops.shipPackage();
          setMoving(true);
          phase.current = "backToTable";
          idx.current = 0;
        }
        break;
      default:
        break;
    }
  });

  return (
    <group ref={ref} position={[PACK_TABLE.x, 0, PACK_TABLE.z]}>
      <BaseAvatarV2
        avatar={NPC_AVATARS["npc-nakama-packing"]}
        speed={gait}
        animation={activity}
        groundToWorld
      />
      <CarriedBox visible={carry} />
      <Label text="Nakama · Staf Packing" show={nearby} />
    </group>
  );
}

/** Simulasi operasional Nakama: restock, packing, dan pickup truk. */
export function NakamaOps() {
  return (
    <>
      <Pallet />
      <Restocker />
      <Packer />
      {/* Truk pickup: TrafficSystem delivery van (yaw + hit terpental). */}
      {/* Meja packing */}
      <group position={[PACK_TABLE.x, 0.06, PACK_TABLE.z - 0.9]}>
        <Model url={GAME_ASSETS.desk} height={0.8} />
        <Model url={GAME_ASSETS.boxOpen} height={0.5} position={[0.4, 0.85, 0]} />
      </group>
    </>
  );
}
