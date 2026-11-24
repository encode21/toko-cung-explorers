import type { DecorPlacement, WarungStyle } from "./decor";

export type DecorSurface = DecorPlacement["surface"];
type PlacementStyle = Pick<WarungStyle, "extras" | "placements">;
export interface DecorInstance {
  id: string;
  decorId: string;
  placement: DecorPlacement;
}
interface DecorRule {
  surface: "floor" | "wall" | "ceiling";
  label: string;
  surfaces: DecorSurface[];
  /** Half width/depth, and total height for standing/ceiling items; half height for wall items. */
  width: number;
  depth: number;
  height: number;
}
const walls: DecorSurface[] = ["back-wall", "left-wall", "right-wall"];
export const DECOR_PLACEMENT_RULES: Record<string, DecorRule> = {
  poster: {
    surface: "wall",
    label: "Dinding",
    surfaces: walls,
    width: 0.5,
    depth: 0.08,
    height: 0.65,
  },
  kipas: {
    surface: "wall",
    label: "Dinding",
    surfaces: walls,
    width: 0.55,
    depth: 0.3,
    height: 0.55,
  },
  "neon-buka": {
    surface: "wall",
    label: "Dinding",
    surfaces: walls,
    width: 1.1,
    depth: 0.08,
    height: 0.4,
  },
  "lampu-hias": {
    surface: "wall",
    label: "Dinding belakang",
    surfaces: ["back-wall"],
    width: 5.75,
    depth: 0.14,
    height: 0.3,
  },
  tanaman: {
    surface: "floor",
    label: "Lantai",
    surfaces: ["floor"],
    width: 0.58,
    depth: 0.58,
    height: 2.13,
  },
  "meja-makan": {
    surface: "floor",
    label: "Lantai",
    surfaces: ["floor"],
    width: 1.3,
    depth: 1.15,
    height: 0.92,
  },
  "kulkas-neon": {
    surface: "floor",
    label: "Lantai",
    surfaces: ["floor"],
    width: 0.62,
    depth: 0.53,
    height: 2.3,
  },
  akuarium: {
    surface: "floor",
    label: "Lantai",
    surfaces: ["floor"],
    width: 0.45,
    depth: 0.95,
    height: 1.8,
  },
  "lampu-gantung": {
    surface: "ceiling",
    label: "Langit-langit",
    surfaces: ["ceiling"],
    width: 0.4,
    depth: 0.4,
    height: 1.32,
  },
};
const placement = (
  surface: DecorSurface,
  x: number,
  y: number,
  z: number,
  rotation = 0,
): DecorPlacement => ({ surface, x, y, z, rotation });
/** Legacy origins preserve the existing shop until an owner explicitly moves an instance. */
export const DECOR_DEFAULT_INSTANCES: DecorInstance[] = [
  {
    id: "poster:0",
    decorId: "poster",
    placement: placement("left-wall", -5.8, 2.1, 1.6, Math.PI / 2),
  },
  {
    id: "poster:1",
    decorId: "poster",
    placement: placement("left-wall", -5.8, 2.1, 3.1, Math.PI / 2),
  },
  {
    id: "poster:2",
    decorId: "poster",
    placement: placement("right-wall", 5.8, 2.1, 2.6, -Math.PI / 2),
  },
  { id: "tanaman:0", decorId: "tanaman", placement: placement("floor", -5.2, 0, 4.25) },
  { id: "tanaman:1", decorId: "tanaman", placement: placement("floor", 5.2, 0, 4.25) },
  {
    id: "kipas:0",
    decorId: "kipas",
    placement: placement("left-wall", -5.76, 2.9, 0.8, Math.PI / 2),
  },
  { id: "lampu-hias:0", decorId: "lampu-hias", placement: placement("back-wall", 0, 3.1, 6.05) },
  ...[-1.8, 0, 1.8].map((x, i) => ({
    id: `lampu-gantung:${i}`,
    decorId: "lampu-gantung",
    placement: placement("ceiling", x, 3.5, 0.9),
  })),
  { id: "meja-makan:0", decorId: "meja-makan", placement: placement("floor", 3.6, 0, 3.3) },
  { id: "neon-buka:0", decorId: "neon-buka", placement: placement("back-wall", 4.35, 1.8, 5.08) },
  { id: "kulkas-neon:0", decorId: "kulkas-neon", placement: placement("floor", -5.15, 0, -3.6) },
  { id: "akuarium:0", decorId: "akuarium", placement: placement("floor", 5.3, 0, 1.7) },
];
export function getDecorRule(decorId: string) {
  return DECOR_PLACEMENT_RULES[decorId];
}
export function getDecorPlacement(
  style: PlacementStyle,
  instanceId: string,
): DecorPlacement | null {
  return (
    style.placements?.[instanceId] ??
    DECOR_DEFAULT_INSTANCES.find((instance) => instance.id === instanceId)?.placement ??
    null
  );
}
export function getDecorInstances(style: PlacementStyle): DecorInstance[] {
  return DECOR_DEFAULT_INSTANCES.filter((instance) => style.extras.includes(instance.decorId)).map(
    (instance) => ({ ...instance, placement: getDecorPlacement(style, instance.id)! }),
  );
}
export interface DecorBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
const box = (
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): DecorBox => ({ minX, maxX, minY, maxY, minZ, maxZ });
/** Same solid fixtures and walking lane used by the server placement validator. */
export const DECOR_OBSTACLES: DecorBox[] = [
  box(-3.9, 3.9, 0, 1.85, -1.7, -0.3),
  ...[-4, 0, 4].map((x) => box(x - 1.55, x + 1.55, 0, 2.7, -4.7, -3.75)),
  ...[-3.95, 3.95].map((x) => box(x - 1.55, x + 1.55, 0, 2.7, 1.34, 2.26)),
  box(4.6, 5.7, 0, 2.3, -3.25, -2.1),
  box(-1.2, 1.2, 0, 2.1, -0.3, 5),
  box(-2.25, 2.25, 0, 2.1, 0.45, 1.75),
  box(-5.8, -3.15, 0, 1.1, 4.75, 5.1),
  box(3.15, 5.8, 0, 1.1, 4.75, 5.1),
];
export function decorPlacementBox(decorId: string, p: DecorPlacement): DecorBox {
  const rule = DECOR_PLACEMENT_RULES[decorId]!;
  const c = Math.abs(Math.cos(p.rotation)),
    s = Math.abs(Math.sin(p.rotation));
  const dx = rule.width * c + rule.depth * s,
    dz = rule.width * s + rule.depth * c;
  const minY =
    rule.surface === "wall"
      ? p.y - rule.height
      : rule.surface === "ceiling"
        ? p.y - rule.height
        : p.y;
  const maxY =
    rule.surface === "wall"
      ? p.y + rule.height
      : rule.surface === "ceiling"
        ? p.y
        : p.y + rule.height;
  return box(p.x - dx, p.x + dx, minY, maxY, p.z - dz, p.z + dz);
}
const intersects = (a: DecorBox, b: DecorBox) =>
  a.minX < b.maxX - 0.015 &&
  a.maxX > b.minX + 0.015 &&
  a.minY < b.maxY - 0.015 &&
  a.maxY > b.minY + 0.015 &&
  a.minZ < b.maxZ - 0.015 &&
  a.maxZ > b.minZ + 0.015;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function clampDecorPlacement(
  instanceId: string,
  proposal: DecorPlacement,
): DecorPlacement | null {
  const instance = DECOR_DEFAULT_INSTANCES.find((entry) => entry.id === instanceId);
  if (!instance || ![proposal.x, proposal.y, proposal.z, proposal.rotation].every(Number.isFinite))
    return null;
  const rule = DECOR_PLACEMENT_RULES[instance.decorId]!;
  if (!rule.surfaces.includes(proposal.surface)) return null;
  const p = { ...proposal };
  if (rule.surface === "wall") {
    p.rotation =
      p.surface === "left-wall" ? Math.PI / 2 : p.surface === "right-wall" ? -Math.PI / 2 : 0;
    p.y = clamp(p.y, 0.2 + rule.height, 3.5 - rule.height);
    if (p.surface === "back-wall") {
      p.z = -4.76;
      p.x = clamp(p.x, -5.8 + rule.width, 5.8 - rule.width);
    } else {
      p.x = p.surface === "left-wall" ? -5.76 : 5.76;
      p.z = clamp(p.z, -4.8 + rule.width, 4.8 - rule.width);
    }
  } else {
    p.rotation = (((Math.round(p.rotation / (Math.PI / 2)) % 4) + 4) % 4) * (Math.PI / 2);
    const c = Math.abs(Math.cos(p.rotation)),
      s = Math.abs(Math.sin(p.rotation));
    const dx = rule.width * c + rule.depth * s,
      dz = rule.width * s + rule.depth * c;
    p.x = clamp(p.x, -5.8 + dx, 5.8 - dx);
    p.z = clamp(p.z, -4.8 + dz, 4.8 - dz);
    p.y = rule.surface === "floor" ? 0.03 : 3.5;
  }
  return p;
}
/** Clamps to the chosen surface, then rejects furniture, access routes and other decor. */
export function constrainDecorPlacement(
  instanceId: string,
  proposal: DecorPlacement,
  style: PlacementStyle,
): DecorPlacement | null {
  const p = clampDecorPlacement(instanceId, proposal);
  const instance = DECOR_DEFAULT_INSTANCES.find((entry) => entry.id === instanceId);
  if (!p || !instance) return null;
  const bounds = decorPlacementBox(instance.decorId, p);
  if (DECOR_OBSTACLES.some((obstacle) => intersects(bounds, obstacle))) return null;
  if (
    getDecorInstances(style).some(
      (other) =>
        other.id !== instanceId &&
        intersects(bounds, decorPlacementBox(other.decorId, other.placement)),
    )
  )
    return null;
  return p;
}
export function validateDecorPlacement(
  instanceId: string,
  proposal: DecorPlacement,
  style: PlacementStyle,
): boolean {
  const p = constrainDecorPlacement(instanceId, proposal, style);
  return (
    !!p &&
    p.surface === proposal.surface &&
    ["x", "y", "z", "rotation"].every(
      (key) => Math.abs(p[key as "x"] - proposal[key as "x"]) < 0.0001,
    )
  );
}
export function nudgeDecorPlacement(
  instanceId: string,
  p: DecorPlacement,
  direction: "left" | "right" | "up" | "down",
  style: PlacementStyle,
): DecorPlacement | null {
  const next = { ...p };
  const step = 0.2;
  if (p.surface === "floor" || p.surface === "ceiling") {
    if (direction === "left") next.x -= step;
    if (direction === "right") next.x += step;
    if (direction === "up") next.z -= step;
    if (direction === "down") next.z += step;
  } else {
    if (direction === "up") next.y += step;
    if (direction === "down") next.y -= step;
    if (p.surface === "back-wall") {
      if (direction === "left") next.x -= step;
      if (direction === "right") next.x += step;
    } else {
      const sign = p.surface === "left-wall" ? 1 : -1;
      if (direction === "left") next.z += step * sign;
      if (direction === "right") next.z -= step * sign;
    }
  }
  const direct = constrainDecorPlacement(instanceId, next, style);
  if (direct || validateDecorPlacement(instanceId, p, style)) return direct;
  // Old shops can contain a legacy origin inside a fixture boundary. Give the
  // keyboard controls an escape route without relaxing the placement validator.
  const offsets: { horizontal: number; vertical: number; score: number }[] = [];
  for (let horizontal = -10; horizontal <= 10; horizontal++) {
    for (let vertical = -10; vertical <= 10; vertical++) {
      if (!horizontal && !vertical) continue;
      const along =
        direction === "left"
          ? -horizontal
          : direction === "right"
            ? horizontal
            : direction === "up"
              ? -vertical
              : vertical;
      offsets.push({
        horizontal,
        vertical,
        score: horizontal * horizontal + vertical * vertical + (along < 0 ? 0.5 : 0),
      });
    }
  }
  offsets.sort((a, b) => a.score - b.score);
  for (const offset of offsets) {
    const candidate = { ...next };
    if (p.surface === "floor" || p.surface === "ceiling") {
      candidate.x += offset.horizontal * step;
      candidate.z += offset.vertical * step;
    } else {
      candidate.y -= offset.vertical * step;
      if (p.surface === "back-wall") candidate.x += offset.horizontal * step;
      else candidate.z -= offset.horizontal * step * (p.surface === "left-wall" ? 1 : -1);
    }
    const valid = constrainDecorPlacement(instanceId, candidate, style);
    if (valid) return valid;
  }
  return null;
}
