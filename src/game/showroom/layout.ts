import type { BuildingLot } from "../world/outdoor-layout.ts";

type Position = [number, number, number];

interface ShowroomPassage {
  position: Position;
  marker: Position;
  walkTo: Position;
  yaw: number;
}

export interface ShowroomRoom {
  origin: Position;
  halfWidth: number;
  halfDepth: number;
  height: number;
  doorWidth: number;
  doorHeight: number;
}

/** Satu dealer walk-in (Cung Motor, Cung Niaga): fasad di kota + galeri instance off-grid. */
export interface ShowroomVenue {
  id: "motor" | "niaga";
  name: string;
  waypoint: string;
  lot: BuildingLot;
  room: ShowroomRoom;
  entry: ShowroomPassage;
  exit: ShowroomPassage;
  roomSpawn: Position;
  cityReturn: Position;
}

function venue(
  id: ShowroomVenue["id"],
  name: string,
  waypoint: string,
  lot: BuildingLot,
  origin: Position,
): ShowroomVenue {
  const room = { origin, halfWidth: 15, halfDepth: 12, height: 8, doorWidth: 4, doorHeight: 3.7 };
  const front = lot.z - lot.depth / 2;
  const [roomX, roomY, roomZ] = origin;
  const roomFront = roomZ + room.halfDepth;
  return {
    id,
    name,
    waypoint,
    lot,
    room,
    entry: {
      position: [lot.x, 0, front],
      marker: [lot.x, 0, front - 2],
      walkTo: [lot.x, 0, front - 0.12],
      yaw: Math.PI,
    },
    exit: {
      position: [roomX, roomY, roomFront - 0.08],
      marker: [roomX, roomY, roomFront - 1.85],
      walkTo: [roomX, roomY, roomFront - 0.16],
      yaw: Math.PI,
    },
    roomSpawn: [roomX, roomY + 0.83, roomFront - 0.8],
    cityReturn: [lot.x, 0.895, front - 1.1],
  };
}

export const SHOWROOM_NAME = "Cung Motor";
export const SHOWROOM_WAYPOINT = "venue-showroom";
export const SHOWROOM_LOT = {
  id: "cung-motor",
  x: 34.5,
  z: 35.5,
  width: 12,
  depth: 9.5,
  height: 14.4,
  rotation: Math.PI,
  kind: "ruko",
  label: SHOWROOM_NAME,
  color: "#3d454f",
} satisfies BuildingLot;
export const MOTOR_VENUE = venue(
  "motor",
  SHOWROOM_NAME,
  SHOWROOM_WAYPOINT,
  SHOWROOM_LOT,
  [350, 0, 350],
);

export const NIAGA_NAME = "Cung Niaga";
export const NIAGA_WAYPOINT = "venue-niaga";
/** Sebelah timur Cung Motor, ukuran dan garis depan sama supaya deretan dealer rata. */
export const NIAGA_LOT = {
  ...SHOWROOM_LOT,
  id: "cung-niaga",
  x: 49,
  label: NIAGA_NAME,
  color: "#2f4a3c",
} satisfies BuildingLot;
export const NIAGA_VENUE = venue("niaga", NIAGA_NAME, NIAGA_WAYPOINT, NIAGA_LOT, [350, 0, 400]);

export const SHOWROOM_VENUES = [MOTOR_VENUE, NIAGA_VENUE] as const;

export const SHOWROOM_ROOM = MOTOR_VENUE.room;
export const SHOWROOM_ENTRY = MOTOR_VENUE.entry;
export const SHOWROOM_EXIT = MOTOR_VENUE.exit;
export const SHOWROOM_ROOM_SPAWN = MOTOR_VENUE.roomSpawn;
export const SHOWROOM_CITY_RETURN = MOTOR_VENUE.cityReturn;

export function inVenueRoom(v: ShowroomVenue, x: number, z: number) {
  const [roomX, , roomZ] = v.room.origin;
  return Math.abs(x - roomX) < v.room.halfWidth + 1 && Math.abs(z - roomZ) < v.room.halfDepth + 1;
}

/** Galeri yang sedang ditempati, atau null di luar semua galeri. */
export function venueAt(x: number, z: number) {
  return SHOWROOM_VENUES.find((v) => inVenueRoom(v, x, z)) ?? null;
}

export function isShowroomRoom(x: number, z: number) {
  return inVenueRoom(MOTOR_VENUE, x, z);
}

export function isNiagaRoom(x: number, z: number) {
  return inVenueRoom(NIAGA_VENUE, x, z);
}

export function isShowroomDoorReturn([x, , z]: Position) {
  return SHOWROOM_VENUES.some((v) => x === v.cityReturn[0] && z === v.cityReturn[2]);
}
