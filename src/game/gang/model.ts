import type { DeliveryTrip } from "../warung/delivery-route";
import type { GangAmbient } from "./ambient";
export type HomePrivacyMode = "open" | "friends" | "closed";
export type DecorSlot = "paint" | "roof" | "fence" | "plants" | "lamp";
export type DecorItem = { id: string; name: string; color: string };
export type GangHouse = {
  number: number;
  ownerId: string | null;
  ownerName: string | null;
  mine: boolean;
  inactive: boolean;
  /** F8: kampung party running at this house. */
  party?: boolean;
  /** F8: Mbah's "Langganan sejak 1965" sign after the finale. */
  mbahSign?: string | null;
  style: Record<DecorSlot, DecorItem>;
  warung: {
    id: number;
    name: string;
    level: number;
    levelName: string;
    lot: number | null;
    open: boolean;
    truckEta?: number | null;
    renovation?: import("@/game/warung/model").WarungRenovation | null;
    damage?: import("@/game/warung/model").WarungDamage | null;
  } | null;
};
export type GangData = {
  deliveryTrips?: DeliveryTrip[];
  privacy?: {
    value: HomePrivacyMode;
    text: {
      title: string;
      hint: string;
      friends_hint: string;
      options: Record<HomePrivacyMode, string>;
    };
  } | null;
  enabled: true;
  gang: number;
  temporary: boolean;
  arrival: number;
  neighbors: { previous: number | null; next: number | null };
  /** Highest kampung number; the halte bus can go to any of 1..gangCount. */
  gangCount?: number;
  home: { gang: number; number: number };
  houses: GangHouse[];
  ambient: GangAmbient;
  catalog: Record<DecorSlot, DecorItem[]>;
  text: Record<string, string>;
  layout: {
    origin: [number, number, number];
    gate: { x: number; z: number };
    house_spacing: number;
    house_offset: number;
    render_distance: number;
  };
};
export type GangSnapshot = { enabled: false } | GangData;
export function gangText(
  data: GangData,
  key: string,
  values: Record<string, string | number> = {},
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`:${key}`, String(value)),
    data.text[key] ?? key,
  );
}
export function housePose(n: number, layout: GangData["layout"]) {
  return {
    x: (n % 2 ? -1 : 1) * layout.house_offset,
    z: 10 + Math.floor((n - 1) / 2) * layout.house_spacing,
    yaw: n % 2 ? Math.PI / 2 : -Math.PI / 2,
  };
}
export function houseFront(n: number, layout: GangData["layout"]): [number, number, number] {
  const p = housePose(n, layout);
  return [layout.origin[0] + p.x + Math.sin(p.yaw) * 8, 0.83, layout.origin[2] + p.z];
}
/** An on-site warung shares the front door to the player's own house. */
export function ownPorchWarung(data: GangData) {
  if (data.gang !== data.home.gang) return null;
  const house = data.houses.find((h) => h.mine && h.number === data.home.number);
  return house?.warung?.lot === null ? house.warung : null;
}
export function visibleHouses(data: GangData, x: number, z: number) {
  return data.houses.filter((h) => {
    const p = housePose(h.number, data.layout);
    return (
      Math.hypot(x - data.layout.origin[0] - p.x, z - data.layout.origin[2] - p.z) <
      data.layout.render_distance
    );
  });
}
export function sameGang(local: number | null, remote: number | null | undefined) {
  return local === (remote ?? null);
}

export type GangDirectory = {
  enabled: true;
  page: number;
  gangs: number[];
  hasMore: boolean;
  people: {
    playerId: string;
    name: string;
    gang: number;
    house: number;
    warungName: string | null;
    open: boolean;
    inactive: boolean;
  }[];
};
export function gangName(data: GangData, gang = data.gang) {
  return gang < 0 ? data.text["temporary_gang"]! : gangText(data, "gang", { gang });
}
export function homeAddress(data: GangData) {
  return data.home.gang < 0
    ? data.text["temporary_home"]!
    : gangText(data, "address", { gang: data.home.gang, house: data.home.number });
}
/** Halte bus: city stop on the west sidewalk of Jalan Kampung, just inland of the Gerbang Kampung, facing the road (+x). */
export const CITY_HALTE_OFFSET = { x: -6.5, z: 13, yaw: Math.PI / 2 };
/** Gang stop, scene-local: just inside the lane gate (land starts at z=-15). */
export const GANG_HALTE_LOCAL: [number, number, number] = [-5.5, 0, -7];
export function cityHalte(gate: { x: number; z: number }): [number, number, number] {
  return [gate.x + CITY_HALTE_OFFSET.x, 0.83, gate.z + CITY_HALTE_OFFSET.z];
}
/** Where bus riders land: the sidewalk in front of the shelter. */
export function cityHalteArrival(gate: { x: number; z: number }): [number, number, number] {
  const [x, y, z] = cityHalte(gate);
  return [x + 2, y, z];
}
export function gangHalte(layout: GangData["layout"]): [number, number, number] {
  const [ox, , oz] = layout.origin;
  return [ox + GANG_HALTE_LOCAL[0], 0.83, oz + GANG_HALTE_LOCAL[2]];
}
/** In the kampung a city waypoint (e.g. a debtor) first points at the halte: the way back to the city. */
export function gangExitGuide(cityWaypoint: boolean, layout: GangData["layout"] | undefined) {
  if (!cityWaypoint || !layout) return null;
  const [x, , z] = gangHalte(layout);
  return {
    objective: null,
    position: [x, 0, z] as [number, number, number],
    realm: "WORLD" as const,
  };
}
/** Leaving the kampung keeps a debtor hunt so the arrow continues in the city; other waypoints reset. */
export const waypointAfterGang = <T extends string>(waypoint: T | null): T | null =>
  waypoint?.startsWith("warung-debt-") ? waypoint : null;
