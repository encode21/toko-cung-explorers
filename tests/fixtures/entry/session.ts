import { create } from "zustand";
import { WorldApiError } from "./world";
export const useSession = create(() => ({ user: null, loading: false, error: null }));
export async function loginAccount() {
  throw new Error("Nomor atau PIN tidak sesuai.");
}
export async function registerAccount(_name: string, phone: string) {
  if (phone.endsWith("01")) throw new WorldApiError("Nomor sudah terdaftar", 409);
  throw new Error("Pendaftaran belum tersedia. Coba kembali.");
}
export async function createGamePin() {
  throw new Error("Kode verifikasi tidak sesuai.");
}
