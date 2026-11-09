import { remoteStates } from "../../../src/net/useWorldChannel";
import { connectionId } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { handleVehiclePose } from "@/game/vehicles/runtime";
import { avatarFromSeed } from "@/identity/avatar";
export * from "../../../src/net/useWorldChannel";
export const bus = new BroadcastChannel("world-vehicles-qa");
bus.onmessage = ({ data }) => {
  if (data.event === "vehicle_pose") handleVehiclePose(data.payload);
  if (data.event === "state" && data.payload.id !== connectionId) {
    remoteStates.set(data.payload.id, data.payload);
    useNet.setState(s => ({ roster: [...s.roster.filter(r => r.id !== data.payload.id), {
      id: data.payload.id, name: data.payload.name, joinedAt: data.payload.joinedAt,
      avatar: avatarFromSeed(data.payload.id), available: true,
    }] }));
  }
};
export const getActiveChannel = () => useNet.getState().connected ? {
  send: async (message: unknown) => { bus.postMessage(message); return "ok"; },
} : null;
