import type { BenchSpot } from "@/game/world/street-props";
import { MOUNTAIN_SUMMIT } from "./model";

/** Shared anchors for folding-chair meshes, Sit pose and the standard F/touch interaction. */
export const MOUNTAIN_SEATS: BenchSpot[] = [-5, 0, 5].map((offset, index) => ({
  id: `mountain-summit-chair-${index + 1}`,
  label: "Kursi camping · Panorama Gunung Cung",
  position: [
    MOUNTAIN_SUMMIT.position[0] + offset,
    MOUNTAIN_SUMMIT.position[1],
    MOUNTAIN_SUMMIT.position[2] + 19,
  ],
  yaw: 0,
  radius: 1.6,
  seatHeight: 0.48,
  standDistance: 1.2,
}));
