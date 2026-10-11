import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import type { ChannelLease, WorldChannel } from "@/services/world/contracts";
import { realtime } from "./realtime";
import { useNet } from "./net-store";
export const connectionId = createId();
interface ChannelState {
  channels: WorldChannel[];
  lease: ChannelLease | null;
  busy: boolean;
  listing: boolean;
  playing: boolean;
  sceneReady: boolean;
  error: string;
}
export const useChannels = create<ChannelState>(() => ({
  channels: [],
  lease: null,
  busy: false,
  listing: false,
  playing: false,
  sceneReady: false,
  error: "",
}));
let generation = 0;
/** Invalidate an in-flight renewal before an authority-directed room handoff. */
export function beginChannelHandoff() {
  generation++;
  useChannels.setState({ busy: true, error: "" });
}
export function endChannelHandoff() {
  useChannels.setState({ busy: false });
}
export async function listChannels() {
  if (useChannels.getState().listing) return;
  const ticket = generation;
  useChannels.setState({ listing: true });
  try {
    const channels = await worldRequest<WorldChannel[]>("channels");
    if (ticket === generation) useChannels.setState({ channels });
  } catch (e) {
    if (ticket === generation)
      useChannels.setState({ error: e instanceof Error ? e.message : "Channel tidak tersedia." });
  } finally {
    if (ticket === generation) useChannels.setState({ listing: false });
  }
}
export async function joinChannel(channel: string) {
  if (useChannels.getState().busy) return;
  const ticket = ++generation;
  useChannels.setState({ busy: true, playing: false, listing: false, error: "" });
  useNet.setState({ connected: false, connectionError: "" });
  try {
    const lease = await worldRequest<ChannelLease>("join", { channel, connectionId });
    if (ticket !== generation) return;
    // Stop the old room before changing this connection's realtime authorization.
    useChannels.setState({ lease: null });
    await realtime.removeAllChannels();
    await realtime.realtime.setAuth(lease.realtimeToken);
    if (ticket !== generation) return;
    useNet.getState().setRoom(channel);
    useChannels.setState({ lease });
  } catch (e) {
    if (ticket === generation)
      useChannels.setState({
        lease: null,
        error: e instanceof Error ? e.message : "Gagal masuk channel.",
      });
  } finally {
    if (ticket === generation) useChannels.setState({ busy: false });
  }
}
export async function renewChannel() {
  const current = useChannels.getState().lease;
  if (!current || useChannels.getState().busy) return;
  const ticket = generation;
  try {
    const lease = await worldRequest<ChannelLease>("join", {
      channel: current.channel,
      connectionId,
    });
    if (ticket !== generation) return;
    await realtime.realtime.setAuth(lease.realtimeToken);
    useChannels.setState({ lease, error: "" });
  } catch (e) {
    if (ticket !== generation) return;
    useChannels.setState({ error: e instanceof Error ? e.message : "Koneksi channel terputus." });
    if (Date.now() >= Date.parse(current.expiresAt)) await leaveChannel();
  }
}
export async function leaveChannel() {
  generation++;
  useChannels.setState({
    lease: null,
    busy: false,
    playing: false,
    sceneReady: false,
    listing: false,
  });
  useNet.setState({ connected: false, connectionError: "" });
  await realtime.removeAllChannels();
  try {
    await worldRequest("leave", { connectionId });
  } catch {
    /* Lease expires automatically. */
  }
}
export function clearChannels() {
  generation++;
  useChannels.setState({
    lease: null,
    channels: [],
    busy: false,
    playing: false,
    sceneReady: false,
    listing: false,
    error: "",
  });
  void realtime.removeAllChannels();
}
if (typeof window !== "undefined") window.addEventListener("world-account-cleared", clearChannels);
