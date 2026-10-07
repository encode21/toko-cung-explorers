import { ROADS, SIDEWALKS, DRIVEWAYS, PARKING } from "./outdoor-layout";
import { surfaceContours } from "./road-geometry";
export const ROAD_STYLE = {
  width: 6.4,
  laneWidth: 3.2,
  asphaltY: 0.042,
  sidewalkY: 0.085,
  curbY: 0.075,
  curbHeight: 0.15,
  asphalt: "#515b60",
};
// Roads extend past the playable bounds into the existing fog.
export const ASPHALT_CONTOURS = surfaceContours(ROADS);
export const WALK_CONTOURS = surfaceContours(SIDEWALKS);
export const DRIVE_CONTOURS = surfaceContours([...DRIVEWAYS, ...PARKING], ROADS, 0.1);
