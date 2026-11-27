import type { Vec3 } from "../world/layout";
import { SHOWROOM_ROOM } from "./layout";

export const SHOWROOM_GEAR_DISPLAY = {
  position: [9.8, 0, 10.65] as Vec3,
  width: 8.3,
  depth: 1.35,
  height: 3.35,
};

// Place the action before the cabinet, on the open side of the aisle.
export const SHOWROOM_GEAR_ANCHOR: Vec3 = [
  SHOWROOM_ROOM.origin[0] + SHOWROOM_GEAR_DISPLAY.position[0],
  SHOWROOM_ROOM.origin[1] + 2.85,
  SHOWROOM_ROOM.origin[2] + 9.85,
];
