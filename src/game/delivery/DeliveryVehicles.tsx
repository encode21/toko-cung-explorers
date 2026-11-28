/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { useWarung } from "@/game/warung/store";
import { WARUNG_LOTS } from "@/game/warung/lots";
import { useGang } from "@/game/gang/store";
import { GANG_SIDEWALK_EDGE, housePose } from "@/game/gang/model";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMobility } from "@/game/mobility/store";
import { VEHICLE_DEFINITIONS, VEHICLE_SIZE, type VehicleKind } from "@/game/vehicles/definitions";
import { Billboard, Text } from "@react-three/drei";
import { boxStack } from "@/game/warung/KulakanDeliveryScene";
import { setDeliveryPiles, setParkedFleet } from "./fleet-actions";
import type { DealerCatalogItem, DeliveryOrder, DeliveryVehicle } from "./model";

function vehicleKindFor(
  type: DeliveryVehicle["type"],
  category?: DealerCatalogItem["category"],
): VehicleKind {
  if (category === "pickup") return "pickup";
  if (category === "engkel") return "truck";
  return type === "motor" ? "motorcycle" : type === "viar" ? "viar" : "truck";
}

function vehicleColorFor(type: DeliveryVehicle["type"]) {
  return type === "motor" ? "#315c46" : type === "viar" ? "#e6a817" : "#d6c471";
}

/** Box aluminium di atas bak blueprint `pickup` (bak z −2,05…0,39, lantai y 0,78). */
const PICKUP_BOX: AssetPart[] = [
  { p: [0, 1.52, -0.83], s: [1.84, 1.37, 2.44], color: "#d9dee0", shape: "bevel", finish: "metal" },
  { p: [0, 1.52, -2.06], s: [0.03, 1.2, 0.02], color: "#8d979b", finish: "metal" },
  { p: [0, 2.08, -0.83], s: [1.6, 0.18, 0.02], color: "#2f6fb0", finish: "paint" },
];

/** Animates an NPC courier vehicle moving toward the customer's house along a simple lerp. */
function CourierTransitVehicle({
  order,
  origin,
}: {
  order: DeliveryOrder;
  origin: [number, number];
}) {
  const ref = useRef<Group>(null);
  const dx = order.pos[0] - origin[0];
  const dz = order.pos[2] - origin[1];
  const yaw = Math.atan2(dx, dz);

  useFrame(() => {
    if (!ref.current || !order.etaAt) return;
    const etaMs = Date.parse(order.etaAt);
    const totalMs = 35000;
    const remain = Math.max(0, etaMs - Date.now());
    const progress = Math.max(0, Math.min(1, 1 - remain / totalMs));
    ref.current.position.set(origin[0] + dx * progress, 0, origin[1] + dz * progress);
    ref.current.rotation.y = yaw;
  });

  const kind = vehicleKindFor(order.vehicleType ?? "motor");
  const color = vehicleColorFor(order.vehicleType ?? "motor");
  return (
    <group ref={ref} position={[origin[0], 0, origin[1]]}>
      <VehicleModel kind={kind} color={color} rider />
    </group>
  );
}

type Frame = { x: number; z: number; yaw: number; front: number; side: 1 | -1 };

/** Lokasi warung pemain: kavling kota (lots/lotMarket seperti "Warungku" di peta) atau rumah di kampung. */
function useFleetFrame(area: "city" | "gang"): Frame | null {
  const warungId = useWarung((s) => s.data?.warung?.id ?? null);
  const cityLot = useWarung((s) => {
    const id = s.data?.warung?.id;
    return s.lots.find((l) => l.id === id)?.lot ?? s.data?.lotMarket?.find((o) => o.mine)?.lot;
  });
  const gang = useGang((s) => s.data);
  return useMemo(() => {
    if (warungId === null) return null;
    if (area === "city") {
      const lot = cityLot === undefined ? undefined : WARUNG_LOTS[cityLot];
      return lot
        ? { x: lot.x, z: lot.z, yaw: lot.rotation, front: lot.depth / 2 + 1.6, side: 1 }
        : null;
    }
    const house = gang?.houses.find(
      (h) => h.mine && h.warung?.id === warungId && h.warung.lot === null,
    );
    if (!gang || !house) return null;
    const p = housePose(house.number, gang.layout);
    // Halaman depan: di dalam tepi trotoar, sisi seberang papan nama (papan di sisi datang).
    return {
      x: gang.layout.origin[0] + p.x,
      z: gang.layout.origin[2] + p.z,
      yaw: p.yaw,
      front: Math.abs(p.x) - GANG_SIDEWALK_EDGE - 1.6,
      side: p.x < 0 ? -1 : 1,
    };
  }, [area, warungId, cityLot, gang]);
}

/**
 * Armada pengantaran warung (Motor, Viar/Pickup, Truk) parkir sejajar jalan di depan warung pemain,
 * di kota atau di kampung; plus kurir NPC yang sedang mengantar (kota saja, tujuan pesanan di peta kota).
 */
export function DeliveryVehicles({ area = "city" }: { area?: "city" | "gang" }) {
  const delivery = useWarung((s) => s.data?.delivery);
  const frame = useFleetFrame(area);
  // Kendaraan niaga yang sedang dipanggil dari Garasi: pajangan statisnya disembunyikan.
  const summoned = useMobility((s) => s.vehicles?.find((v) => v.personal && v.mine)?.model ?? null);

  const parked = useMemo(() => {
    // Kavling kota sempit: armada tidak dipajang (meluber ke kavling tetangga); panggil lewat Garasi.
    if (area === "city" || !frame || !delivery?.unlocked) return [];
    const idle = delivery.vehicles.filter((v) => v.status !== "BUSY");
    const cos = Math.cos(frame.yaw);
    const sin = Math.sin(frame.yaw);
    let cursor = 2;
    let hidden = false;
    return idle.flatMap((v) => {
      const category = delivery.dealerCatalog?.find((c) => c.id === v.variant)?.category;
      const kind = vehicleKindFor(v.type, category);
      const length = VEHICLE_SIZE[kind][2];
      const lx = frame.side * (cursor + length / 2);
      cursor += length + 0.7;
      if (!hidden && v.ownership === "owned" && v.variant && kind === summoned) {
        hidden = true;
        return [];
      }
      // Lokal → dunia: rotasi yaw lot/rumah, lalu kendaraan diputar sejajar jalan.
      return [
        {
          v,
          kind,
          position: [
            frame.x + lx * cos + frame.front * sin,
            0,
            frame.z - lx * sin + frame.front * cos,
          ] as [number, number, number],
          yaw: frame.yaw + Math.PI / 2,
        },
      ];
    });
  }, [area, frame, delivery, summoned]);

  useEffect(() => {
    setParkedFleet(
      area,
      parked.map(({ v, kind, position }) => ({
        label: v.label,
        type: v.type,
        owned: v.ownership === "owned" && !!v.variant,
        variant: v.variant,
        x: position[0],
        z: position[2],
        reach: VEHICLE_SIZE[kind][2] / 2 + 1.4,
      })),
    );
    return () => setParkedFleet(area, []);
  }, [area, parked]);

  // Paket antar sendiri menunggu diangkat di halaman depan, sisi seberang armada.
  const piles = useMemo(() => {
    if (!frame || !delivery?.unlocked) return [];
    const cos = Math.cos(frame.yaw);
    const sin = Math.sin(frame.yaw);
    return delivery.orders
      .filter((o) => o.assignedSelf && o.status === "DISPATCHED")
      .map((o, i) => {
        const lx = -frame.side * (2.4 + i * 1.3);
        const front = frame.front + 0.4;
        return {
          order: o,
          x: frame.x + lx * cos + front * sin,
          z: frame.z - lx * sin + front * cos,
        };
      });
  }, [frame, delivery]);

  useEffect(() => {
    setDeliveryPiles(
      area,
      piles.map(({ order, x, z }) => ({
        orderId: order.id,
        npcName: order.npcName,
        boxes: order.boxes,
        x,
        z,
      })),
    );
    return () => setDeliveryPiles(area, []);
  }, [area, piles]);

  if (!frame || !delivery?.unlocked) return null;
  const origin: [number, number] = [
    frame.x + Math.sin(frame.yaw) * frame.front,
    frame.z + Math.cos(frame.yaw) * frame.front,
  ];
  const activeCourierOrders =
    area === "city"
      ? delivery.orders.filter((o) => !o.assignedSelf && o.status === "IN_TRANSIT" && o.etaAt)
      : [];

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {parked.map(({ v, kind, position, yaw }) => {
          const { half, centerY } = VEHICLE_DEFINITIONS[kind].collision;
          return (
            <CuboidCollider
              key={v.id}
              args={half}
              position={[position[0], centerY, position[2]]}
              rotation={[0, yaw, 0]}
            />
          );
        })}
      </RigidBody>
      {parked.map(({ v, kind, position, yaw }) => (
        <group key={v.id} position={position} rotation-y={yaw}>
          <VehicleModel kind={kind} color={vehicleColorFor(v.type)} emptyBed={v.type !== "viar"} />
          {v.variant === "pickup_box" && <StyledBatch items={PICKUP_BOX} />}
        </group>
      ))}
      {piles.map(({ order, x, z }) => (
        <group key={`pile-${order.id}`} position={[x, 0, z]} rotation-y={frame.yaw}>
          <StyledBatch items={boxStack(order.boxes, -0.27, 0)} />
          <Billboard position={[0, 1.6, 0]}>
            <Text fontSize={0.2} color="#fff9e9" outlineWidth={0.02} outlineColor="#4b2a12">
              {`📦 ${order.npcName} · ${order.boxes} dus`}
            </Text>
          </Billboard>
        </group>
      ))}
      {activeCourierOrders.map((order) => (
        <CourierTransitVehicle key={order.id} order={order} origin={origin} />
      ))}
    </group>
  );
}
