import { useEffect, useRef } from "react";
import { CASHIER_POS, SHELVES, STORE, STREET_Z, WAREHOUSE } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";
import { ROADS, SIDEWALKS, PARKING, CROSSWALKS } from "@/game/world/outdoor-layout";
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

interface Props {
  /** Ukuran canvas dalam px CSS. */
  size: number;
  /** Lebar dunia (meter) yang tampil. */
  range: number;
  /** Ikuti posisi pemain atau tampilkan seluruh area. */
  follow?: boolean;
  round?: boolean;
}

/** Minimap 2D dengan POI: rak, kasir, gudang, mitra, pemain lain. */
export function Minimap({ size, range, follow = true, round = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = canvas.current;
    if (c) {
      c.width = size * dpr;
      c.height = size * dpr;
    }
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 66) return; // ~15 fps cukup untuk peta
      last = t;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const { playerPos, playerYaw, waypoint } = useGame.getState();
      const cx = follow ? playerPos[0] : 0;
      const cz = follow ? playerPos[2] : 8;
      const k = size / range;
      const X = (x: number) => (x - cx) * k + size / 2;
      const Y = (z: number) => (z - cz) * k + size / 2;
      const rect = (minX: number, minZ: number, maxX: number, maxZ: number) =>
        [X(minX), Y(minZ), (maxX - minX) * k, (maxZ - minZ) * k] as const;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.ground;
      ctx.fillRect(0, 0, size, size);

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
      for (const s of SHELVES) {
        ctx.fillStyle = waypoint === s.id ? C.waypoint : C.shelf;
        ctx.beginPath();
        ctx.arc(X(s.position[0]), Y(s.position[2]), waypoint === s.id ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = C.cashier;
      ctx.beginPath();
      ctx.arc(X(CASHIER_POS[0]), Y(CASHIER_POS[2]), 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C.remote;
      for (const r of remoteStates.values()) {
        ctx.beginPath();
        ctx.arc(X(r.x), Y(r.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pemain: panah arah
      ctx.save();
      ctx.translate(X(playerPos[0]), Y(playerPos[2]));
      ctx.rotate(-playerYaw + Math.PI);
      ctx.fillStyle = C.player;
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
  }, [size, range, follow]);

  return (
    <canvas
      ref={canvas}
      style={{ width: size, height: size }}
      className={round ? "rounded-full" : "rounded-xl"}
      aria-label="Peta Toko Cung"
    />
  );
}

export const MAP_LEGEND = [
  { label: "Rak", color: C.shelf },
  { label: "Kasir", color: C.cashier },
  { label: "Mitra", color: C.place },
  { label: "Pemain", color: C.remote },
];
