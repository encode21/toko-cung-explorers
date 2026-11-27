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
import type { Vector3 } from "three";
import {
  approachDistance,
  vehicleDoorPath,
  type ApproachPoint,
  type ClearVehiclePath,
} from "./boarding-path";
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
export const vehicleAccess = new Map<string, (seat: number) => ApproachPoint | null>();
export const vehicleWalkClear = new Map<string, ClearVehiclePath>();
export const renderedVehicles = new Map<string, RidePose>();
/** Driver-side jumps: portal destinations persist until their scene mounts and ticks. */
export const vehicleJumps = new Map<string, RidePose>();
const packets = new Map<string, { pose: RidePose; seq: number; revision: number; at: number }>();
let seq = 0,
  lastPublish = 0;
export function resetVehicles() {
  renderedVehicles.clear();
  renderedVehicleMotion.clear();
  vehicleJumps.clear();
  vehicleAccess.clear();
  vehicleWalkClear.clear();
  vehicleExits.clear();
  cancelVehicleBoarding();
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
type BoardingAction = "vehicle-mount" | "vehicle-accept";
const BOARDING_SPEED = 2.9;
const DOOR_REACH = 0.24;
const DOOR_BLOCKED = "Pintu kendaraan terhalang.";
const DOOR_TOO_FAR = "Dekati kendaraan untuk naik.";
const BOARDING_TIMEOUT = 5.5;

export const useVehicleBoarding = create(() => ({ vehicleId: null as string | null }));

let boarding: {
  id: string;
  action: BoardingAction;
  seat: number;
  path: ApproachPoint[];
  remaining: number;
} | null = null;

export function cancelVehicleBoarding() {
  if (!boarding) return;
  boarding = null;
  useVehicleBoarding.setState({ vehicleId: null });
}

function boardingSeat(vehicle: RideVehicle, action: BoardingAction) {
  if (action === "vehicle-mount")
    return !vehicle.occupants.length && (!vehicle.personal || vehicle.mine) ? 0 : undefined;
  return vehicle.occupants.find(
    (seat) => seat.connectionId === connectionId && seat.status === "pending" && seat.seat > 0,
  )?.seat;
}

function boardingAvailable() {
  const state = useMobility.getState();
  return (
    mobilityAvailable() &&
    !gameUiBlocked() &&
    useGame.getState().overlay === "none" &&
    !document.hidden &&
    !ownVehicle() &&
    !state.flying &&
    !state.vehicleLeaving &&
    !state.carries.some((pair) => pair.carrier === connectionId || pair.passenger === connectionId)
  );
}

export async function boardVehicle(vehicle: RideVehicle, action: BoardingAction) {
  if (boarding || useMobility.getState().busy || !boardingAvailable()) return;
  const seat = boardingSeat(vehicle, action);
  if (seat === undefined || vehicleTransitioning(vehicle)) return;
  const pose = renderedVehicles.get(vehicle.id) ?? vehicle.pose;
  if (Math.abs(pose.speed) >= 0.8) {
    useGame.getState().setToast("Tunggu kendaraan berhenti.");
    return;
  }
  const game = useGame.getState();
  const from = game.playerPos;
  if (
    (pose.gang ?? null) !== useGang.getState().inside ||
    Math.hypot(pose.x - from[0], pose.y - from[1], pose.z - from[2]) > 4
  ) {
    game.setToast(DOOR_TOO_FAR);
    return;
  }
  const door = vehicleAccess.get(vehicle.id)?.(seat);
  const clear = vehicleWalkClear.get(vehicle.id);
  const path =
    door && clear
      ? vehicleDoorPath(from, door, pose, VEHICLE_DEFINITIONS[vehicle.model].collision.half, clear)
      : null;
  if (!door || !path) {
    game.setToast(DOOR_BLOCKED);
    return;
  }
  // Preserve the normal close-range boarding animation when the seat door is already in reach.
  if (path.length === 1 && approachDistance(from, door) <= 2) {
    await mobilityCommand(action, { vehicleId: vehicle.id, vehicleAccess: door });
    return;
  }
  boarding = { id: vehicle.id, action, seat, path, remaining: BOARDING_TIMEOUT };
  useVehicleBoarding.setState({ vehicleId: vehicle.id });
}

/** Runs through the player's ordinary movement so the capsule and walk animation stay active. */
export function vehicleBoardingWalkSpeed(
  position: { x: number; y: number; z: number },
  delta: number,
  direction: Vector3,
  canMove: boolean,
  interrupted: boolean,
) {
  if (!boarding) return 0;
  if (interrupted || !boardingAvailable()) {
    cancelVehicleBoarding();
    return 0;
  }
  const { id, action, seat, path } = boarding;
  const vehicle = useMobility.getState().vehicles?.find((v) => v.id === id);
  const pose = vehicle && (renderedVehicles.get(id) ?? vehicle.pose);
  if (
    !vehicle ||
    !pose ||
    (pose.gang ?? null) !== useGang.getState().inside ||
    Math.abs(pose.speed) >= 0.8 ||
    vehicleTransitioning(vehicle) ||
    boardingSeat(vehicle, action) !== seat
  ) {
    cancelVehicleBoarding();
    return 0;
  }

  boarding.remaining -= delta;
  const door = vehicleAccess.get(id)?.(seat);
  const clear = vehicleWalkClear.get(id);
  if (!door || !clear || boarding.remaining <= 0) {
    cancelVehicleBoarding();
    useGame.getState().setToast(DOOR_BLOCKED);
    return 0;
  }
  if (!canMove) return 0;
  const from: ApproachPoint = [position.x, position.y, position.z];
  const finalPoint = path[path.length - 1]!;
  if (approachDistance(door, finalPoint) > DOOR_REACH) {
    const next = vehicleDoorPath(
      from,
      door,
      pose,
      VEHICLE_DEFINITIONS[vehicle.model].collision.half,
      clear,
    );
    if (!next) {
      cancelVehicleBoarding();
      useGame.getState().setToast(DOOR_BLOCKED);
      return 0;
    }
    boarding.path = next;
  }
  const points = boarding.path;
  while (points.length > 1 && approachDistance(from, points[0]!) <= DOOR_REACH) points.shift();
  const goal = points.length === 1 ? door : points[0]!;
  const distance = approachDistance(from, goal);
  if (points.length === 1 && distance <= DOOR_REACH) {
    if (useMobility.getState().busy) return 0;
    const game = useGame.getState();
    const yaw = Math.atan2(pose.x - position.x, pose.z - position.z);
    game.setPlayerPos(from, game.inside, yaw);
    cancelVehicleBoarding();
    void mobilityCommand(action, { vehicleId: id, vehicleAccess: door });
    return 0;
  }
  direction.set(goal[0] - position.x, 0, goal[2] - position.z);
  return Math.min(BOARDING_SPEED, distance / Math.max(1 / 60, delta));
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
