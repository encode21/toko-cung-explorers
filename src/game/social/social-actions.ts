/**
 * Aksi sosial antar pemain (sapa / pukul) via Supabase broadcast.
 * Korban pukulan menerapkan Fall lokal seperti tabrakan mobil.
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getActiveChannel, playerId, remoteStates } from "@/net/useWorldChannel";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import {
  CHAT_EMOTES,
  isChatEmoteAnimation,
  type ChatEmoteAnimation,
  type ChatEmoteId,
} from "./chat-emotes";

export { CHAT_EMOTES, type ChatEmoteId } from "./chat-emotes";

export type SocialKind = "wave" | "punch";

export interface SocialAction {
  from: string;
  fromName: string;
  to: string;
  kind: SocialKind;
  vx: number;
  vz: number;
  at: number;
}

export type RemoteAnim = "Drink" | "Wave" | "Hit" | "Fall" | "GetUp" | ChatEmoteAnimation;

interface PendingHit {
  vx: number;
  vz: number;
  vy: number;
}

interface RemoteAnimState {
  anim: RemoteAnim;
  until: number;
}

let pendingHit: PendingHit | null = null;
const remoteAnims = new Map<string, RemoteAnimState>();
let localAnim: { anim: RemoteAnim; until: number } | null = null;
let getLocalPose: (() => { x: number; z: number } | null) | null = null;
let chatEmoteGuard: (() => string | null) | null = null;

/** The live controller supplies physics checks without coupling HUD actions to Rapier. */
export function registerChatEmoteGuard(guard: (() => string | null) | null) {
  chatEmoteGuard = guard;
  if (!guard) cancelChatEmote();
}

export function selectChatEmote(id: ChatEmoteId): { ok: boolean; message: string } {
  const emote = CHAT_EMOTES.find((entry) => entry.id === id);
  if (!emote) return { ok: false, message: "Emote tidak tersedia." };
  if (!chatEmoteGuard) return { ok: false, message: "Tunggu sampai karakter siap." };
  const blocked = chatEmoteGuard();
  if (blocked) return { ok: false, message: blocked };
  if (getActiveChatEmote() === id) {
    return { ok: true, message: `Emote ${emote.label.toLowerCase()} sedang berjalan.` };
  }
  setLocalSocialAnim(emote.animation, emote.seconds * 1000);
  return {
    ok: true,
    message: Number.isFinite(emote.seconds)
      ? `Emote ${emote.label.toLowerCase()}.`
      : `${emote.label}. Bergerak atau lompat untuk berdiri.`,
  };
}

export function getActiveChatEmote(): ChatEmoteId | null {
  const animation = peekLocalSocialAnim();
  return CHAT_EMOTES.find((emote) => emote.animation === animation)?.id ?? null;
}

export function cancelChatEmote() {
  if (isChatEmoteAnimation(localAnim?.anim)) localAnim = null;
}

export function registerLocalPose(fn: (() => { x: number; z: number } | null) | null) {
  getLocalPose = fn;
}

/** Impuls pukulan — gaya Fall seperti mobil (bukan launch truk). */
export function punchImpulse(from: { x: number; z: number }, to: { x: number; z: number }) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const force = 4.2;
  return { x: (dx / len) * force, z: (dz / len) * force, y: 2.1 };
}

export function queueSocialHit(vx: number, vz: number, vy = 2.1) {
  pendingHit = { vx, vz, vy };
}

export function consumeSocialHit() {
  const hit = pendingHit;
  pendingHit = null;
  return hit;
}

export function setLocalSocialAnim(anim: RemoteAnim, ms = 900) {
  localAnim = { anim, until: performance.now() + ms };
}

export function cancelSocialPoseOnMove() {
  if (localAnim?.anim === "Drink" || isChatEmoteAnimation(localAnim?.anim)) localAnim = null;
}

export function peekLocalSocialAnim(): RemoteAnim | null {
  if (!localAnim) return null;
  if (performance.now() > localAnim.until) {
    localAnim = null;
    return null;
  }
  return localAnim.anim;
}

export function setRemoteSocialAnim(id: string, anim: RemoteAnim, ms: number) {
  remoteAnims.set(id, { anim, until: performance.now() + ms });
}

export function peekRemoteSocialAnim(id: string): RemoteAnim | null {
  const s = remoteAnims.get(id);
  if (!s) return null;
  if (performance.now() > s.until) {
    remoteAnims.delete(id);
    return null;
  }
  return s.anim;
}

export function handleSocialAction(action: SocialAction) {
  if (action.from === playerId) return;

  if (action.kind === "wave") {
    setRemoteSocialAnim(action.from, "Wave", 2400);
    if (action.to === playerId) {
      useGame.getState().setToast(`${action.fromName} menyapa kamu`);
    }
    return;
  }

  setRemoteSocialAnim(action.from, "Hit", 450);
  if (action.to === playerId) {
    queueSocialHit(action.vx, action.vz, 2.1);
    useGame.getState().setToast(`${action.fromName} memukul kamu!`);
  } else {
    setRemoteSocialAnim(action.to, "Hit", 220);
    window.setTimeout(() => setRemoteSocialAnim(action.to, "Fall", 450), 220);
    window.setTimeout(() => setRemoteSocialAnim(action.to, "GetUp", 600), 670);
  }
}

export function sendSocialAction(
  channel: RealtimeChannel | null,
  action: Omit<SocialAction, "from" | "at"> & { from?: string },
) {
  const payload: SocialAction = {
    ...action,
    from: action.from ?? playerId,
    at: Date.now(),
  };
  const ch = channel ?? getActiveChannel();
  if (ch) void ch.send({ type: "broadcast", event: "social", payload });
  return payload;
}

/** Dipanggil dari HUD / F — sapa atau pukul pemain terdekat. */
export function performSocialAct(kind: SocialKind, to: string, toName: string) {
  const from = getLocalPose?.();
  const target = remoteStates.get(to);
  if (!from || !target) {
    useGame.getState().setToast("Pemain sudah menjauh");
    return;
  }

  const name = useNet.getState().name || "Pengunjung";
  const impulse = punchImpulse(from, target);

  if (kind === "wave") {
    setLocalSocialAnim("Wave", 2400);
    sendSocialAction(null, {
      fromName: name,
      to,
      kind: "wave",
      vx: 0,
      vz: 0,
    });
    useGame.getState().setToast(`Kamu menyapa ${toName}`);
    return;
  }

  setLocalSocialAnim("Hit", 420);
  // Optimistic di sisi penyerang — broadcast self:false tidak mengembalikan event ke kita.
  setRemoteSocialAnim(to, "Hit", 220);
  window.setTimeout(() => setRemoteSocialAnim(to, "Fall", 450), 220);
  window.setTimeout(() => setRemoteSocialAnim(to, "GetUp", 600), 670);
  sendSocialAction(null, {
    fromName: name,
    to,
    kind: "punch",
    vx: impulse.x,
    vz: impulse.z,
  });
  useGame.getState().setToast(`Kamu memukul ${toName}`);
}
