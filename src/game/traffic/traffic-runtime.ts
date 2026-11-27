import { useGame } from "@/state/game-store";
import { distanceGain } from "@/game/audio/world-acoustics";
import type { Point } from "../world/outdoor-layout";
import {
  atTrafficHeight,
  type TrafficPoint,
  vehicleOverlaps,
  vehicleSweepOverlaps,
  vehiclesOverlap,
  type VehicleKind,
  type VehiclePose,
} from "./traffic-math";
import { playBrakeSfx, playImpactSfx } from "@/game/audio/sfx";

export interface TrafficActor {
  solid?: boolean;
  position: () => TrafficPoint | null;
  hit: (vehicle: VehiclePose, now: number) => boolean;
}
export const trafficActors = new Map<string, TrafficActor>();
export const trafficVehicles = new Map<string, VehiclePose>();
/** Reserve a scheduled scene before it starts; vehicles already inside can leave. */
export const incidentTrafficZones = new Map<string, VehiclePose>();
/** Kinematic traffic must stop explicitly; two kinematic bodies do not resolve each other's motion. */
export function solidTrafficBlocked(from: VehiclePose, to: VehiclePose, excludeId?: string) {
  for (const zone of incidentTrafficZones.values())
    if (!vehiclesOverlap(from, zone) && vehicleSweepOverlaps(from, to, zone)) return true;
  for (const [id, vehicle] of trafficVehicles)
    if (id !== excludeId && vehicleSweepOverlaps(from, to, vehicle)) return true;
  for (const actor of trafficActors.values()) {
    const p = actor.solid && actor.position();
    if (
      p &&
      atTrafficHeight(p) &&
      vehicleSweepOverlaps(from, to, {
        ...p,
        dx: 0,
        dz: 1,
        speed: 0,
        halfWidth: 0.34,
        halfLength: 0.34,
      })
    )
      return true;
  }
  return false;
}
/** Ambient NPCs a player-driven vehicle can knock over; returns false when it cannot react now. */
export const npcKnocks = new Map<string, (vx: number, vz: number) => boolean>();
export const vehicleBlocks = (p: TrafficPoint) =>
  [...trafficVehicles.values()].some((v) => vehicleOverlaps(p, v, 0.6));

export type TrafficAudioEvent = "brake" | "impact" | "engine";
export type TrafficAudioMeta = { kind?: VehicleKind };

/** Adapter SFX — impact/brake via Web Audio setelah gesture unlock. */
export const trafficAudio = {
  emit(event: TrafficAudioEvent, p: Point, meta?: TrafficAudioMeta) {
    const [x, , z] = useGame.getState().playerPos;
    const level = distanceGain(Math.hypot(p.x - x, p.z - z), 24);
    if (level <= 0) return;
    if (event === "impact") void playImpactSfx(meta?.kind === "truck" ? "truck" : "car", level);
    else if (event === "brake") void playBrakeSfx(level);
  },
};
