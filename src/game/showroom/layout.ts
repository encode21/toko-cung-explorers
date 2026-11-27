import type { BuildingLot } from "../world/outdoor-layout.ts";

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

export const SHOWROOM_ROOM = {
  origin: [350, 0, 350] as [number, number, number],
  halfWidth: 15,
  halfDepth: 12,
  height: 8,
  doorWidth: 4,
  doorHeight: 3.7,
};

type Position = [number, number, number];

interface ShowroomPassage {
  position: Position;
  marker: Position;
  walkTo: Position;
  yaw: number;
}

const front = SHOWROOM_LOT.z - SHOWROOM_LOT.depth / 2;
const [roomX, roomY, roomZ] = SHOWROOM_ROOM.origin;
const roomFront = roomZ + SHOWROOM_ROOM.halfDepth;

export const SHOWROOM_ENTRY: ShowroomPassage = {
  position: [SHOWROOM_LOT.x, 0, front],
  marker: [SHOWROOM_LOT.x, 0, front - 2],
  walkTo: [SHOWROOM_LOT.x, 0, front - 0.12],
  yaw: Math.PI,
};

export const SHOWROOM_EXIT: ShowroomPassage = {
  position: [roomX, roomY, roomFront - 0.08],
  marker: [roomX, roomY, roomFront - 1.85],
  walkTo: [roomX, roomY, roomFront - 0.16],
  yaw: Math.PI,
};

export const SHOWROOM_ROOM_SPAWN: Position = [roomX, roomY + 0.83, roomFront - 0.8];
export const SHOWROOM_CITY_RETURN: Position = [SHOWROOM_LOT.x, 0.895, front - 1.1];

export function isShowroomRoom(x: number, z: number) {
  return (
    Math.abs(x - roomX) < SHOWROOM_ROOM.halfWidth + 1 &&
    Math.abs(z - roomZ) < SHOWROOM_ROOM.halfDepth + 1
  );
}

export function isShowroomDoorReturn([x, , z]: Position) {
  return x === SHOWROOM_CITY_RETURN[0] && z === SHOWROOM_CITY_RETURN[2];
}
