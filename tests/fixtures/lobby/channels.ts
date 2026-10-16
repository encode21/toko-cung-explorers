import { create } from "zustand";

type Channel = { id: string; occupied: number; capacity: number };

export const useChannels = create(() => ({
  channels: [
    { id: "CHANNEL-01", occupied: 1, capacity: 25 },
    { id: "CHANNEL-02", occupied: 0, capacity: 25 },
    { id: "CHANNEL-03", occupied: 0, capacity: 25 },
  ] as Channel[],
  lease: null as { channel: string } | null,
  playing: false,
  sceneReady: false,
  busy: false,
  listing: false,
  error: "",
}));

export async function listChannels() {
  useChannels.setState({ listing: false, error: "" });
}

export async function joinChannel(id: string) {
  useChannels.setState({ lease: { channel: id }, busy: false });
}

export async function renewChannel() {}
export async function leaveChannel() {
  useChannels.setState({ lease: null, playing: false, sceneReady: false });
}
