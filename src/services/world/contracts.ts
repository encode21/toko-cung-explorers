import type { PlayerProfile } from "@/identity/profile-store";
import type { GameSnapshot } from "@/game/core/types";
export interface WorldAccount {
  id: string;
  displayName: string;
}
export interface WorldSession {
  user: WorldAccount;
  profile: PlayerProfile;
  owned: string[];
  game: GameSnapshot;
}
export interface WorldChannel {
  id: string;
  capacity: number;
  occupied: number;
}
export interface ChannelLease {
  channel: string;
  connectionId: string;
  playerId: string;
  expiresAt: string;
  realtimeToken: string;
}
export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
export type WorldOperation =
  | "dungeon"
  | "state"
  | "me"
  | "login"
  | "register"
  | "pin-request"
  | "pin-setup"
  | "pin-reset"
  | "logout"
  | "profile"
  | "command"
  | "channels"
  | "join"
  | "leave"
  | "public-profile"
  | "connection-profile";
export type ApiResult = { ok: true; value: Json } | { ok: false; status: number; message: string };
