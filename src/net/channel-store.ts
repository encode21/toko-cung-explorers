import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import type { ChannelLease, WorldChannel } from "@/services/world/contracts";
import { realtime } from "./realtime";
import { useNet } from "./net-store";
/** Ephemeral per-tab transport id — rotate on logout so the next account is not blocked. */
export let connectionId = createId();
export function rotateConnectionId() {
  connectionId = createId();
  return connectionId;
}
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
  useChannels.setState({ busy: true, listing: false, error: "" });
}
export function endChannelHandoff() {
  useChannels.setState({ busy: false });
}
export async function listChannels() {
  if (useChannels.getState().listing) return;
  useChannels.setState({ listing: true, error: "" });
  try {
    const channels = await worldRequest<WorldChannel[]>("channels");
    // Always apply + clear listing. Join/handoff bumps `generation` and used to
    // abort this finally — leaving listing=true and the lobby stuck forever.
    useChannels.setState({ channels });
  } catch (e) {
    useChannels.setState({
      error: e instanceof Error ? e.message : "Channel tidak tersedia.",
    });
  } finally {
    useChannels.setState({ listing: false });
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
let renewal: { generation: number; task: Promise<boolean> } | null = null;
export function renewChannel(): Promise<boolean> {
  const current = useChannels.getState().lease;
  if (!current || useChannels.getState().busy) return Promise.resolve(false);
  const ticket = generation;
  if (renewal?.generation === ticket) return renewal.task;
  const task = refreshChannel(current, ticket);
  renewal = { generation: ticket, task };
  const clear = () => {
    if (renewal?.task === task) renewal = null;
  };
  void task.then(clear, clear);
  return task;
}
async function refreshChannel(current: ChannelLease, ticket: number): Promise<boolean> {
  try {
    const lease = await worldRequest<ChannelLease>("join", {
      channel: current.channel,
      connectionId,
    });
    if (ticket !== generation) return false;
    await realtime.realtime.setAuth(lease.realtimeToken);
    if (ticket !== generation) return false;
    useChannels.setState({ lease, error: "" });
    return true;
  } catch (e) {
    if (ticket !== generation) return false;
    useChannels.setState({ error: e instanceof Error ? e.message : "Koneksi channel terputus." });
    if (Date.now() >= Date.parse(current.expiresAt)) await leaveChannel();
    return false;
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
  rotateConnectionId();
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
