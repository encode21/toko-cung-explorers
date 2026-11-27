import { FISHING_DECKS } from "@/game/fishing/pier-layout";
import { useEffect, useRef, useState } from "react";
import { ojekWaypoint, type OjekSpot } from "@/game/ojek/store";
import { islandOutline } from "@/game/swimming/model";
import { CITY_LAKE } from "@/game/world/expansion-plan";
import { STORE, WAREHOUSE } from "@/game/world/layout";
import {
  BUILDING_LOTS,
  DRIVEWAYS,
  PARKING,
  PEDESTRIAN,
  ROAD_EDGES,
  ROAD_NODES,
  ROADS,
  SIDEWALKS,
  type Bounds,
  type Point,
} from "@/game/world/outdoor-layout";
import { useGame } from "@/state/game-store";
import "./ojek-route-map.css";

interface Props {
  pickup?: OjekSpot | undefined;
  dropoff?: OjekSpot | undefined;
  stage: "idle" | "pickup" | "dropoff" | "preview";
}

const WIDTH = 320;
const INITIAL_HEIGHT = 180;
// Matches the canvas palette and coast/building colors in ui/minimap/Minimap.tsx.
const MAP = {
  ground: "#adc66f",
  ocean: "#4aafc4",
  coast: "#efdaad",
  water: "#53bfcf",
  road: "#e8e4da",
  walk: "#f4efdd",
  driveway: "#e4dfd1",
  parking: "#cbd5bf",
  pedestrian: "#f8efd9",
  buildingLine: "#a8ad8d",
  store: "#f2d5bc",
  storeLine: "#b78e69",
  warehouse: "#e2d7b5",
  player: "#345d7a",
  waypoint: "#d69b32",
};
const ROAD_IDS = Object.keys(ROAD_NODES) as (keyof typeof ROAD_NODES)[];
const ROAD_POINTS = ROAD_IDS.map((id) => ROAD_NODES[id]);
const EDGES = ROAD_EDGES.map(([a, b]) => [ROAD_IDS.indexOf(a), ROAD_IDS.indexOf(b)] as const);
const COAST = islandOutline();
const GRASS = islandOutline(2);
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.z - a.z);

function nearestRoad(point: Point) {
  let best = { edge: 0, point: ROAD_POINTS[0] as Point, distance: Infinity };
  EDGES.forEach(([aId, bId], edge) => {
    const a = ROAD_POINTS[aId]!;
    const b = ROAD_POINTS[bId]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)),
    );
    const projected = { x: a.x + dx * t, z: a.z + dz * t };
    const gap = distance(point, projected);
    if (gap < best.distance) best = { edge, point: projected, distance: gap };
  });
  return best;
}

/** Road centerlines are shared with traffic; dotted endpoint links are directions, not roads. */
function roadRoute(from: Point, to: Point): Point[] {
  const start = nearestRoad(from);
  const end = nearestRoad(to);
  const points = [...ROAD_POINTS, start.point, end.point];
  const startId = points.length - 2;
  const endId = points.length - 1;
  const adjacency = points.map(() => [] as { id: number; cost: number }[]);
  const connect = (a: number, b: number) => {
    const cost = distance(points[a]!, points[b]!);
    adjacency[a]!.push({ id: b, cost });
    adjacency[b]!.push({ id: a, cost });
  };
  EDGES.forEach(([a, b]) => connect(a, b));
  EDGES[start.edge]!.forEach((id) => connect(startId, id));
  EDGES[end.edge]!.forEach((id) => connect(endId, id));
  if (start.edge === end.edge) connect(startId, endId);

  const costs = points.map(() => Infinity);
  const previous = points.map(() => -1);
  const pending = new Set(points.map((_, id) => id));
  costs[startId] = 0;
  while (pending.size) {
    let next = -1;
    for (const id of pending) if (next < 0 || costs[id]! < costs[next]!) next = id;
    if (next < 0 || !Number.isFinite(costs[next]) || next === endId) break;
    pending.delete(next);
    for (const neighbor of adjacency[next]!) {
      const cost = costs[next]! + neighbor.cost;
      if (cost < costs[neighbor.id]!) {
        costs[neighbor.id] = cost;
        previous[neighbor.id] = next;
      }
    }
  }
  if (!Number.isFinite(costs[endId])) return [];
  const route: Point[] = [];
  for (let id = endId; id >= 0; id = previous[id]!) {
    route.unshift(points[id]!);
    if (id === startId) break;
  }
  return route;
}

function readPlayer() {
  const { playerPos, playerYaw } = useGame.getState();
  return { x: playerPos[0], z: playerPos[2], yaw: playerYaw };
}

/** A lightweight map of the actual city, with live position and road-based route guidance. */
export function OjekRouteMap({ pickup: pickupStop, dropoff: dropoffStop, stage }: Props) {
  const pickup = pickupStop ? ojekWaypoint(pickupStop)! : undefined;
  const dropoff = dropoffStop ? ojekWaypoint(dropoffStop)! : undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const [player, setPlayer] = useState(readPlayer);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = (width: number, renderedHeight: number) => {
      if (width <= 0 || renderedHeight <= 0) return;
      const next = (renderedHeight / width) * WIDTH;
      setHeight((current) => (Math.abs(current - next) < 0.1 ? current : next));
    };
    const bounds = container.getBoundingClientRect();
    measure(bounds.width, bounds.height);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = readPlayer();
      setPlayer((current) =>
        distance(current, next) < 0.15 && Math.abs(current.yaw - next.yaw) < 0.04 ? current : next,
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  const inCity =
    Number.isFinite(player.x) &&
    Number.isFinite(player.z) &&
    Math.abs(player.x) <= 305 &&
    Math.abs(player.z) <= 305;
  const from = stage === "preview" && pickup ? pickup : player;
  const target = stage === "pickup" ? pickup : stage === "idle" ? undefined : dropoff;
  const route = inCity && target ? roadRoute(from, target) : [];
  const focus = inCity ? [player, from, ...route, ...(target ? [target] : [])] : [{ x: 0, z: 12 }];
  const minX = Math.min(...focus.map((p) => p.x));
  const maxX = Math.max(...focus.map((p) => p.x));
  const minZ = Math.min(...focus.map((p) => p.z));
  const maxZ = Math.max(...focus.map((p) => p.z));
  // Fit the actual viewport, keeping the 24px pin heads and player halo inside short maps.
  const compact = height < 120;
  const topInset = compact ? 26 : 54;
  const bottomInset = compact ? 14 : 30;
  const availableHeight = Math.max(1, height - topInset - bottomInset);
  const scale = Math.min(
    (WIDTH - 76) / Math.max(100, maxX - minX),
    availableHeight / Math.max(54, maxZ - minZ),
  );
  const X = (x: number) => WIDTH / 2 + (x - (minX + maxX) / 2) * scale;
  const Y = (z: number) => topInset + availableHeight / 2 + (z - (minZ + maxZ) / 2) * scale;
  const path = (points: readonly Point[]) => points.map((p) => `${X(p.x)},${Y(p.z)}`).join(" ");
  const coast = (points: readonly [number, number][]) =>
    points.map(([x, z]) => `${X(x)},${Y(z)}`).join(" ");
  const rect = (bounds: Bounds) => ({
    x: X(bounds.minX),
    y: Y(bounds.minZ),
    width: (bounds.maxX - bounds.minX) * scale,
    height: (bounds.maxZ - bounds.minZ) * scale,
  });
  const showPin = (spot: OjekSpot) =>
    X(spot.x) > 12 && X(spot.x) < WIDTH - 12 && Y(spot.z) > 24 && Y(spot.z) < height - 4;
  const pin = (spot: OjekSpot, kind: "pickup" | "dropoff") => (
    <g
      transform={`translate(${X(spot.x)} ${Y(spot.z)})`}
      className={`ojek-map-pin ojek-map-pin-${kind}`}
    >
      <title>
        {kind === "pickup" ? "Jemput" : "Tujuan"}: {spot.name}
      </title>
      <path d="M0 2C-3-2-10-7-10-14a10 10 0 0 1 20 0C10-7 3-2 0 2Z" />
      <circle cy="-14" r="4" />
    </g>
  );
  const description = !inCity
    ? "Peta kota tersedia saat kamu berada di Mampang."
    : target
      ? `${stage === "pickup" ? "Menuju jemput" : "Menuju tujuan"}: ${target.name}. Garis putus-putus menunjukkan arah akses titik di luar jalan.`
      : "Posisimu di Mampang. Jalan dan bangunan sesuai dunia permainan.";

  return (
    <div
      ref={containerRef}
      className="ojek-route-map"
      data-route-stage={stage}
      data-map-compact={compact || undefined}
    >
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={description}>
        <rect width={WIDTH} height={height} fill={MAP.ocean} />
        <polygon points={coast(COAST)} fill={MAP.coast} />
        <polygon points={coast(GRASS)} fill={MAP.ground} />
        {FISHING_DECKS.map((d) => (
          <rect
            key={`${d.x}:${d.z}`}
            x={X(d.x - d.width / 2)}
            y={Y(d.z - d.depth / 2)}
            width={d.width * scale}
            height={d.depth * scale}
            fill="#b8875b"
          />
        ))}
        {[CITY_LAKE].map((water, i) => (
          <ellipse
            key={i}
            cx={X(water.x)}
            cy={Y(water.z)}
            rx={water.rx * scale}
            ry={water.rz * scale}
            fill={MAP.water}
          />
        ))}
        {SIDEWALKS.map((zone) => (
          <rect key={zone.id} {...rect(zone)} fill={MAP.walk} />
        ))}
        {ROADS.map((zone) => (
          <rect key={zone.id} {...rect(zone)} fill={MAP.road} />
        ))}
        {[...DRIVEWAYS, ...PARKING, ...PEDESTRIAN].map((zone) => (
          <rect
            key={zone.id}
            {...rect(zone)}
            fill={
              zone.kind === "driveway"
                ? MAP.driveway
                : zone.kind === "parking"
                  ? MAP.parking
                  : MAP.pedestrian
            }
          />
        ))}
        {BUILDING_LOTS.filter((lot) => lot.id !== "toko-cung").map((lot) => (
          <rect
            key={lot.id}
            x={X(lot.x) - (lot.width * scale) / 2}
            y={Y(lot.z) - (lot.depth * scale) / 2}
            width={lot.width * scale}
            height={lot.depth * scale}
            transform={`rotate(${(lot.rotation * 180) / Math.PI} ${X(lot.x)} ${Y(lot.z)})`}
            fill={lot.color}
            stroke={MAP.buildingLine}
            strokeWidth="0.7"
            rx="1"
          />
        ))}
        <rect {...rect(WAREHOUSE)} fill={MAP.warehouse} stroke={MAP.storeLine} strokeWidth="0.8" />
        <rect {...rect(STORE)} fill={MAP.store} stroke={MAP.storeLine} strokeWidth="0.8" />
        {route.length > 0 && target && (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={path(route)} stroke="#fffdf4" strokeWidth="7" />
            <polyline points={path(route)} stroke={MAP.waypoint} strokeWidth="4" />
            <polyline
              points={path([from, route[0]!])}
              stroke={MAP.waypoint}
              strokeWidth="2.5"
              strokeDasharray="2 5"
            />
            <polyline
              points={path([route.at(-1)!, target])}
              stroke={MAP.waypoint}
              strokeWidth="2.5"
              strokeDasharray="2 5"
            />
          </g>
        )}
        {pickup && showPin(pickup) && pin(pickup, "pickup")}
        {dropoff && showPin(dropoff) && pin(dropoff, "dropoff")}
        {inCity &&
          X(player.x) >= 10 &&
          X(player.x) <= WIDTH - 10 &&
          Y(player.z) >= 10 &&
          Y(player.z) <= height - 10 && (
            <g transform={`translate(${X(player.x)} ${Y(player.z)})`}>
              <circle r="13" fill="#4e88b12b" />
              <circle r="8" fill="#ffffff" />
              <path
                d="m0-6 5 11-5-2-5 2Z"
                fill={MAP.player}
                transform={`rotate(${180 - (player.yaw * 180) / Math.PI})`}
              />
            </g>
          )}
      </svg>
      <span className="ojek-map-name">Peta Mampang</span>
      <span className="ojek-map-north" aria-hidden="true">
        U<span />
      </span>
      {inCity && (pickup || dropoff) ? (
        <div className="ojek-map-legend" aria-hidden="true">
          {pickup && (
            <span>
              <i data-pin="pickup" />
              Jemput
            </span>
          )}
          {dropoff && (
            <span>
              <i data-pin="dropoff" />
              Tujuan
            </span>
          )}
        </div>
      ) : !inCity ? (
        <p className="ojek-map-unavailable">Peta tersedia di Mampang</p>
      ) : null}
    </div>
  );
}
