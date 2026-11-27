import { followVehicleGang, useGang } from "@/game/gang/store";
import { useTruckRoom } from "../missions/truck-state";
import { VEHICLE_DEFINITIONS } from "./definitions";
import { create } from "zustand";
import { useMobility, mobilityCommand, mobilityAvailable } from "@/game/mobility/store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { gameUiBlocked } from "@/state/game-ui-store";
import { confirmLeaveOjek } from "@/game/ojek/store";
import { getActiveChannel } from "@/net/useWorldChannel";
import { playHornSfx, playImpactSfx } from "@/game/audio/sfx";
import { distanceGain } from "@/game/audio/world-acoustics";
import {
  bikeModel,
  vehicleFor,
  vehicleTransitioning,
  type RidePose,
  type RideVehicle,
} from "./model";

export const useVehicleInput = create(() => ({
  throttle: 0,
  steer: 0,
  brake: false,
  boundaryWarning: false,
  boostVehicleId: null as string | null,
  boostUntil: 0,
  boostReadyAt: 0,
}));
const NOS_DURATION_MS = 2200;
const NOS_RECHARGE_MS = 4000;

export function activateVehicleBoost(vehicle: RideVehicle) {
  const current = ownVehicle();
  if (
    current?.id !== vehicle.id ||
    vehicleTransitioning(current) ||
    !current.occupants.some((seat) => seat.seat === 0 && seat.connectionId === connectionId) ||
    !useChannels.getState().playing ||
    gameUiBlocked() ||
    useGame.getState().overlay !== "none" ||
    document.hidden
  )
    return;

  const now = performance.now();
  const input = useVehicleInput.getState();
  if (now < input.boostReadyAt || input.brake) return;
  const boostUntil = now + NOS_DURATION_MS;
  useVehicleInput.setState({
    boostVehicleId: current.id,
    boostUntil,
    boostReadyAt: boostUntil + NOS_RECHARGE_MS,
  });
}

/** Cancel the current burst while preserving the recharge after braking or dismounting. */
export function cancelVehicleBoost() {
  useVehicleInput.setState({ boostVehicleId: null, boostUntil: 0 });
}

/** Smoothed speed (m/s) of the ride the local player is in; written by Player each frame for the speedometer. */
export const rideTelemetry = { speed: 0 };
const HORN_RANGE = 40;
let lastHornAt = 0;
let lastHeardHornAt = 0;
/** Local horn plus a broadcast so nearby players hear it. */
export function honk(v: RideVehicle) {
  const now = performance.now();
  if (now - lastHornAt < 450) return;
  lastHornAt = now;
  const p = renderedVehicles.get(v.id) ?? v.pose;
  const bike = bikeModel(v.model);
  playHornSfx(bike);
  void getActiveChannel()?.send({
    type: "broadcast",
    event: "horn",
    payload: { x: p.x, z: p.z, bike, room: useChannels.getState().lease?.channel },
  });
}
export function handleHorn(raw: unknown) {
  const h = raw as { x?: unknown; z?: unknown; bike?: unknown; room?: unknown } | null;
  if (typeof h?.x !== "number" || typeof h.z !== "number") return;
  if (h.room !== useChannels.getState().lease?.channel) return;
  // Shared throttle: a spamming peer cannot stack horns.
  const now = performance.now();
  if (now - lastHeardHornAt < 300) return;
  const [x, , z] = useGame.getState().playerPos;
  const level = distanceGain(Math.hypot(h.x - x, h.z - z), HORN_RANGE);
  if (level <= 0.01) return;
  lastHeardHornAt = now;
  playHornSfx(h.bike === true, level);
}
const THROW_SPEED = 7; // m/s (~25 km/j of the 36 km/j top): a crash this hard throws a pillion rider off
let crashThrow: { vx: number; vz: number; at: number } | null = null;
/** Driver side: the ride hit something solid at `speed` m/s. */
export function rideCrash(v: RideVehicle, p: RidePose, speed: number) {
  void playImpactSfx("car", Math.min(1, speed / 8));
  if (speed < THROW_SPEED || !bikeModel(v.model) || v.occupants.length < 2) return;
  const dir = Math.sign(p.speed) || 1;
  void getActiveChannel()?.send({
    type: "broadcast",
    event: "vehicle_crash",
    payload: {
      id: v.id,
      room: useChannels.getState().lease?.channel,
      vx: Math.sin(p.yaw) * speed * dir,
      vz: Math.cos(p.yaw) * speed * dir,
    },
  });
}
/** Passenger side: thrown off this ride; Player applies the fall once the seat is left. */
export function handleVehicleCrash(raw: unknown) {
  const c = raw as { id?: unknown; room?: unknown; vx?: unknown; vz?: unknown } | null;
  if (typeof c?.vx !== "number" || typeof c.vz !== "number" || !Number.isFinite(c.vx + c.vz))
    return;
  if (c.room !== useChannels.getState().lease?.channel) return;
  const v = ownVehicle();
  const seat = v?.occupants.find((s) => s.connectionId === connectionId);
  if (!v || v.id !== c.id || !seat || seat.seat === 0) return;
  const clamp = (n: number) => Math.max(-12, Math.min(12, n));
  crashThrow = { vx: clamp(c.vx), vz: clamp(c.vz), at: performance.now() };
  void leaveVehicle();
}
export function takeCrashThrow() {
  const t = crashThrow;
  crashThrow = null;
  return t && performance.now() - t.at < 5000 ? t : null;
}
export const vehicleExits = new Map<string, () => [number, number, number] | null>();
export const renderedVehicleMotion = new Map<
  string,
  { lift: number; roll: number; steer: number }
>();
export const vehicleAccess = new Map<
  string,
  (seat: number, approach?: [number, number, number]) => [number, number, number] | null
>();
export const renderedVehicles = new Map<string, RidePose>();
/** Driver-side jumps (Gerbang Kampung): applied by the local ride on its next frame. */
export const vehicleJumps = new Map<string, RidePose>();
const packets = new Map<string, { pose: RidePose; seq: number; revision: number; at: number }>();
let seq = 0,
  lastPublish = 0;
export function resetVehicles() {
  renderedVehicles.clear();
  renderedVehicleMotion.clear();
  vehicleJumps.clear();
  vehicleAccess.clear();
  vehicleExits.clear();
  packets.clear();
  seq = 0;
  lastPublish = 0;
  useVehicleInput.setState({
    throttle: 0,
    steer: 0,
    brake: false,
    boundaryWarning: false,
    boostVehicleId: null,
    boostUntil: 0,
    boostReadyAt: 0,
  });
}
export function ownVehicle() {
  if (useMobility.getState().vehicleLeaving) return undefined;
  return vehicleFor(useMobility.getState().vehicles ?? [], connectionId);
}
export function vehicleHeartbeat() {
  const v = ownVehicle();
  return v?.occupants.some((s) => s.seat === 0 && s.connectionId === connectionId)
    ? renderedVehicles.get(v.id)
    : undefined;
}
export function handleVehiclePose(raw: unknown) {
  if (!raw || typeof raw !== "object") return;
  const p = raw as {
    id: string;
    room: string;
    revision: number;
    driver: string;
    seq: number;
    pose: RidePose;
  };
  const v = (useMobility.getState().vehicles ?? []).find((v) => v.id === p.id);
  if (
    !v ||
    vehicleTransitioning(v) ||
    p.room !== useChannels.getState().lease?.channel ||
    p.revision !== v.revision ||
    !v.occupants.some(
      (s) => s.seat === 0 && s.connectionId === p.driver && s.status === "active",
    ) ||
    p.driver === connectionId ||
    !Number.isSafeInteger(p.seq) ||
    p.seq < 0 ||
    !p.pose
  )
    return;
  const pose = p.pose as RidePose;
  if (
    ![pose.x, pose.y, pose.z, pose.yaw, pose.speed].every(Number.isFinite) ||
    // Same bounds as the server: rides driven into the gang scene sit at x≈6000.
    Math.abs(pose.x) > 10000 ||
    Math.abs(pose.z) > 10000 ||
    pose.y < -4 ||
    pose.y > 20 ||
    Math.abs(pose.yaw) > Math.PI ||
    Math.abs(pose.speed) > 12 ||
    (pose.gang != null && (!Number.isSafeInteger(pose.gang) || pose.gang === 0))
  )
    return;
  const old = packets.get(v.id);
  if (old?.revision === v.revision && old.seq >= p.seq) return;
  packets.set(v.id, { pose: { ...pose }, seq: p.seq, revision: v.revision, at: performance.now() });
  void followVehicleGang(v, pose);
}
export function remoteVehiclePose(v: RideVehicle): RidePose {
  if (vehicleTransitioning(v)) return { ...v.pose, speed: 0 };
  const packet = packets.get(v.id);
  if (!packet || packet.revision !== v.revision) return v.pose;
  const age = (performance.now() - packet.at) / 1000;
  const t = Math.min(age, 0.2);
  return {
    ...packet.pose,
    x: packet.pose.x + Math.sin(packet.pose.yaw) * packet.pose.speed * t,
    z: packet.pose.z + Math.cos(packet.pose.yaw) * packet.pose.speed * t,
    speed: age > 1 ? 0 : packet.pose.speed,
  };
}
export function publishVehiclePose(v: RideVehicle, pose: RidePose) {
  if (performance.now() - lastPublish < 100) return;
  const channel = getActiveChannel();
  if (!channel) return;
  lastPublish = performance.now();
  void channel.send({
    type: "broadcast",
    event: "vehicle_pose",
    payload: {
      id: v.id,
      driver: connectionId,
      room: useChannels.getState().lease?.channel,
      revision: v.revision,
      seq: (seq = Math.max(seq + 1, Date.now())),
      pose,
    },
  });
}
export async function leaveVehicle() {
  const v = ownVehicle();
  if (!v || vehicleTransitioning(v)) return;
  const seat = v.occupants.find((s) => s.connectionId === connectionId)!;
  const access = vehicleAccess.get(v.id)?.(seat.seat);
  if (!access) {
    useGame.getState().setToast("Pintu terhalang. Geser kendaraan ke tempat yang lapang.");
    return;
  }
  useVehicleInput.setState({
    boostVehicleId: null,
    boostUntil: 0,
    throttle: 0,
    steer: 0,
    brake: true,
  });
  const exits: Record<number, [number, number, number]> = {};
  for (const other of v.occupants.filter(
    (s) => s.status === "active" && (seat.seat === 0 || s.seat === seat.seat),
  )) {
    const point = vehicleAccess.get(v.id)?.(other.seat);
    if (!point) {
      useGame.getState().setToast("Pintu penumpang terhalang. Cari tempat yang lapang.");
      return;
    }
    exits[other.seat] = point;
  }
  await mobilityCommand("vehicle-leave", { vehicleAccess: access, vehicleExits: exits });
}
export async function boardVehicle(v: RideVehicle, action: "vehicle-mount" | "vehicle-accept") {
  const seat =
    action === "vehicle-mount" ? 0 : v.occupants.find((s) => s.connectionId === connectionId)?.seat;
  if (seat === undefined) return;
  const access = vehicleAccess.get(v.id)?.(seat, useGame.getState().playerPos);
  if (!access) {
    useGame.getState().setToast("Pintu terhalang. Dekati sisi pintu yang kosong.");
    return;
  }
  const p = useGame.getState().playerPos;
  if (Math.hypot(p[0] - access[0], p[2] - access[2]) > 2) {
    useGame.getState().setToast("Dekati sisi pintu kursimu untuk naik.");
    return;
  }
  await mobilityCommand(action, { vehicleId: v.id, vehicleAccess: access });
}
export function nearestParkedVehicle() {
  const state = useMobility.getState();
  if (
    !mobilityAvailable() ||
    ownVehicle() ||
    state.flying ||
    state.vehicleLeaving ||
    state.carries.some((p) => p.carrier === connectionId || p.passenger === connectionId)
  )
    return undefined;
  const p = useGame.getState().playerPos;
  return (useMobility.getState().vehicles ?? [])
    .filter(
      (v) =>
        !v.occupants.length &&
        (!v.personal || v.mine) &&
        (v.pose.gang ?? null) === useGang.getState().inside,
    )
    .map((v) => ({ v, d: Math.hypot(v.pose.x - p[0], v.pose.y - p[1], v.pose.z - p[2]) }))
    .filter((v) => v.d < 4)
    .sort((a, b) => a.d - b.d)[0]?.v;
}
export function vehicleContextAction(): boolean {
  if (ownVehicle()) {
    if (confirmLeaveOjek()) void leaveVehicle();
    return true;
  }
  const v = nearestParkedVehicle();
  if (!v) return false;
  void boardVehicle(v, "vehicle-mount");
  return true;
}

export function driverSeat(id?: string) {
  if (!id) return undefined;
  if (useTruckRoom.getState().mission?.truck?.driver === id)
    return VEHICLE_DEFINITIONS.truck.seats[0];
  const v = vehicleFor(useMobility.getState().vehicles ?? [], id);
  return v?.occupants.some((s) => s.connectionId === id && s.seat === 0)
    ? VEHICLE_DEFINITIONS[v.model].seats[0]
    : undefined;
}

export function cancelVehicle() {
  useMobility.setState({ vehicleLeaving: true });
  useVehicleInput.setState({
    throttle: 0,
    steer: 0,
    brake: true,
    boostVehicleId: null,
    boostUntil: 0,
  });
  void mobilityCommand("read", { available: false });
}
