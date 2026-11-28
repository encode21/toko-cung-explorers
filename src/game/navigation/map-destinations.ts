import { prologDestination } from "@/game/prolog/guidance";
import { useGang, cityShopTarget } from "@/game/gang/store";
import { gangText, homeAddress } from "@/game/gang/model";
import { CITY_HELIPAD } from "@/game/mountain/model";
import { EXPANSION_DESTINATIONS } from "../world/expansion-plan";
import { VENUE_DESTINATIONS } from "@/game/club/venue-layout";
import { BEACH_DESTINATION } from "@/game/swimming/model";
import { FISHING_DESTINATION } from "@/game/fishing/model";
import {
  SHOWROOM_ENTRY,
  SHOWROOM_LOT,
  SHOWROOM_NAME,
  SHOWROOM_WAYPOINT,
} from "@/game/showroom/layout";
import { CASHIER_APPROACH, SHELVES, type ShelfId } from "@/game/world/layout";
import { BUILDING_LOTS } from "@/game/world/outdoor-layout";
import { NIAGA_COUNTER, NIAGA_LOT, NIAGA_NAME, NIAGA_WAYPOINT } from "@/game/delivery/niaga";
import { PLACES } from "@/game/world/places";
import { debtorSpot, PICKUP_SPOT } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { ojekTarget } from "@/game/ojek/store";
import { USAHA_LOTS, usahaOpen } from "@/game/usaha/model";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";

export type MapIconKind =
  | "store"
  | "warehouse"
  | "truck"
  | "music"
  | "basket"
  | "cashier"
  | "helipad"
  | "market"
  | "plaza"
  | "park"
  | "parking"
  | "fishing"
  | "beach"
  | "quest";
export type WaypointId =
  | ShelfId
  | (typeof EXPANSION_DESTINATIONS)[number]["id"]
  | "venue-helicopter"
  | "venue-club"
  | typeof SHOWROOM_WAYPOINT
  | typeof NIAGA_WAYPOINT
  | "venue-concert"
  | "venue-fishing"
  | "venue-beach"
  | "prolog-koko"
  | "prolog-motor"
  | "prolog-gate"
  | "prolog-restock"
  | "prolog-restock-kiosk"
  | "prolog-serve"
  | "prolog-ojek"
  | "prolog-home-window"
  | "prolog-home-box"
  | "prolog-home-bed"
  | "prolog-home-exit"
  | "prolog-home-shop"
  | "prolog-home-romlah"
  | "prolog-home-kosim"
  | "prolog-home-door"
  | "prolog-home-mouth"
  | "map-store"
  | "map-warehouse"
  | "map-cashier"
  | `map-place-${string}`
  | `warung-debt-${number}`
  | "warung-thief"
  | "ojek-pickup"
  | "ojek-dropoff"
  | "kulakan-pickup"
  | "venue-city-hall"
  | "garasi-parkir"
  | "usaha-warung"
  | "usaha-warteg"
  | "usaha-kos"
  | "gang-gate"
  | "gang-city-shop"
  | "delivery-target";
export interface MapDestination {
  id: WaypointId;
  label: string;
  detail: string;
  icon: MapIconKind;
  position: readonly [number, number, number];
  /** Position of the building icon, distinct from its accessible entrance. */
  marker?: readonly [number, number];
  interior?: boolean;
}

const CITY_LANDMARK_ICONS = {
  "venue-market": "market",
  "venue-square": "plaza",
  "venue-park": "park",
} as const satisfies Record<(typeof EXPANSION_DESTINATIONS)[number]["id"], MapIconKind>;

/** One registry for map details, ground arrows and the destination beacon. */
export const MAP_DESTINATIONS: MapDestination[] = [
  {
    id: "venue-helicopter",
    label: "Helipad Kota",
    detail: "Naik helikopter menuju basecamp Pegunungan. Dekati pintu helikopter untuk berangkat.",
    icon: "helipad",
    position: CITY_HELIPAD.boarding,
    marker: [CITY_HELIPAD.position[0], CITY_HELIPAD.position[2]],
  },
  ...EXPANSION_DESTINATIONS.map((v): MapDestination => ({ ...v, icon: CITY_LANDMARK_ICONS[v.id] })),
  {
    id: "venue-city-hall",
    label: "Kantor Wali Kota",
    detail: "Temui Pak Wali Kota di halaman kantor, di samping Masjid Cung.",
    icon: "quest",
    position: [128, 0.06, 128],
  },
  {
    id: "garasi-parkir",
    label: "Parkiran Taman Pantai",
    detail: "Kendaraan pribadimu parkir di sini. Dekati lalu tekan Naik.",
    icon: "parking",
    position: [80, 0, 103], // Approach aisle beside the personal-vehicle bays.
  },
  {
    id: "map-store",
    label: "Toko Cung",
    detail:
      "Belanja kebutuhan harian dan temui warga di Toko Cung. Masuk melalui pintu depan toko.",
    icon: "store",
    position: [0, 0, 4],
    marker: [0, -5],
  },
  {
    id: "map-warehouse",
    label: "Gudang",
    detail: "Area stok, packing, dan bongkar muat Toko Cung. Akses melalui pintu belakang gudang.",
    icon: "warehouse",
    position: [0, 0, -24],
    marker: [0, -18],
  },
  {
    id: "map-cashier",
    label: "Kasir",
    detail: "Selesaikan belanjamu di kasir setelah memilih barang dari rak toko.",
    icon: "cashier",
    position: CASHIER_APPROACH,
    interior: true,
  },
  ...(["warteg", "kos"] as const).filter(usahaOpen).map((kind): MapDestination => {
    const lot = USAHA_LOTS[kind];
    const [x, z] = lotFront(lot);
    return {
      id: `usaha-${kind}`,
      label: kind === "warteg" ? "Warteg" : "Kos-kosan",
      detail:
        kind === "warteg"
          ? "Ruko warteg yang bisa dibeli pakai Kas usaha. Masuk lewat pintu depan."
          : "Rumah kos yang bisa dibeli pakai Kas usaha. Masuk lewat pintu depan.",
      icon: "store",
      position: [x, 0, z],
      marker: [lot.x, lot.z],
    };
  }),
  {
    id: SHOWROOM_WAYPOINT,
    label: SHOWROOM_NAME,
    detail: "Showroom kendaraan di samping Cung Underground.",
    icon: "store",
    position: SHOWROOM_ENTRY.marker,
    marker: [SHOWROOM_LOT.x, SHOWROOM_LOT.z],
  },
  {
    id: NIAGA_WAYPOINT,
    label: NIAGA_NAME,
    detail: "Dealer Viar, Pickup & Truk Engkel di sebelah Cung Motor.",
    icon: "truck",
    position: [NIAGA_COUNTER[0], 0, NIAGA_COUNTER[1]],
    marker: [NIAGA_LOT.x, NIAGA_LOT.z],
  },
  ...VENUE_DESTINATIONS.map((v): MapDestination => ({ ...v, icon: "music" })),
  {
    id: FISHING_DESTINATION.id,
    label: FISHING_DESTINATION.label,
    detail: FISHING_DESTINATION.detail,
    icon: "fishing",
    position: FISHING_DESTINATION.position,
  },
  {
    id: BEACH_DESTINATION.id,
    label: BEACH_DESTINATION.label,
    detail: BEACH_DESTINATION.detail,
    icon: "beach",
    position: BEACH_DESTINATION.position,
  },
  ...SHELVES.map((s): MapDestination => ({
    ...s,
    icon: "basket",
    detail: "Temukan produk di rak ini, lalu lanjutkan belanjamu ke kasir.",
    interior: true,
  })),
  ...PLACES.filter((p) => p.id !== "pasar").map((p): MapDestination => {
    const lot = BUILDING_LOTS.find((building) => building.x === p.c[0] && building.z === p.c[1]);
    const [x, z] = lot ? lotFront(lot, 1.5) : [p.c[0], p.c[1] - 5];
    return {
      id: `map-place-${p.id}`,
      label: p.name,
      detail:
        p.tone === "courier"
          ? "Drop point ekspedisi di lingkungan Toko Cung."
          : p.tone === "civic"
            ? p.subtitle
            : "Mitra pemasok di lingkungan Toko Cung.",
      icon: p.tone === "courier" ? "truck" : "store",
      marker: p.c,
      position: [x, 0, z],
    };
  }),
];

export function mapDestination(id: string | null | undefined): MapDestination | undefined {
  if (
    id === "prolog-gate" ||
    id === "prolog-restock" ||
    id === "prolog-serve" ||
    id === "prolog-ojek"
  ) {
    const source = {
      "prolog-gate": "gang-gate",
      "prolog-restock": "map-store",
      "prolog-serve": "usaha-warung",
      "prolog-ojek": "ojek-pickup",
    } as const;
    const target = mapDestination(source[id]);
    return target && { ...target, id };
  }
  if (id?.startsWith("prolog-")) return prologDestination(id);
  const gang = useGang.getState().data;
  if (gang && id === "gang-gate")
    return {
      id,
      label: gang.text["gate"]!,
      detail: homeAddress(gang),
      icon: "store",
      position: [gang.layout.gate.x, 0, gang.layout.gate.z],
      marker: [gang.layout.gate.x, gang.layout.gate.z],
    };
  if (gang && id === "gang-city-shop") {
    const target = cityShopTarget();
    if (target)
      return {
        id,
        label: gang.text["navigate_city_shop"]!,
        detail: gangText(gang, "city_shop", { lot: (useGang.getState().cityLot ?? 0) + 1 }),
        icon: "store",
        position: [target[0], 0, target[1]],
      };
  }
  if (id === "kulakan-pickup")
    return {
      id,
      label: "Ambil dus",
      detail: "Dus kulakan bawa sendiri menunggu di driveway timur Toko Cung, sebelah tangga JPO.",
      icon: "truck",
      position: [PICKUP_SPOT[0], 0, PICKUP_SPOT[1]],
      marker: PICKUP_SPOT,
    };
  if (id === "ojek-pickup" || id === "ojek-dropoff") {
    const spot = ojekTarget();
    if (spot) {
      return {
        id,
        label: `🛵 ${spot.name}`,
        detail:
          id === "ojek-pickup" ? "Jemput penumpang ojek di sini." : "Antar penumpang ojek ke sini.",
        icon: "quest",
        position: [spot.x, 0, spot.z],
        marker: [spot.x, spot.z],
      };
    }
  }
  if (id === "usaha-warung") {
    const { data, lots } = useWarung.getState();
    const index =
      lots.find((l) => l.id === data?.warung?.id)?.lot ??
      data?.lotMarket?.find((offer) => offer.mine)?.lot;
    const lot = index === undefined ? undefined : WARUNG_LOTS[index];
    if (lot) {
      const [x, z] = lotFront(lot);
      return {
        id,
        label: "Warungku",
        detail: "Warung milikmu. Masuk lewat pintu depan.",
        icon: "store",
        position: [x, 0, z],
        marker: [lot.x, lot.z],
      };
    }
  }
  if (id === "warung-thief") {
    const thief = useWarung.getState().thief;
    if (thief) {
      return {
        id: "warung-thief",
        label: `🚨 ${thief.name}`,
        detail: "Kejar dan tabrak pencuri sebelum kabur membawa Kas & stok warungmu!",
        icon: "quest",
        position: [thief.x, 0, thief.z],
        marker: [thief.x, thief.z],
      };
    }
  }
  if (id?.startsWith("warung-debt-")) {
    const debtId = Number(id.slice("warung-debt-".length));
    if (Number.isFinite(debtId)) {
      const spot = debtorSpot(debtId);
      return {
        id: id as WaypointId,
        label: "Penghutang Warung",
        detail: `Temui penghutang di ${spot.area} untuk menagih utang langsung.`,
        icon: "quest",
        position: [spot.x, 0, spot.z],
        marker: [spot.x, spot.z],
      };
    }
  }
  if (id === "delivery-target") {
    const delivery = useWarung.getState().data?.delivery;
    const target = delivery?.orders.find(
      (o) => o.assignedSelf && (o.status === "DISPATCHED" || o.status === "IN_TRANSIT"),
    );
    if (target) {
      return {
        id: "delivery-target",
        label: `📦 Antar ke ${target.npcName}`,
        detail: `${target.addressLabel} (${target.area})`,
        icon: "truck",
        position: target.pos,
        marker: [target.pos[0], target.pos[2]],
      };
    }
  }
  return MAP_DESTINATIONS.find((p) => p.id === id);
}
