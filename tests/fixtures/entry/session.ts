import { create } from "zustand";
import type { WorldAccount } from "@/services/world/contracts";
import { WorldApiError } from "./world";

// Reload with ?session=loading|active|guest-error|guest-busy|auth-success|auth-busy.
// These responses are local fixtures: no API calls, tokens, or real accounts.
const scenario = new URLSearchParams(window.location.search).get("session");
export const useSession = create<{
  user: WorldAccount | null;
  loading: boolean;
  error: string | null;
}>(() => ({
  user: scenario === "active" ? { id: "fixture-player", displayName: "Pemain uji" } : null,
  loading: scenario === "loading",
  error: null,
}));

export async function loginAsGuest() {
  if (scenario === "guest-busy") await new Promise<void>(() => {});
  await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
  if (scenario === "guest-error") {
    throw new Error("Mode tamu belum bisa dibuka. Coba lagi.");
  }
  useSession.setState({
    user: { id: "fixture-guest", displayName: "Tamu uji", guest: true },
    loading: false,
    error: null,
  });
}

async function authenticate(errorMessage: string) {
  if (scenario === "auth-busy") await new Promise<void>(() => {});
  await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
  if (scenario !== "auth-success") throw new Error(errorMessage);
  useSession.setState({
    user: { id: "fixture-player", displayName: "Pemain uji" },
    loading: false,
    error: null,
  });
}

export async function loginAccount() {
  await authenticate("Nomor atau PIN tidak sesuai.");
}
export async function registerAccount(_name: string, phone: string) {
  if (phone.endsWith("01")) throw new WorldApiError(409, "Nomor sudah terdaftar");
  await authenticate("Pendaftaran belum tersedia. Coba kembali.");
}
export async function createGamePin() {
  await authenticate("Kode verifikasi tidak sesuai.");
}
