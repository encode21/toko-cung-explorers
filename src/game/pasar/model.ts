export type V3 = [number, number, number];
export type KioskId = "gorengan" | "martabak" | "buah" | "ikan";
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  energy: number;
}
export interface Kiosk {
  id: KioskId;
  name: string;
  vendorId: string;
  vendor: string;
  /** Customer spot in the lane (matches world-pasar.php `at`, as [x, 0, z]). */
  at: V3;
  /** Table centre; the vendor stands behind it. */
  table: [number, number];
  /** Rotation y of the stall: 0 faces +z (north row), PI faces -z (south row). */
  facing: 0 | typeof Math.PI;
  barks: string[];
  menu: MenuItem[];
}

/** Two facing rows in the market strip (z 2..12): north row z=3, south row z=11, lane between. Keep in sync with world-pasar.php. */
export const KIOSKS: Kiosk[] = [
  {
    id: "gorengan",
    name: "Gorengan Mang Udin",
    vendorId: "npc-mang-udin",
    vendor: "Mang Udin",
    at: [95, 0, 4.8],
    table: [95, 3],
    facing: 0,
    barks: ["Yang anget nih!", "Makasih, Kak!", "Gorengan baru angkat!"],
    menu: [
      { id: "bakwan", name: "Bakwan", price: 1000, energy: 4 },
      { id: "tahu-isi", name: "Tahu isi", price: 1000, energy: 4 },
      { id: "pisang-goreng", name: "Pisang goreng", price: 1500, energy: 5 },
    ],
  },
  {
    id: "martabak",
    name: "Martabak Bang Jali",
    vendorId: "npc-bang-jali",
    vendor: "Bang Jali",
    at: [107, 0, 4.8],
    table: [107, 3],
    facing: 0,
    barks: ["Martabaknya mantep, Kak!", "Makasih, Kak!", "Panas-panas, hati-hati ya!"],
    menu: [
      { id: "martabak-telor", name: "Martabak telor", price: 15000, energy: 30 },
      { id: "martabak-manis", name: "Martabak manis", price: 12000, energy: 25 },
    ],
  },
  {
    id: "buah",
    name: "Buah Bu Sri",
    vendorId: "npc-bu-sri",
    vendor: "Bu Sri",
    at: [101, 0, 9.2],
    table: [101, 11],
    facing: Math.PI,
    barks: ["Manis banget, Kak!", "Makasih, Kak!", "Buahnya seger, baru datang!"],
    menu: [
      { id: "pisang", name: "Pisang", price: 2000, energy: 6 },
      { id: "jeruk", name: "Jeruk", price: 2500, energy: 6 },
      { id: "mangga", name: "Mangga", price: 4000, energy: 8 },
    ],
  },
  {
    id: "ikan",
    name: "Ikan Pak Darman",
    vendorId: "npc-pak-darman",
    vendor: "Pak Darman",
    at: [113, 0, 9.2],
    table: [113, 11],
    facing: Math.PI,
    barks: ["Ikannya masih seger!", "Makasih, Kak!", "Bakar atau goreng, Kak?"],
    menu: [
      { id: "ikan-bakar", name: "Ikan bakar", price: 10000, energy: 20 },
      { id: "pecel-lele", name: "Pecel lele", price: 8000, energy: 18 },
    ],
  },
];

/** Plain stalls that fill out the rows (no vendor service); kuli drop stalls sit in the north row. */
export const EXTRA_STALLS: {
  x: number;
  z: number;
  facing: 0 | typeof Math.PI;
  label: string;
  goods: string;
}[] = [
  { x: 101, z: 3, facing: 0, label: "KIOS 1 · TELUR", goods: "telur" },
  { x: 113, z: 3, facing: 0, label: "KIOS 2 · SAYUR", goods: "sayur" },
  { x: 119, z: 3, facing: 0, label: "KIOS 3 · BERAS", goods: "beras" },
  { x: 95, z: 11, facing: Math.PI, label: "SAYUR MAYUR", goods: "sayur" },
  { x: 107, z: 11, facing: Math.PI, label: "BUMBU DAPUR", goods: "bumbu" },
  { x: 119, z: 11, facing: Math.PI, label: "SEMBAKO", goods: "beras" },
];

export const kioskById = (id: string) => KIOSKS.find((k) => k.id === id);
/** Kiosk whose customer spot is within `reach` metres (xz) of the position, nearest first. */
export function kioskNear(p: readonly number[], reach = 2.8): Kiosk | null {
  let best: Kiosk | null = null,
    bd = reach;
  for (const k of KIOSKS) {
    const d = Math.hypot(p[0]! - k.at[0], p[2]! - k.at[2]);
    if (d <= bd) ((best = k), (bd = d));
  }
  return best;
}

/** Pure toast text for a purchase. */
export const eatToast = (item: MenuItem, qty: number) =>
  `Nyam! ${item.name}${qty > 1 ? ` x${qty}` : ""} · ⚡ +${item.energy * qty}`;
