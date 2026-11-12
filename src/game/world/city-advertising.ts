import type { Vec3 } from "./layout";
export const CITY_AD_LIFT = 1.4;
export const CITY_AD_PANEL_Y = 3.04 + CITY_AD_LIFT;
export const CITY_AD_POLE = { x: -1.02, half: 0.15, height: 2.3 + CITY_AD_LIFT };
export const CITY_AD_PANEL_HALF = [0.89, 1.32, 0.07] as const;

export interface CityAdSlot {
  id: string;
  label: string;
  position: Vec3;
  yaw: number;
  /** Public image path, e.g. /ads/promo-november.webp. Empty uses the neutral house poster. */
  imageUrl: string;
}

/** Two-sided 2:3 panels face approaching road users; the pole stays at the back of the sidewalk. */
export const CITY_AD_SLOTS: readonly CityAdSlot[] = [
  {
    id: "pusat-01",
    label: "Depan Toko Cung",
    position: [3.5, 0, 24.15],
    yaw: Math.PI / 2,
    imageUrl: "/ads/promo-abc.png",
  },
  {
    id: "pusat-02",
    label: "Simpang barat",
    position: [-48, 0, 24.15],
    yaw: Math.PI / 2,
    imageUrl: "",
  },
  {
    id: "kampung-01",
    label: "Jalan kampung",
    position: [-34.15, 0, -13],
    yaw: 0,
    imageUrl: "",
  },
  {
    id: "pasar-01",
    label: "Depan pasar",
    position: [96, 0, 24.15],
    yaw: Math.PI / 2,
    imageUrl: "",
  },
];

/** The backing stays visible on load errors; unsupported schemes never reach the loader. */
export function cityAdImageUrl(value: string): string | null {
  const url = value.trim();
  if (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url)) return url;
  return null;
}
