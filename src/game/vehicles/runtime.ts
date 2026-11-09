import { create } from "zustand";
import { useMobility, mobilityCommand, mobilityAvailable } from "@/game/mobility/store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { getActiveChannel } from "@/net/useWorldChannel";
import { vehicleFor, type RidePose, type RideVehicle } from "./model";

export const useVehicleInput = create(() => ({
  throttle: 0,
  steer: 0,
  brake: false,
  gasHeld: false,
  brakeHeld: false,
}));
export const vehicleExits = new Map<string, () => [number, number, number] | null>();
export const renderedVehicles = new Map<string, RidePose>();
const packets = new Map<string, { pose: RidePose; seq: number; revision: number; at: number }>();
let seq = 0,
  lastPublish = 0;
export function resetVehicles() {
  renderedVehicles.clear();
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
  useMobility.setState({ vehicleLeaving: true });
  await mobilityCommand("vehicle-leave");
  useVehicleInput.setState({
    gasHeld: false,
    brakeHeld: false,
    throttle: 0,
    steer: 0,
    brake: true,
  });
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
  void mobilityCommand("vehicle-mount", { vehicleId: v.id });
  return true;
}
