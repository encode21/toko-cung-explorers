import { create } from "zustand";
export const useChannels = create(() => ({
  lease: null,
  playing: false,
  sceneReady: false,
  busy: false,
}));
export async function renewChannel() {}
export async function leaveChannel() {
  useChannels.setState({ lease: null, playing: false, sceneReady: false });
}
export async function joinChannel() {
  useChannels.setState({ lease: { channel: "CHANNEL-01" }, playing: true, sceneReady: true });
}
