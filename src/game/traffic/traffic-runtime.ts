import type { Point } from "../world/outdoor-layout";
import { vehicleOverlaps, type VehicleKind, type VehiclePose } from "./traffic-math";
import { playBrakeSfx, playImpactSfx } from "@/game/audio/sfx";

export interface TrafficActor {
  position: () => Point | null;
  hit: (vehicle: VehiclePose, now: number) => boolean;
}
export const trafficActors = new Map<string, TrafficActor>();
export const trafficVehicles = new Map<string, VehiclePose>();
export const vehicleBlocks = (p: Point) =>
  [...trafficVehicles.values()].some((v) => vehicleOverlaps(p, v, 0.6));

export type TrafficAudioEvent = "brake" | "impact" | "engine";
export type TrafficAudioMeta = { kind?: VehicleKind };

/** Adapter SFX — impact/brake via Web Audio setelah gesture unlock. */
export const trafficAudio = {
  emit(event: TrafficAudioEvent, _p: Point, meta?: TrafficAudioMeta) {
    if (event === "impact") void playImpactSfx(meta?.kind === "truck" ? "truck" : "car");
    else if (event === "brake") void playBrakeSfx();
  },
};
