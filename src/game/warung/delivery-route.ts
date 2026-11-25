import { smoothRoadPath } from "../world/road-path.ts";
import { pathLength, sampleRide } from "../world/bus-motion.ts";
import type { RidePoint } from "../world/bus-routes";

export type DeliveryTrip = {
  id: number;
  warungId: number;
  gang: number;
  house: number;
  departAt: number;
  etaAt: number;
  returnAt: number;
  /** Convoy parking slot: 0 at the door, 1-2 further back toward the gang entrance. */
  slot?: number;
};
/** Metres between parked convoy trucks (a truck is 6 m long). */
export const TRUCK_SLOT_GAP = 8;
export type DeliveryLayout = {
  origin: readonly number[];
  house_spacing: number;
  house_offset: number;
};
// Pickup driveway beside Toko Cung; the mission truck has its own bay further west.
export const DELIVERY_DEPOT = { x: 20.4, z: 9 };
const cityOut = smoothRoadPath(
  [DELIVERY_DEPOT, { x: 20.4, z: 22.8 }, { x: -31.6, z: 22.8 }, { x: -31.6, z: -200 }],
  3,
);
const cityBack = smoothRoadPath(
  [{ x: -28.4, z: -200 }, { x: -28.4, z: 17.2 }, { x: 20.4, z: 17.2 }, DELIVERY_DEPOT],
  3,
);
export function deliveryRoute(house: number, spacing = 24, houses = 10, slot = 0) {
  const z = 10 + Math.floor((house - 1) / 2) * spacing;
  const end = Math.ceil(houses / 2) * spacing + 10;
  // Trucks come in from low z, so later convoy trucks stop behind the first and never pass it.
  const door = { x: 1.6, z };
  const stop = { x: 1.6, z: z - slot * TRUCK_SLOT_GAP };
  const gangOut = [{ x: 1.6, z: -160 }, stop];
  const gangBack = smoothRoadPath(
    [
      stop,
      { x: 1.6, z: end - 20 },
      { x: 5, z: end - 12 },
      { x: 5, z: end - 4 },
      { x: -5, z: end - 4 },
      { x: -5, z: end - 12 },
      { x: -1.6, z: end - 20 },
      { x: -1.6, z: -160 },
    ],
    3,
  );
  return {
    cityOut,
    cityBack,
    gangOut,
    gangBack,
    stop,
    door,
    outLength: pathLength(cityOut) + pathLength(gangOut),
    backLength: pathLength(gangBack) + pathLength(cityBack),
  };
}
export type DeliveryRoute = ReturnType<typeof deliveryRoute>;
const ramp = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};
function onLeg(
  first: RidePoint[],
  second: RidePoint[],
  fraction: number,
  total: number,
  firstArea: "city" | "gang",
) {
  const d = ramp(fraction) * total,
    split = pathLength(first);
  return d <= split
    ? { area: firstArea, ...sampleRide(first, d) }
    : {
        area: firstArea === "city" ? ("gang" as const) : ("city" as const),
        ...sampleRide(second, d - split),
      };
}
/** The same shipment clock survives scene changes and stock settlement. Transfers happen at the far bridge ends. */
export function deliveryJourney(now: number, trip: DeliveryTrip, route: DeliveryRoute) {
  const loadingEnd = trip.departAt + 5000,
    unloadAt = trip.etaAt - 20000,
    leaveAt = trip.etaAt + 5000,
    parkAt = trip.returnAt - 5000;
  let pose: { area: "city" | "gang"; x: number; z: number; yaw: number };
  if (now < unloadAt)
    pose = onLeg(
      route.cityOut,
      route.gangOut,
      (now - loadingEnd) / (unloadAt - loadingEnd),
      route.outLength,
      "city",
    );
  else if (now <= leaveAt) pose = { area: "gang", ...route.stop, yaw: 0 };
  else
    pose = onLeg(
      route.gangBack,
      route.cityBack,
      (now - leaveAt) / (parkAt - leaveAt),
      route.backLength,
      "gang",
    );
  return {
    ...pose,
    visible: now >= trip.departAt && now < trip.returnAt,
    unloading: now >= unloadAt && now < trip.etaAt,
    parked: now >= unloadAt && now <= leaveAt,
  };
}
