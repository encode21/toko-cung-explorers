import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, RemoteState } from "@/net/net-store";
import { useNet } from "@/net/net-store";
import { useProfile } from "@/identity/profile-store";
import { refreshRemoteProfile } from "./profile-sync";
import { useGame } from "@/state/game-store";
import { getLocalNetAnim } from "./local-pose";
import type { PlayerProfile } from "@/identity/profile-store";
import {
  handleSocialAction,
  queueSocialHit,
  type SocialAction,
} from "@/game/social/social-actions";
import {
  handleTrafficSnap,
  resetTrafficSync,
  maybePublishTraffic,
  type TrafficSnap,
} from "@/game/traffic/traffic-sync";
import type { VehicleKind } from "@/game/traffic/traffic-math";

/** Id unik per tab/klien. */
export const playerId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let activeChannel: RealtimeChannel | null = null;
const joinedAt = Date.now();
let activeRoom: string | null = null;
/** Posisi terakhir setiap pemain lain, dibaca oleh renderer 3D. */
export const remoteStates = new Map<string, RemoteState>();

export const getActiveChannel = () => activeChannel;

/**
 * Satu channel realtime per ruangan, dibuat sekali per sesi halaman: posisi
 * pemain (broadcast), roster (presence), dan chat. Channel disimpan di module
 * scope supaya remount komponen 3D tidak memutus koneksi.
 */
function presencePayload() {
  const profile = useProfile.getState().profile;
  const { playerPos, playerYaw } = useGame.getState();
  return {
    joinedAt,
    available: !document.hidden,
    name: profile?.displayName ?? useNet.getState().name,
    userId: profile?.id,
    revision: profile?.updatedAt,
    pose: {
      id: playerId,
      name: profile?.displayName ?? "Pengunjung",
      x: playerPos[0],
      y: playerPos[1],
      z: playerPos[2],
      ry: playerYaw,
      anim: getLocalNetAnim(),
    },
  };
}
function sendOwnSnapshot(channel: RealtimeChannel) {
  void channel.send({ type: "broadcast", event: "state", payload: presencePayload().pose });
  void channel.track(presencePayload());
  maybePublishTraffic(performance.now(), true);
}
function validPose(s: RemoteState) {
  return !!s && typeof s.id === "string" && [s.x, s.y, s.z, s.ry].every(Number.isFinite);
}

function joinRoom(room: string) {
  if (activeChannel && activeRoom === room) return activeChannel;
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  remoteStates.clear();
  useNet.getState().setRoster([]);
  resetTrafficSync();
  const channel = supabase.channel(`world:${room}`, {
    config: { broadcast: { self: false }, presence: { key: playerId } },
  });

  channel
    .on("broadcast", { event: "state" }, ({ payload }) => {
      const s = payload as RemoteState;
      if (validPose(s) && s.id !== playerId) remoteStates.set(s.id, s);
    })
    .on("broadcast", { event: "player_profile_updated" }, ({ payload }) => {
      const p = payload as { userId?: string };
      if (p.userId && useNet.getState().roster.some((r) => r.userId === p.userId))
        void refreshRemoteProfile(p.userId);
    })
    .on("broadcast", { event: "world_snapshot_request" }, () => sendOwnSnapshot(channel))
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
      const hit = payload as {
        to: string;
        vx: number;
        vz: number;
        vy?: number;
        kind?: VehicleKind;
      };
      if (hit.to === playerId) queueSocialHit(hit.vx, hit.vz, hit.vy ?? 2.1);
    })
    .on("presence", { event: "sync" }, () => {
      const old = useNet.getState().roster;
      const roster = Object.entries(
        channel.presenceState<ReturnType<typeof presencePayload>>(),
      ).map(([id, metas]) => {
        const meta = metas.at(-1);
        if (meta?.pose && validPose(meta.pose) && !remoteStates.has(id) && id !== playerId)
          remoteStates.set(id, meta.pose);
        const previous = old.find((p) => p.id === id && p.userId === meta?.userId);
        return {
          ...previous,
          id,
          joinedAt: meta?.joinedAt ?? Number.MAX_SAFE_INTEGER,
          available: meta?.available !== false,
          ...(meta?.userId ? { userId: meta.userId } : {}),
          name: previous?.name ?? "Pengunjung",
        };
      });
      useNet.getState().setRoster(roster);
      for (const id of remoteStates.keys())
        if (!roster.some((p) => p.id === id)) remoteStates.delete(id);
      for (const p of roster)
        if (p.userId && p.id !== playerId) void refreshRemoteProfile(p.userId);
      maybePublishTraffic(performance.now(), true);
    })
    .subscribe((status) => {
      if (activeChannel !== channel) return;
      useNet.getState().setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        remoteStates.clear();
        resetTrafficSync();
        void channel.track(presencePayload());
        void useProfile.getState().load();
        void channel.send({
          type: "broadcast",
          event: "world_snapshot_request",
          payload: { from: playerId },
        });
      } else {
        useNet.getState().setRoster([]);
        remoteStates.clear();
        resetTrafficSync();
      }
    });

  activeChannel = channel;
  activeRoom = room;
  return channel;
}

export function useWorldChannel(room: string, name: string, profile?: PlayerProfile | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = joinRoom(room);
    const channel = channelRef.current;
    const refresh = () => {
      if (channel && useNet.getState().connected) {
        void channel.track(presencePayload());
        if (!document.hidden)
          void channel.send({
            type: "broadcast",
            event: "world_snapshot_request",
            payload: { from: playerId },
          });
      }
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      if (activeChannel === channel) {
        activeChannel = null;
        activeRoom = null;
        remoteStates.clear();
        useNet.getState().setConnected(false);
        useNet.getState().setRoster([]);
        resetTrafficSync();
        if (channel) void supabase.removeChannel(channel);
      }
    };
  }, [room]);

  // Nama yang diganti saat sesi berjalan tetap tersinkron ke roster.
  useEffect(() => {
    if (activeChannel && useNet.getState().connected) {
      void activeChannel.track(presencePayload());
      if (profile)
        void activeChannel.send({
          type: "broadcast",
          event: "player_profile_updated",
          payload: { playerId, userId: profile.id, revision: profile.updatedAt },
        });
    }
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
