import { useClub } from "@/game/club/store";
import { VENUE_DESTINATIONS } from "@/game/club/venue-layout";
import { useEffect, useRef } from "react";
import { CASHIER_POS, SHELVES, STORE, WAREHOUSE } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";
import {
  BUILDING_LOTS,
  CROSSWALKS,
  DRIVEWAYS,
  GREEN,
  PARKING,
  PEDESTRIAN,
  ROADS,
  SIDEWALKS,
  type Bounds,
} from "@/game/world/outdoor-layout";
import { remoteStates } from "@/net/useWorldChannel";
import { useGame } from "@/state/game-store";

/** Warna peta (canvas tidak membaca CSS token, jadi didefinisikan di sini). */
const C = {
  ground: "#cfe3c4",
  road: "#9aa6b2",
  store: "#fbf5ea",
  storeLine: "#c8443a",
  warehouse: "#e6dccb",
  shelf: "#c8443a",
  waypoint: "#f2a33c",
  cashier: "#2f7d59",
  place: "#5d8fb3",
  player: "#1e2a44",
  remote: "#3b82c4",
};

const DETAIL = {
  ground: "#dce7cb",
  road: "#e8e4da",
  walk: "#f4efdd",
  green: "#b3cf9b",
  store: "#f2d5bc",
  warehouse: "#e2d7b5",
  shelf: "#c96859",
  cashier: "#3c8775",
  place: "#5a839c",
  storeMarker: "#b86a4d",
  warehouseMarker: "#a18b4e",
  player: "#345d7a",
  remote: "#54a772",
  waypoint: "#d69b32",
};
const STORE_CENTER = {
  x: (STORE.minX + STORE.maxX) / 2,
  z: (STORE.minZ + STORE.maxZ) / 2,
};
const WAREHOUSE_CENTER = {
  x: (WAREHOUSE.minX + WAREHOUSE.maxX) / 2,
  z: (WAREHOUSE.minZ + WAREHOUSE.maxZ) / 2,
};

type LandmarkKind = "store" | "warehouse" | "partner" | "cashier";
type LabelBox = { x: number; y: number; width: number; height: number };
type MapLabel = { x: number; y: number; text: string; color: string };

/** Screen-sized symbols remain legible while the world geometry keeps its meter scale. */
function landmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  kind: LandmarkKind,
) {
  ctx.save();
  ctx.fillStyle = "#fffdf3";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#42533b29";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();
  ctx.translate(x, y);
  ctx.scale(radius / 11, radius / 11);
  ctx.lineWidth = 1.4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === "warehouse") {
    ctx.moveTo(-6, -2);
    ctx.lineTo(0, -6);
    ctx.lineTo(6, -2);
    ctx.lineTo(6, 5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.rect(-3, 0, 6, 5);
    ctx.moveTo(-3, 2.5);
    ctx.lineTo(3, 2.5);
  } else if (kind === "cashier") {
    ctx.rect(-5, -1, 10, 6);
    ctx.rect(-3, -6, 6, 4);
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, 2);
  } else {
    ctx.rect(-5, -1, 10, 6);
    ctx.moveTo(-6, -1);
    ctx.lineTo(-4.5, -5);
    ctx.lineTo(4.5, -5);
    ctx.lineTo(6, -1);
    ctx.closePath();
    if (kind === "store") {
      ctx.moveTo(-2, -5);
      ctx.lineTo(-2, -1);
      ctx.moveTo(2, -5);
      ctx.lineTo(2, -1);
    }
    ctx.rect(-1.5, 1, 3, 4);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  items: MapLabel[],
  width: number,
  height: number,
) {
  const occupied: LabelBox[] = items.map(({ x, y }) => ({
    x: x - 13,
    y: y - 13,
    width: 26,
    height: 26,
  }));
  ctx.save();
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  const overlaps = (a: LabelBox, b: LabelBox) =>
    a.x < b.x + b.width + 4 &&
    a.x + a.width + 4 > b.x &&
    a.y < b.y + b.height + 4 &&
    a.y + a.height + 4 > b.y;
  for (const item of items) {
    const words = item.text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > 148) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    const labelWidth = Math.max(...lines.map((text) => ctx.measureText(text).width)) + 16;
    const labelHeight = lines.length * 14 + 8;
    const candidates = [
      { x: item.x - labelWidth / 2, y: item.y + 17 },
      { x: item.x - labelWidth / 2, y: item.y - 17 - labelHeight },
      ...[0, -28, 28, -56, 56, -84, 84].flatMap((dy) => [
        { x: item.x + 19, y: item.y - labelHeight / 2 + dy },
        { x: item.x - labelWidth - 19, y: item.y - labelHeight / 2 + dy },
      ]),
    ];
    const box = candidates
      .map((position) => ({ ...position, width: labelWidth, height: labelHeight }))
      .find(
        (candidate) =>
          candidate.x >= 8 &&
          candidate.y >= 8 &&
          candidate.x + candidate.width <= width - 8 &&
          candidate.y + candidate.height <= height - 8 &&
          !occupied.some((other) => overlaps(candidate, other)),
      );
    if (!box) continue;
    occupied.push(box);
    ctx.strokeStyle = `${item.color}80`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y);
    ctx.lineTo(
      Math.max(box.x, Math.min(box.x + box.width, item.x)),
      Math.max(box.y, Math.min(box.y + box.height, item.y)),
    );
    ctx.stroke();
    ctx.fillStyle = "#fffdf2ed";
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, 4);
    ctx.fill();
    ctx.fillStyle = "#435446";
    lines.forEach((text, i) => ctx.fillText(text, box.x + 8, box.y + 11 + i * 14));
  }
  ctx.restore();
}

interface Props {
  /** Lebar canvas dalam px CSS. */
  size: number;
  /** Tinggi canvas; default tetap persegi untuk minimap HUD. */
  height?: number;
  /** Rentang dunia (meter) pada sisi canvas yang lebih pendek. */
  range: number;
  /** Ikuti posisi pemain atau tampilkan seluruh area. */
  follow?: boolean;
  round?: boolean;
  detailed?: boolean;
  labels?: boolean;
}

/** Minimap 2D dengan POI: rak, kasir, gudang, mitra, pemain lain. */
export function Minimap({
  size,
  height = size,
  range,
  follow = true,
  round = false,
  detailed = false,
  labels = false,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || size <= 0 || height <= 0 || range <= 0) return;
    c.width = Math.round(size * dpr);
    c.height = Math.round(height * dpr);
    // A fixed overview reuses its terrain and labels; only live markers redraw at 15fps.
    const terrain = detailed && !follow ? document.createElement("canvas") : null;
    if (terrain) {
      terrain.width = c.width;
      terrain.height = c.height;
    }
    const terrainContext = terrain?.getContext("2d");
    let terrainReady = false;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 66) return; // ~15 fps cukup untuk peta
      last = t;
      const { playerPos, playerYaw, waypoint } = useGame.getState();
      const venue = useClub.getState().inside && !useClub.getState().outdoor;
      const cx = follow ? playerPos[0] : 0;
      const cz = follow ? playerPos[2] : venue ? 0 : 8;
      const k = Math.min(size, height) / (venue ? Math.min(range, 32) : range);
      const X = (x: number) => (x - cx) * k + size / 2;
      const Y = (z: number) => (z - cz) * k + height / 2;
      const rect = (minX: number, minZ: number, maxX: number, maxZ: number) =>
        [X(minX), Y(minZ), (maxX - minX) * k, (maxZ - minZ) * k] as const;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (venue) {
        ctx.fillStyle = "#151b2d";
        ctx.fillRect(0, 0, size, height);
        const areas = [
          [-12, -11, 12, 11, "#44435d"],
          [-5, -5, 5, 5, "#8b629e"],
        ] as const;
        for (const [x0, z0, x1, z1, color] of areas) {
          ctx.fillStyle = color;
          ctx.fillRect(...rect(x0, z0, x1, z1));
        }
        ctx.fillStyle = "#fff1cf";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CLUB", X(0), Y(-8));
        ctx.fillText("EXIT", X(0), Y(9));
      } else if (detailed) {
        const background = terrainContext ?? ctx;
        if (!terrainReady || !terrainContext) {
          background.setTransform(dpr, 0, 0, dpr, 0, 0);
          background.fillStyle = DETAIL.ground;
          background.fillRect(0, 0, size, height);
          const fillZones = (zones: readonly Bounds[], color: string) => {
            background.fillStyle = color;
            for (const zone of zones)
              background.fillRect(...rect(zone.minX, zone.minZ, zone.maxX, zone.maxZ));
          };
          fillZones(GREEN, DETAIL.green);
          fillZones(SIDEWALKS, DETAIL.walk);
          fillZones(ROADS, DETAIL.road);
          fillZones(DRIVEWAYS, "#e4dfd1");
          fillZones(PARKING, "#cbd5bf");
          fillZones(PEDESTRIAN, "#f8efd9");
          fillZones(CROSSWALKS, "#fff9e9");

          for (const lot of BUILDING_LOTS) {
            if (lot.id === "toko-cung") continue;
            background.save();
            background.translate(X(lot.x), Y(lot.z));
            background.rotate(lot.rotation);
            const w = lot.width * k;
            const h = lot.depth * k;
            background.fillStyle = "#879b7133";
            background.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
            background.fillStyle = lot.color;
            background.strokeStyle = "#a8ad8d";
            background.lineWidth = 1;
            background.fillRect(-w / 2, -h / 2, w, h);
            background.strokeRect(-w / 2, -h / 2, w, h);
            background.strokeStyle = "#fffbea99";
            background.beginPath();
            background.moveTo(-w / 2 + 2, 0);
            background.lineTo(w / 2 - 2, 0);
            background.stroke();
            background.restore();
          }
          fillZones([WAREHOUSE], DETAIL.warehouse);
          fillZones([STORE], DETAIL.store);
          background.lineWidth = 1.5;
          background.strokeStyle = "#b78e69";
          for (const bounds of [STORE, WAREHOUSE])
            background.strokeRect(...rect(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ));

          const mapLabels: MapLabel[] = [
            {
              x: X(STORE_CENTER.x),
              y: Y(STORE_CENTER.z),
              text: "Toko Cung",
              color: DETAIL.storeMarker,
            },
            {
              x: X(WAREHOUSE_CENTER.x),
              y: Y(WAREHOUSE_CENTER.z),
              text: "Gudang",
              color: DETAIL.warehouseMarker,
            },
            ...PLACES.map((place) => ({
              x: X(place.c[0]),
              y: Y(place.c[1]),
              text: place.name,
              color: DETAIL.place,
            })),
          ];
          if (labels) drawLabels(background, mapLabels, size, height);
          for (const place of PLACES)
            landmark(background, X(place.c[0]), Y(place.c[1]), 11, DETAIL.place, "partner");
          landmark(
            background,
            X(WAREHOUSE_CENTER.x),
            Y(WAREHOUSE_CENTER.z),
            11,
            DETAIL.warehouseMarker,
            "warehouse",
          );
          landmark(
            background,
            X(STORE_CENTER.x),
            Y(STORE_CENTER.z),
            11,
            DETAIL.storeMarker,
            "store",
          );
          landmark(background, X(CASHIER_POS[0]), Y(CASHIER_POS[2]), 7, DETAIL.cashier, "cashier");
          terrainReady = true;
        }
        if (terrain && terrainContext) ctx.drawImage(terrain, 0, 0, size, height);
      } else {
        ctx.fillStyle = C.ground;
        ctx.fillRect(0, 0, size, height);

        ctx.fillStyle = C.road;
        for (const road of ROADS) ctx.fillRect(...rect(road.minX, road.minZ, road.maxX, road.maxZ));
        ctx.fillStyle = "#d5cdbc";
        for (const walk of SIDEWALKS)
          ctx.fillRect(...rect(walk.minX, walk.minZ, walk.maxX, walk.maxZ));
        ctx.fillStyle = "#a3a69e";
        for (const parking of PARKING)
          ctx.fillRect(...rect(parking.minX, parking.minZ, parking.maxX, parking.maxZ));
        ctx.fillStyle = "#fff1d4";
        for (const cross of CROSSWALKS)
          ctx.fillRect(...rect(cross.minX, cross.minZ, cross.maxX, cross.maxZ));

        ctx.fillStyle = C.warehouse;
        ctx.fillRect(...rect(WAREHOUSE.minX, WAREHOUSE.minZ, WAREHOUSE.maxX, WAREHOUSE.maxZ));
        ctx.fillStyle = C.store;
        ctx.fillRect(...rect(STORE.minX, STORE.minZ, STORE.maxX, STORE.maxZ));
        ctx.strokeStyle = C.storeLine;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(...rect(STORE.minX, STORE.minZ, STORE.maxX, STORE.maxZ));

        for (const p of PLACES) {
          ctx.fillStyle = C.place;
          ctx.fillRect(X(p.c[0]) - 3 * k, Y(p.c[1]) - 3 * k, 6 * k, 6 * k);
        }
      }
      for (const s of venue ? [] : [...SHELVES, ...VENUE_DESTINATIONS]) {
        const selected = waypoint === s.id;
        const x = X(s.position[0]);
        const y = Y(s.position[2]);
        ctx.fillStyle = selected
          ? detailed
            ? DETAIL.waypoint
            : C.waypoint
          : detailed
            ? DETAIL.shelf
            : C.shelf;
        ctx.beginPath();
        ctx.arc(x, y, selected ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (detailed) {
          ctx.strokeStyle = "#fffdf4";
          ctx.lineWidth = 1;
          ctx.stroke();
          if (selected) {
            ctx.strokeStyle = DETAIL.waypoint;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      if (!detailed && !venue) {
        ctx.fillStyle = C.cashier;
        ctx.beginPath();
        ctx.arc(X(CASHIER_POS[0]), Y(CASHIER_POS[2]), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = detailed ? DETAIL.remote : C.remote;
      for (const r of remoteStates.values()) {
        if (r.y < -5 !== venue) continue;
        ctx.beginPath();
        ctx.arc(X(r.x), Y(r.z), detailed ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (detailed) {
          ctx.strokeStyle = "#fffdf3";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Pemain: panah arah
      ctx.save();
      ctx.translate(X(playerPos[0]), Y(playerPos[2]));
      if (detailed) {
        ctx.fillStyle = "#4e88b12b";
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.scale(1.3, 1.3);
      }
      ctx.rotate(-playerYaw + Math.PI);
      ctx.fillStyle = detailed ? DETAIL.player : C.player;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, height, range, follow, detailed, labels]);

  return (
    <canvas
      ref={canvas}
      style={{ width: size, height, display: detailed ? "block" : undefined }}
      className={detailed ? undefined : round ? "rounded-full" : "rounded-xl"}
      aria-label="Peta Toko Cung"
    />
  );
}

export const MAP_LEGEND = [
  { label: "Rak", color: DETAIL.shelf },
  { label: "Kasir", color: DETAIL.cashier },
  { label: "Mitra", color: DETAIL.place },
  { label: "Gudang", color: DETAIL.warehouseMarker },
  { label: "Toko", color: DETAIL.storeMarker },
  { label: "Pemain", color: DETAIL.remote },
  { label: "Kamu", color: DETAIL.player },
];
