import type { MapIconKind } from "@/game/navigation/map-destinations";

/** Solid pictograms shared by map pins, the location list and the detail card. */
export function MapPoiIcon({ kind }: { kind: MapIconKind | "player" | "direction" }) {
  const paths = {
    store:
      "M4 3h24l3 9c0 3-4 5-7 2-2 3-6 3-8 0-2 3-6 3-8 0-3 3-7 1-7-2zm0 14h9v11H4zm15 0h9v11h-9z",
    warehouse: "M2 13 16 3l14 10v3h-3v13h-5V16H10v13H5V16H2zm10 6h8v3h-8zm0 5h8v5h-8z",
    truck:
      "M2 6h18v15H2zm20 5h5l4 6v6h-9zm2 3v4h4l-2-4zM9 23a4 4 0 1 1-8 0 4 4 0 0 1 8 0m20 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    music: "M13 5 29 2v21a5 5 0 1 1-4-5V9l-8 2v15a5 5 0 1 1-4-5z",
    basket: "M8 12 13 3l3 2-4 7h8l-4-7 3-2 5 9h6l-4 16H6L2 12zm2 5 1 7h3l-1-7zm9 0-1 7h3l1-7z",
    cashier:
      "M8 2h16v11H8zm3 3v4h10V5zM5 15h22l3 13H2zm7 8v2h8v-2zm-3-6v3h3v-3zm6 0v3h3v-3zm6 0v3h3v-3z",
    quest: "M12 3h8l-1 17h-6zm8 23a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    player: "M23 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0M5 30v-5a11 11 0 0 1 22 0v5z",
    direction: "M29 3 19 29l-5-11-11-5z",
  };
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d={paths[kind]} fillRule="evenodd" />
    </svg>
  );
}
