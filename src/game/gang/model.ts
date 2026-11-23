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
  style: Record<DecorSlot, DecorItem>;
  warung: {
    id: number;
    name: string;
    level: number;
    levelName: string;
    lot: number | null;
    open: boolean;
  } | null;
};
export type GangData = {
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
