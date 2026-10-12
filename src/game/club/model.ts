export const DANCES = [
  "bounce",
  "step",
  "disco",
  "wave",
  "shuffle",
  "sway",
  "robot",
  "salsa",
] as const;
export type DanceId = (typeof DANCES)[number];
export interface DanceState {
  id: DanceId;
  startedAt: number;
  groupId: string;
}
export interface ClubTrack {
  id: string;
  mediaId: string;
  from: string;
}
export interface PlaybackState {
  roomId: string;
  provider: "mock" | "youtube";
  mediaId: string | null;
  playbackStatus: "playing" | "paused" | "stopped";
  startedAt: number | null;
  positionSeconds: number;
  queueVersion: number;
  activeDjId: string | null;
}
export interface ClubSnapshot extends PlaybackState {
  revision: number;
  serverNow: number;
  lighting: "neon" | "sunset" | "ocean";
  queue: ClubTrack[];
  requests: ClubTrack[];
  waiting: string[];
  members: Record<
    string,
    { name: string; expiresAt: number; dance: DanceState | null; applied: boolean }
  >;
}
/** Allowlisted official video for club boot + catalog (https://youtu.be/_MmGd4-wEco). */
export const DEFAULT_YOUTUBE_VIDEO_ID = "_MmGd4-wEco";
export const CLUB_TRACKS = [
  {
    id: "cung-underground-set",
    title: "Cung Underground Set",
    duration: 10800,
    youtubeId: DEFAULT_YOUTUBE_VIDEO_ID,
  },
  { id: "cung-night", title: "Cung Night", duration: 180, youtubeId: null },
  { id: "neon-jalan", title: "Neon Jalan", duration: 210, youtubeId: null },
  { id: "basement-groove", title: "Basement Groove", duration: 160, youtubeId: null },
  { id: "pulang-pagi", title: "Pulang Pagi", duration: 195, youtubeId: null },
] as const;
/** @deprecated use CLUB_TRACKS */
export const MOCK_TRACKS = CLUB_TRACKS;
export function youtubeIdFor(mediaId: string): string | null {
  return CLUB_TRACKS.find((t) => t.id === mediaId)?.youtubeId ?? null;
}
export function playbackPosition(s: PlaybackState, now: number) {
  return Math.max(
    0,
    s.positionSeconds +
      (s.playbackStatus === "playing" && s.startedAt !== null
        ? Math.max(0, now - s.startedAt) / 1000
        : 0),
  );
}
export function newerSnapshot(next: ClubSnapshot, current: ClubSnapshot | null, room: string) {
  return (
    next.roomId === room &&
    (!current ||
      next.revision > current.revision ||
      (next.revision === current.revision && next.serverNow >= current.serverNow))
  );
}
