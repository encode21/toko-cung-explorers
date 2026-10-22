import { useClub } from "@/game/club/store";
import { handleMissionDrive } from "@/game/missions/runtime";
import { startMobility } from "@/game/mobility/store";
import {
  missionSessionId,
  startMissions,
  publishMissions,
  handleMissionSnapshot,
  handleMissionCommand,
  handleMissionResult,
} from "@/game/missions/runtime";
import {
  worldRoom,
  startReactiveWorld,
  publishWorld,
  handleWorldSnapshot,
  refreshLive,
} from "@/game/reactive-world/runtime";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { realtime as supabase } from "@/net/realtime";
import { connectionId as playerId, useChannels } from "@/net/channel-store";
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

/** Live binding to tab connection id (rotates on logout). Account id is profile.id. */
export { playerId };

let activeChannel: RealtimeChannel | null = null;
let joinedAt = Date.now();
let activeRoom: string | null = null;
/** Posisi terakhir setiap pemain lain, dibaca oleh renderer 3D. */
export const remoteStates = new Map<string, RemoteState>();

export const getActiveChannel = () =>
  activeChannel?.state === "joined" && useNet.getState().connected ? activeChannel : null;

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
    missionSession: missionSessionId(),
    available: !document.hidden && !(useClub.getState().inside && !useClub.getState().outdoor),
    name: profile?.displayName ?? useNet.getState().name,
    userId: profile?.id,
    playerId: profile?.id,
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
  if (channel.state !== "joined" || !useNet.getState().connected) return;
  void channel.send({ type: "broadcast", event: "state", payload: presencePayload().pose });
  void channel.track(presencePayload());
  if (!activeRoom?.startsWith("DNG-")) {
    maybePublishTraffic(performance.now(), true);
    publishWorld(true);
    publishMissions(true);
  }
}
function validPose(s: RemoteState) {
  return !!s && typeof s.id === "string" && [s.x, s.y, s.z, s.ry].every(Number.isFinite);
}

function joinRoom(room: string) {
  const dungeon = room.startsWith("DNG-");
  if (activeChannel && activeRoom === room) return activeChannel;
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  useNet.setState({ connected: false, connectionError: "" });
  worldRoom(room);
  remoteStates.clear();
  useNet.getState().setRoster([]);
  resetTrafficSync();
  const channel = supabase.channel(`world:${room}`, {
    config: { private: true, broadcast: { self: false }, presence: { key: playerId } },
  });

  channel
    .on("broadcast", { event: "club_changed" }, () => {
      window.dispatchEvent(new Event("club-changed"));
    })
    .on("broadcast", { event: "state" }, ({ payload }) => {
      const s = payload as RemoteState;
      if (validPose(s) && s.id !== playerId) remoteStates.set(s.id, s);
    })
    .on("broadcast", { event: "player_profile_updated" }, ({ payload }) => {
      const p = payload as { userId?: string };
      if (p.userId && useNet.getState().roster.some((r) => r.userId === p.userId))
        useNet
          .getState()
          .roster.filter((r) => r.userId === p.userId)
          .forEach((r) => void refreshRemoteProfile(r.id));
    })
    .on("broadcast", { event: "world_snapshot_request" }, () => sendOwnSnapshot(channel))
    .on(
      "broadcast",
      { event: "world_event_snapshot" },
      ({ payload }) => !dungeon && handleWorldSnapshot(payload),
    )
    .on("broadcast", { event: "world_event_updated" }, () => {
      if (!dungeon) void refreshLive();
    })
    .on(
      "broadcast",
      { event: "mission_snapshot" },
      ({ payload }) => !dungeon && handleMissionSnapshot(payload),
    )
    .on("broadcast", { event: "mission_drive" }, ({ payload }) => handleMissionDrive(payload))
    .on(
      "broadcast",
      { event: "mission_command" },
      ({ payload }) => !dungeon && handleMissionCommand(payload),
    )
    .on(
      "broadcast",
      { event: "mission_result" },
      ({ payload }) => !dungeon && handleMissionResult(payload),
    )
    .on("broadcast", { event: "chat" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      if (msg.from !== playerId) useNet.getState().pushChat(msg);
    })
    .on("broadcast", { event: "social" }, ({ payload }) => {
      if (!dungeon) handleSocialAction(payload as SocialAction);
    })
    .on("broadcast", { event: "traffic" }, ({ payload }) => {
      if (!dungeon) handleTrafficSnap(payload as TrafficSnap);
    })
    .on("broadcast", { event: "traffic-hit" }, ({ payload }) => {
      const hit = payload as {
        to: string;
        vx: number;
        vz: number;
        vy?: number;
        kind?: VehicleKind;
      };
      if (!dungeon && hit.to === playerId) queueSocialHit(hit.vx, hit.vz, hit.vy ?? 2.1);
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
          ...(meta?.missionSession ? { missionSession: meta.missionSession } : {}),
          joinedAt: meta?.joinedAt ?? Number.MAX_SAFE_INTEGER,
          available: meta?.available !== false,
          ...(meta?.userId ? { userId: meta.userId } : {}),
          name: previous?.name ?? "Pengunjung",
        };
      });
      useNet.getState().setRoster(roster);
      for (const id of remoteStates.keys())
        if (!roster.some((p) => p.id === id)) remoteStates.delete(id);
      for (const p of roster) if (p.id !== playerId) void refreshRemoteProfile(p.id);
      if (!dungeon) maybePublishTraffic(performance.now(), true);
    })
    .subscribe((status) => {
      if (activeChannel !== channel) return;
      useNet.setState({
        connected: status === "SUBSCRIBED",
        connectionError:
          status === "SUBSCRIBED"
            ? ""
            : status === "CHANNEL_ERROR"
              ? "Multiplayer belum tersedia. Coba sambungkan ulang."
              : status === "TIMED_OUT"
                ? "Sambungan multiplayer terlalu lama. Coba lagi."
                : "Koneksi multiplayer terputus. Menyambungkan kembali…",
      });
      if (status === "SUBSCRIBED") {
        // A reconnected peer rejoins behind the uninterrupted host, preventing stale takeover.
        joinedAt = Date.now();
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
  const authorizedRoom = useChannels((s) => s.lease?.channel);
  const accountId = profile?.id;

  useEffect(() => {
    if (!authorizedRoom || authorizedRoom !== room || !accountId) return;
    channelRef.current = joinRoom(room);
    const channel = channelRef.current;
    const dungeon = room.startsWith("DNG-");
    const stopMobility = dungeon ? () => {} : startMobility();
    const stopReactiveWorld = dungeon ? () => {} : startReactiveWorld();
    const stopMissions = dungeon ? () => {} : startMissions(room);
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
    const stopClubAvailability = useClub.subscribe((next, previous) => {
      if ((next.inside && !next.outdoor) !== (previous.inside && !previous.outdoor)) refresh();
    });
    return () => {
      stopMobility();
      stopMissions();
      stopReactiveWorld();
      document.removeEventListener("visibilitychange", refresh);
      stopClubAvailability();
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
  }, [room, authorizedRoom, accountId]);

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

export type ChatSendResult = { ok: true } | { ok: false; error: string };

/** Add a local message only after the current room transport accepts it. */
export async function sendChat(
  channel: RealtimeChannel | null,
  name: string,
  text: string,
): Promise<ChatSendResult> {
  const value = text.trim().slice(0, 200);
  if (!value) return { ok: false, error: "Tulis pesan terlebih dahulu." };
  if (!channel || channel.state !== "joined" || !useNet.getState().connected)
    return { ok: false, error: "Chat belum tersambung. Coba lagi setelah terhubung." };
  const msg: ChatMessage = {
    id: `${playerId}-${Date.now()}`,
    from: playerId,
    name,
    text: value,
    at: Date.now(),
  };
  try {
    const status = await channel.send({ type: "broadcast", event: "chat", payload: msg });
    if (status !== "ok") return { ok: false, error: "Pesan belum terkirim. Coba lagi." };
    if (msg.from !== playerId || channel.state !== "joined" || !useNet.getState().connected)
      return { ok: false, error: "Koneksi chat berubah. Coba lagi setelah terhubung." };
    useNet.getState().pushChat(msg);
    return { ok: true };
  } catch {
    return { ok: false, error: "Pesan belum terkirim. Coba lagi." };
  }
}
