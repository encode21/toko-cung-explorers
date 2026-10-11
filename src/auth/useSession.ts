import { normalizeAvatar } from "@/identity/avatar";
import { useEffect } from "react";
import { create } from "zustand";
import { worldRequest, onAccountExpired, WorldApiError } from "@/services/world/client";
import type { WorldAccount, WorldSession } from "@/services/world/contracts";
import { useProfile } from "@/identity/profile-store";
import { useGameCore, clearGameCore } from "@/game/core/store";
interface SessionState {
  loading: boolean;
  initialized: boolean;
  user: WorldAccount | null;
  displayName: string;
  error: string | null;
}
export const useAccount = create<SessionState>(() => ({
  loading: true,
  initialized: false,
  user: null,
  displayName: "",
  error: null,
}));
let inflight: Promise<void> | null = null;
let generation = 0;
function hydrate(s: WorldSession) {
  useProfile.setState({
    profile: { ...s.profile, avatar: normalizeAvatar(s.profile.avatar) },
    owned: s.owned,
    loading: false,
    error: null,
  });
  useGameCore.setState({ snapshot: s.game, error: "" });
  useAccount.setState({
    user: s.user,
    displayName: s.profile.displayName,
    loading: false,
    initialized: true,
    error: null,
  });
}
export function clearAccount() {
  generation++;
  useProfile.getState().clear();
  clearGameCore();
  useAccount.setState({
    loading: false,
    initialized: true,
    user: null,
    displayName: "",
    error: null,
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("world-account-cleared"));
}
onAccountExpired(clearAccount);
export function restoreAccount(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && useAccount.getState().initialized) return Promise.resolve();
  const ticket = generation;
  useAccount.setState({ loading: true });
  inflight = worldRequest<WorldSession>("me")
    .then((s) => {
      if (ticket === generation) hydrate(s);
    })
    .catch((e) => {
      if (ticket === generation)
        useAccount.setState({
          loading: false,
          initialized: true,
          error: e instanceof WorldApiError && e.status === 401 ? null : e.message,
        });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
export async function loginAccount(phone: string, pin: string) {
  const ticket = ++generation;
  const s = await worldRequest<WorldSession>("login", { phone, pin });
  if (ticket === generation) hydrate(s);
}
export async function registerAccount(
  name: string,
  phone: string,
  pin: string,
  confirmation: string,
) {
  const ticket = ++generation;
  const s = await worldRequest<WorldSession>("register", {
    name,
    phone,
    pin,
    pin_confirmation: confirmation,
  });
  if (ticket === generation) hydrate(s);
}
export async function createGamePin(
  phone: string,
  code: string,
  pin: string,
  confirmation: string,
  reset = false,
) {
  const ticket = ++generation;
  const s = await worldRequest<WorldSession>(reset ? "pin-reset" : "pin-setup", {
    phone,
    code,
    pin,
    pin_confirmation: confirmation,
  });
  if (ticket === generation) hydrate(s);
}
export async function logoutAccount() {
  try {
    await worldRequest("logout");
  } finally {
    clearAccount();
  }
}
export function useSession() {
  const state = useAccount();
  useEffect(() => {
    void restoreAccount();
  }, []);
  return state;
}
