import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, RemoteState } from "@/net/net-store";
import { useNet } from "@/net/net-store";
import type { PlayerProfile } from "@/identity/profile-store";
import { handleSocialAction, queueSocialHit, type SocialAction } from "@/game/social/social-actions";
import { handleTrafficSnap, type TrafficSnap } from "@/game/traffic/traffic-sync";
import type { VehicleKind } from "@/game/traffic/traffic-math";

/** Id unik per tab/klien. */
export const playerId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let activeChannel: RealtimeChannel | null = null;
let activeRoom: string | null = null;
/** Posisi terakhir setiap pemain lain, dibaca oleh renderer 3D. */
export const remoteStates = new Map<string, RemoteState>();

export const getActiveChannel = () => activeChannel;

/**
 * Satu channel realtime per ruangan, dibuat sekali per sesi halaman: posisi
 * pemain (broadcast), roster (presence), dan chat. Channel disimpan di module
 * scope supaya remount komponen 3D tidak memutus koneksi.
 */
function presencePayload(name: string, profile?: PlayerProfile | null) {
  return {
    name,
    role: profile?.role ?? "pengunjung",
    avatar: profile?.avatar,
    character: profile?.equippedCharacter ?? null,
  };
}

function joinRoom(room: string, name: string, profile?: PlayerProfile | null) {
  if (activeChannel && activeRoom === room) return activeChannel;
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channel = supabase.channel(`world:${room}`, {
    config: { broadcast: { self: false }, presence: { key: playerId } },
  });

  channel
    .on("broadcast", { event: "state" }, ({ payload }) => {
      const s = payload as RemoteState;
      if (s.id !== playerId) remoteStates.set(s.id, s);
    })
    .on("broadcast", { event: "chat" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      if (msg.from !== playerId) useNet.getState().pushChat(msg);
    })
    .on("broadcast", { event: "social" }, ({ payload }) => {
      handleSocialAction(payload as SocialAction);
    })
    .on("broadcast", { event: "traffic" }, ({ payload }) => {
      handleTrafficSnap(payload as TrafficSnap);
    })
    .on("broadcast", { event: "traffic-hit" }, ({ payload }) => {
      const hit = payload as { to: string; vx: number; vz: number; vy?: number; kind?: VehicleKind };
      if (hit.to === playerId) queueSocialHit(hit.vx, hit.vz, hit.vy ?? 2.1);
    })
    .on("presence", { event: "sync" }, () => {
      const roster = Object.entries(channel.presenceState<ReturnType<typeof presencePayload>>()).map(([id, metas]) => ({
        id,
        name: metas[0]?.name ?? "Pengunjung",
        role: metas[0]?.role,
        avatar: metas[0]?.avatar,
        character: metas[0]?.character,
      }));
      useNet.getState().setRoster(roster);
    })
    .subscribe((status) => {
      useNet.getState().setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") void channel.track(presencePayload(useNet.getState().name || name, profile));
    });

  activeChannel = channel;
  activeRoom = room;
  return channel;
}

export function useWorldChannel(room: string, name: string, profile?: PlayerProfile | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = joinRoom(room, name, profile);
    // Channel sengaja tidak ditutup saat unmount komponen 3D; hanya saat tab ditutup.
  }, [room, name, profile]);

  // Nama yang diganti saat sesi berjalan tetap tersinkron ke roster.
  useEffect(() => {
    if (activeChannel && useNet.getState().connected) void activeChannel.track(presencePayload(name, profile));
  }, [name, profile]);

  return channelRef;
}

/** Kirim chat ke seluruh pemain di ruangan (dan simpan lokal). */
export function sendChat(channel: RealtimeChannel | null, name: string, text: string) {
  const msg: ChatMessage = {
    id: `${playerId}-${Date.now()}`,
    from: playerId,
    name,
    text,
    at: Date.now(),
  };
  useNet.getState().pushChat(msg);
  if (channel) void channel.send({ type: "broadcast", event: "chat", payload: msg });
}
