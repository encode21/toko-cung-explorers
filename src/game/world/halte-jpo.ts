import { rect } from "./outdoor-layout.ts";

/**
 * Halte Toko Cung (Transjakarta-style, paid ride) and the JPO (jembatan penyeberangan orang) over
 * 4-lane Jalan Utama (z 13.6–26.4). The deck crosses at x 2.5; stairs run along the sidewalks:
 * south side east of the deck (by Toko Cung), north side west of it, landing beside the halte.
 * Keep HALTE in sync with server config/world-bus.php.
 */
export const JPO = {
  x: 2.5,
  height: 5,
  width: 2,
  /** Deck spans the road from the south stair top to the north stair top. */
  southZ: 12.4,
  northZ: 27.4,
  /** Stair runs along the sidewalk (horizontal length for the full rise). */
  run: 9,
};
export const HALTE = { x: -4.5, z: 29.7, width: 10, depth: 2.4 };
/** Parked bus in the outer westbound lane (traffic keeps to the inner lanes). */
export const HALTE_BUS = { x: -4.5, z: 24.6 };
export const HALTE_BOARD: [number, number, number] = [HALTE.x, 0.83, 27.6];

/** Footprints kept free of trees and street props. */
export const HALTE_JPO_ZONES = [
  rect(JPO.x + JPO.run / 2, JPO.southZ, JPO.run + 1, JPO.width + 0.4),
  rect(JPO.x - JPO.run / 2, JPO.northZ, JPO.run + 1, JPO.width + 0.4),
  rect(JPO.x, (JPO.southZ + JPO.northZ) / 2, JPO.width + 0.4, JPO.northZ - JPO.southZ),
  rect(HALTE.x, HALTE.z, HALTE.width + 1, HALTE.depth + 1),
];
