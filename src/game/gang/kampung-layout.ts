import { KALI, PLAY_HALF } from "./beach.ts";

/** Background kampung around the walkable gang: packed houses both sides, kali on the east. Pure. */
export type KampungHouse = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  wall: string;
  roof: string;
};
const WALLS = ["#e9d6bd", "#cedbd6", "#e8d4cd", "#d9c7a0", "#c9d6b8", "#e3c9a8", "#bfcfd8"];
const ROOFS = ["#b5563f", "#9c4a36", "#7d6a5a", "#a8603f", "#5f6f7a"];
/** West rows start past the boundary wall; east rows start past the kali. */
export const KAMPUNG_COLUMNS = {
  west: [-57, -66, -75, -84],
  east: [KALI.x1 + 6, KALI.x1 + 15, KALI.x1 + 24],
};
export const KAMPUNG_ROW = 9;

export function kampungHouses(gang: number, from: number, to: number): KampungHouse[] {
  let seed = (gang * 2654435761) >>> 0 || 1;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const out: KampungHouse[] = [];
  for (const x of [...KAMPUNG_COLUMNS.west, ...KAMPUNG_COLUMNS.east])
    for (let z = from + 4; z <= to - 4; z += KAMPUNG_ROW) {
      if (random() < 0.12) continue; // a gap: lahan kosong / jemuran
      out.push({
        x: x + (random() - 0.5) * 1.5,
        z: z + (random() - 0.5) * 1.5,
        w: 5.5 + random() * 1.8,
        d: 6 + random() * 1.6,
        h: random() < 0.3 ? 5.4 : 3 + random() * 0.6,
        wall: WALLS[Math.floor(random() * WALLS.length)]!,
        roof: ROOFS[Math.floor(random() * ROOFS.length)]!,
      });
    }
  return out;
}
/** Footbridges over the kali, every ~40 m. */
export function kaliBridges(from: number, to: number) {
  const out: number[] = [];
  for (let z = from + 20; z < to - 5; z += 40) out.push(z);
  return out;
}
export { KALI, PLAY_HALF };
