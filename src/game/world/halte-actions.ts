import { create } from "zustand";
import { smoothRoadPath } from "./road-path";
import type { ContextAction } from "@/game/interactions/context-action";
import { enterGang, leaveGang, gangCommand, busToGangBlocked, useGang } from "@/game/gang/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useWarung } from "@/game/warung/store";
import { busBoarding, holdBusBoarding, releaseBusBoarding, resumeBusService } from "./bus-service";
import { startBusRide, useBusRide, type BusLeg } from "./bus-ride";
import { claimBusControl, releaseBusControl } from "./bus-sync";
import {
  BUS_STOPS,
  busDestinations,
  cityBusLegs,
  kampungBusStop,
  type BusStopId,
  type BusDestination,
} from "./bus-routes";

export const useBusTravel = create<{ from: BusStopId | null; busy: boolean; error: string }>(
  () => ({ from: null, busy: false, error: "" }),
);
export function busStopAt(id: BusStopId) {
  const data = useGang.getState().data;
  return id === "kampung" ? (data ? kampungBusStop(data.layout.origin) : null) : BUS_STOPS[id];
}
export function openBusMenu(from: BusStopId) {
  if (useBusRide.getState().riding || useBusTravel.getState().busy) return;
  // The kampung picker needs gangCount; read it once if the player has not been to a kampung yet.
  if (!useGang.getState().data) void gangCommand("read");
  useBusTravel.setState({ from, error: "" });
}
export function closeBusMenu() {
  if (!useBusTravel.getState().busy) useBusTravel.setState({ from: null, error: "" });
}
function gangArrivalLeg(): BusLeg {
  const data = useGang.getState().data!;
  const stop = kampungBusStop(data.layout.origin);
  const end = Math.ceil(data.houses.length / 2) * data.layout.house_spacing + 10;
  return {
    path: [{ x: stop.pose.x, z: data.layout.origin[2] + end + 145 }, stop.pose],
    stop,
    compact: true,
  };
}
function intoGang(gang?: number): BusLeg {
  return {
    path: [BUS_STOPS.gerbang.pose, { x: -31.6, z: -200 }],
    transfer: async () => {
      if (!(await enterGang(undefined, gang === undefined ? {} : { gang }))) return false;
      const stop = kampungBusStop(useGang.getState().data!.layout.origin);
      useGame.setState({ pendingTeleport: stop.board });
      return true;
    },
  };
}
/** `gang`: which kampung to ride to (to === "gang"); omitted = the rider's own kampung. */
export async function rideBus(to: BusDestination, gang?: number) {
  const { from, busy } = useBusTravel.getState();
  if (
    !from ||
    busy ||
    useBusRide.getState().riding ||
    !busDestinations(from).some((d) => d.id === to)
  )
    return;
  const origin = busStopAt(from),
    player = useGame.getState().playerPos;
  if (!origin || Math.hypot(player[0] - origin.board[0], player[2] - origin.board[2]) > 4.5) {
    useBusTravel.setState({ error: "Dekati halte dulu untuk naik bus." });
    return;
  }
  const blocked = busToGangBlocked();
  if (blocked) {
    useBusTravel.setState({ error: blocked });
    return;
  }
  const boarding = busBoarding(from);
  if (!holdBusBoarding(from)) {
    useBusTravel.setState({
      error: "Bus belum berhenti di halte ini atau sudah berangkat. Tunggu putaran berikutnya.",
    });
    return;
  }
  useBusTravel.setState({ busy: true, error: "" });
  try {
    if (!(await claimBusControl()))
      throw new Error(
        "Bus sedang dipakai pemain lain atau sudah berangkat. Tunggu bus berikutnya.",
      );
    if (to === "gang" && !useGang.getState().data) {
      const data = await gangCommand("read");
      if (!data?.enabled) throw new Error("Gang Kampung belum tersedia. Coba lagi sebentar.");
    }
    const r = await worldRequest<{ kas: { cash: number | null } }>("bus", {
      action: "ride",
      from,
      to,
      requestId: createId(),
      departureAt: boarding.departureAt,
      boardingToken: boarding.boardingToken,
      ...(to === "gang" && gang ? { gang } : {}),
    });
    if (r.kas.cash != null)
      useWarung.setState((w) =>
        w.data?.warung
          ? { data: { ...w.data, warung: { ...w.data.warung, cash: r.kas.cash! } } }
          : w,
      );
    const legs: BusLeg[] = [];
    const cityFrom: "kota" | "gerbang" | "pasar" = from === "kampung" ? "gerbang" : from;
    if (from === "kampung") {
      legs.push({
        path: [
          origin.pose,
          { x: origin.pose.x, z: useGang.getState().data!.layout.origin[2] - 160 },
        ],
        compact: true,
        transfer: async () => {
          leaveGang();
          return true;
        },
      });
      const arrivalStop = { ...BUS_STOPS.gerbang, pose: { x: -28.4, z: -47 }, yaw: 0 };
      legs.push({ path: [{ x: -28.4, z: -200 }, arrivalStop.pose], stop: arrivalStop });
    }
    const cityTo = to === "gang" ? "gerbang" : to;
    if (cityTo !== cityFrom) {
      const cityLegs = cityBusLegs(cityFrom, cityTo);
      // Arriving from the bridge already faces the city; continue along the southbound lane.
      if (from === "kampung")
        cityLegs[0]!.path = smoothRoadPath(
          [{ x: -28.4, z: -47 }, { x: -28.4, z: 17.2 }, BUS_STOPS.pasar.pose],
          6,
        );
      legs.push(...cityLegs);
    }
    if (to === "gang" || (to === "keliling" && from === "kampung")) {
      legs.push(
        intoGang(
          to === "gang"
            ? gang
            : from === "kampung"
              ? (useGang.getState().inside ?? undefined)
              : undefined,
        ),
        gangArrivalLeg(),
      );
    }
    useBusTravel.setState({ from: null });
    const destination =
      to === "keliling"
        ? origin
        : to === "gang"
          ? kampungBusStop(useGang.getState().data!.layout.origin)
          : BUS_STOPS[to];
    const ok = await startBusRide({
      title:
        to === "keliling"
          ? "Keliling kota"
          : to === "gang" && gang
            ? `Bus ke Kampung ${gang}`
            : `Bus ke ${destination.name.replace("Halte ", "")}`,
      from: origin,
      legs,
      arrive: async () => {
        if (destination.id === "kampung" && useGang.getState().inside === null) {
          if (!(await enterGang())) return false;
        } else if (destination.id !== "kampung" && useGang.getState().inside !== null) {
          leaveGang();
        }
        useGame.setState({ waypoint: null, pendingTeleport: destination.board });
        resumeBusService(destination);
        return true;
      },
    });
    if (!ok) useGame.getState().setToast("Perjalanan bus belum selesai. Coba lagi dari halte.");
  } catch (e) {
    useBusTravel.setState({ error: e instanceof Error ? e.message : "Bus belum bisa berangkat." });
  } finally {
    releaseBusControl();
    releaseBusBoarding();
    useBusTravel.setState({ busy: false });
  }
}
export function halteContextActions(): ContextAction[] {
  if (useGang.getState().inside !== null) return [];
  const p = useGame.getState().playerPos;
  return Object.values(BUS_STOPS).flatMap((stop) => {
    const distance = Math.hypot(p[0] - stop.board[0], p[2] - stop.board[2]);
    return distance > 3.8 || p[1] > 2
      ? []
      : [
          {
            id: `halte:${stop.id}`,
            label: busBoarding(stop.id).canBoard ? "Naik bus · pilih tujuan" : "Lihat jadwal bus",
            title: stop.name,
            distance,
            priority: 2,
            busy: useBusTravel.getState().busy || useBusRide.getState().riding,
            execute: () => openBusMenu(stop.id),
          },
        ];
  });
}
