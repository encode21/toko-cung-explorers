import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import type { BarkRole } from "@/game/npc/barks";

export type GangResident = {
  id: string;
  avatar: string;
  scale: number;
  from: [number, number];
  to: [number, number];
  speed: number;
  pause: number;
  offset: number;
  yaw: number;
  activity: AvatarAnimation;
  walk: AvatarAnimation;
  basket?: boolean;
  /** Bark pool for ambient lines; defaults to "warga". */
  bark?: BarkRole;
};
export type GangAmbient = {
  mobile_limit: number;
  desktop_limit: number;
  render_distance: number;
  residents: GangResident[];
};

/** Local scenery only: existing avatar clips, no economy, AI requests or network actors. */
export function residentPose(r: GangResident, seconds: number) {
  const dx = r.to[0] - r.from[0],
    dz = r.to[1] - r.from[1];
  const distance = Math.hypot(dx, dz);
  if (!distance || !r.speed) return { x: r.from[0], z: r.from[1], yaw: r.yaw, moving: false };
  const travel = distance / r.speed,
    leg = travel + r.pause;
  const phase = (seconds + r.offset) % (leg * 2);
  const reverse = phase >= leg;
  const progress = Math.min(1, (phase % leg) / travel);
  const t = reverse ? 1 - progress : progress;
  return {
    x: r.from[0] + dx * t,
    z: r.from[1] + dz * t,
    yaw: Math.atan2(dx, dz) + (reverse ? Math.PI : 0),
    moving: phase % leg < travel,
  };
}

/** Per-resident route time: a conversation pauses the route as well as the rendered body. */
export function advanceResidentTimes(
  times: Map<string, number>,
  residents: GangResident[],
  dt: number,
  talking: string | null,
  initialTime: number,
) {
  for (const r of residents) {
    const previous = times.get(r.id) ?? initialTime;
    times.set(r.id, previous + (talking === `gang-${r.id}` ? 0 : dt));
  }
}

export function nearbyResidents(
  a: GangAmbient,
  x: number,
  z: number,
  seconds: number,
  low: boolean,
  times?: ReadonlyMap<string, number>,
) {
  return a.residents
    .map((resident) => {
      const p = residentPose(resident, times?.get(resident.id) ?? seconds);
      return { resident, distance: Math.hypot(p.x - x, p.z - z) };
    })
    .filter((r) => r.distance < a.render_distance)
    .sort((a, b) => a.distance - b.distance || a.resident.id.localeCompare(b.resident.id))
    .slice(0, low ? a.mobile_limit : a.desktop_limit)
    .map((r) => r.resident.id)
    .sort();
}
