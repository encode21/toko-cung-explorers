import { useTruckRoom } from "../missions/truck-state";
import { VEHICLE_DEFINITIONS } from "./definitions";
import { create } from "zustand";
import { useMobility, mobilityCommand, mobilityAvailable } from "@/game/mobility/store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { getActiveChannel } from "@/net/useWorldChannel";
import { vehicleFor, vehicleTransitioning, type RidePose, type RideVehicle } from "./model";

export const useVehicleInput = create(() => ({
  throttle: 0,
  steer: 0,
  brake: false,
  gasHeld: false,
  brakeHeld: false,
}));
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
const packets = new Map<string, { pose: RidePose; seq: number; revision: number; at: number }>();
let seq = 0,
  lastPublish = 0;
export function resetVehicles() {
  renderedVehicles.clear();
  renderedVehicleMotion.clear();
  vehicleAccess.clear();
  vehicleExits.clear();
  packets.clear();
  seq = 0;
  lastPublish = 0;
  useVehicleInput.setState({
    throttle: 0,
    steer: 0,
    brake: false,
    gasHeld: false,
    brakeHeld: false,
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
    Math.abs(pose.x) > 220 ||
    Math.abs(pose.z) > 220 ||
    pose.y < -4 ||
    pose.y > 20 ||
    Math.abs(pose.yaw) > Math.PI ||
    Math.abs(pose.speed) > 12
  )
    return;
  const old = packets.get(v.id);
  if (old?.revision === v.revision && old.seq >= p.seq) return;
  packets.set(v.id, { pose: { ...pose }, seq: p.seq, revision: v.revision, at: performance.now() });
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
    gasHeld: false,
    brakeHeld: false,
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
    .filter((v) => !v.occupants.length)
    .map((v) => ({ v, d: Math.hypot(v.pose.x - p[0], v.pose.y - p[1], v.pose.z - p[2]) }))
    .filter((v) => v.d < 4)
    .sort((a, b) => a.d - b.d)[0]?.v;
}
export function vehicleContextAction(): boolean {
  if (ownVehicle()) {
    void leaveVehicle();
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
    gasHeld: false,
    brakeHeld: false,
  });
  void mobilityCommand("read", { available: false });
}
