export const FLOOD_VISIBLE_AT = 0.02;

type FloodZone = {
  origin: [number, number, number];
  width: number;
  from: number;
  to: number;
};

let activeZone: FloodZone | null = null;

/** Contacts follow the flood mesh of the currently mounted Kampung. */
export function mountFloodZone(zone: FloodZone) {
  activeZone = zone;
  return () => {
    if (activeZone === zone) activeZone = null;
  };
}

export function floodWaterY(flood: number) {
  return 0.045 + 0.47 * Math.min(1, Math.max(0, flood));
}

export function floodSurfaceAtLocal(
  x: number,
  z: number,
  width: number,
  from: number,
  to: number,
  flood: number,
) {
  // Leave out the dry bridges and the feathered edge of the water mesh.
  const edge = Math.min(width / 2 - Math.abs(x), z - from, to - z);
  return flood > FLOOD_VISIBLE_AT && edge > 0.35 ? floodWaterY(flood) : null;
}

export function floodSurfaceAt(x: number, z: number, flood: number) {
  if (!activeZone) return null;
  const { origin, width, from, to } = activeZone;
  const local = floodSurfaceAtLocal(x - origin[0], z - origin[2], width, from, to, flood);
  return local === null ? null : local + origin[1];
}
