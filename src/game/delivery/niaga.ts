import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import { BUILDING_LOTS } from "@/game/world/outdoor-layout";
import { useGang } from "@/game/gang/store";
import { useMobility } from "@/game/mobility/store";
import { vehicleFor } from "@/game/vehicles/model";
import { useWarung } from "@/game/warung/store";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";

type Vec3 = [number, number, number];

export const NIAGA_NAME = "Cung Niaga";
export const NIAGA_WAYPOINT = "venue-niaga";
/** Ruko tetangga timur Cung Motor (partner-5); menghadap -z seperti deretan ruko partner. */
export const NIAGA_LOT = BUILDING_LOTS.find((l) => l.id === "partner-5")!;
/** Titik pintu di trotoar depan ruko (aksi "Masuk" dan tujuan peta). */
export const NIAGA_DOOR: [number, number] = [NIAGA_LOT.x, NIAGA_LOT.z - NIAGA_LOT.depth / 2 - 1];
const CITY_RETURN: Vec3 = [NIAGA_DOOR[0], 0.83, NIAGA_DOOR[1] - 0.6];

/** Ruang pamer instance, jauh dari kota dan slot warung/usaha; kota tidak dirender selama di dalam. */
export const NIAGA_ROOM = { origin: [3200, 0, 3000] as Vec3, halfWidth: 9, halfDepth: 7 };
const [rx, ry, rz] = NIAGA_ROOM.origin;
/** Posisi relatif ruangan: meja sales di belakang, keset keluar di depan (+z). */
export const NIAGA_COUNTER_LOCAL: Vec3 = [0, 0, -5.6];
export const NIAGA_EXIT_LOCAL: Vec3 = [0, 0, NIAGA_ROOM.halfDepth - 0.6];
/** Unit pamer di atas panggung, menghadap pintu masuk. */
export const NIAGA_DISPLAY = [
  { kind: "viar", color: "#e6a817", x: -5.6, z: 0.4 },
  { kind: "pickup", color: "#f4f1ea", x: 0, z: 0.4 },
  { kind: "truck", color: "#2f6fb0", x: 5.8, z: 0.4 },
] as const;

export const isNiagaRoom = (x: number, z: number) =>
  Math.abs(x - rx) <= NIAGA_ROOM.halfWidth + 1 && Math.abs(z - rz) <= NIAGA_ROOM.halfDepth + 1;

export const useNiagaDealer = create<{ open: boolean }>(() => ({ open: false }));
export const openNiagaDealer = () => useNiagaDealer.setState({ open: true });
export const closeNiagaDealer = () => useNiagaDealer.setState({ open: false });

export function enterNiaga() {
  const game = useGame.getState();
  const playerId = useChannels.getState().lease?.playerId;
  const blocked =
    useWarung.getState().inside || game.pendingTeleport
      ? "Selesaikan aktivitasmu dulu."
      : playerId && vehicleFor(useMobility.getState().vehicles ?? [], playerId)
        ? "Turun dari kendaraan dulu."
        : null;
  if (blocked) {
    game.setToast(blocked);
    return;
  }
  game.setSitting(false);
  if (game.waypoint === NIAGA_WAYPOINT) game.setWaypoint(null);
  useGame.setState({ pendingTeleport: [rx, ry + 0.83, rz + NIAGA_EXIT_LOCAL[2] - 1.2] });
}

export function exitNiaga() {
  const p = useGame.getState().playerPos;
  if (!isNiagaRoom(p[0], p[2])) return;
  useNiagaDealer.setState({ open: false });
  useGame.setState({ pendingTeleport: CITY_RETURN });
}

function near(p: Vec3, x: number, z: number, radius: number) {
  const distance = Math.hypot(p[0] - x, p[2] - z);
  return distance <= radius ? distance : null;
}

export function niagaContextActions(): ContextAction[] {
  if (useGang.getState().inside !== null) return [];
  const p = useGame.getState().playerPos;
  if (isNiagaRoom(p[0], p[2])) {
    const counter = near(p, rx + NIAGA_COUNTER_LOCAL[0], rz + NIAGA_COUNTER_LOCAL[2], 3);
    const exit = near(p, rx + NIAGA_EXIT_LOCAL[0], rz + NIAGA_EXIT_LOCAL[2], 2.4);
    return [
      ...(counter === null
        ? []
        : [
            {
              id: "niaga:catalog",
              label: "Lihat katalog & beli",
              title: NIAGA_NAME,
              distance: counter,
              priority: 2,
              busy: false,
              execute: openNiagaDealer,
            },
          ]),
      ...(exit === null
        ? []
        : [
            {
              id: "niaga:exit",
              label: "Keluar ke jalan",
              title: NIAGA_NAME,
              distance: exit,
              priority: 2,
              busy: false,
              execute: exitNiaga,
            },
          ]),
    ];
  }
  const door = near(p, NIAGA_DOOR[0], NIAGA_DOOR[1], 3.5);
  if (door === null || p[1] > 2) return [];
  return [
    {
      id: "niaga:enter",
      label: `Masuk ${NIAGA_NAME}`,
      title: "Dealer Viar, Pickup & Truk",
      distance: door,
      priority: 2,
      busy: false,
      execute: enterNiaga,
    },
  ];
}
