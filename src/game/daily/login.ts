import { create } from "zustand";
import { command } from "@/game/core/store";
import { worldRequest } from "@/services/world/client";

export type DailyLoginStatus = {
  enabled: boolean;
  points: number;
  claimedToday: boolean;
  budgetExhausted: boolean;
  currentDay: number;
  resetAt: number;
  days: { day: number; points: number; claimed: boolean; date: string | null }[];
};
export const useDailyLogin = create<{
  status: DailyLoginStatus | null;
  busy: boolean;
  error: string;
}>(() => ({ status: null, busy: false, error: "" }));

let revision = 0;
export function clearDailyLogin() {
  revision++;
  useDailyLogin.setState({ status: null, busy: false, error: "" });
}
export async function loadDailyLogin(): Promise<DailyLoginStatus | null> {
  if (useDailyLogin.getState().busy) return useDailyLogin.getState().status;
  const request = ++revision;
  try {
    const status = await worldRequest<DailyLoginStatus>("daily-login");
    if (request !== revision) return null;
    useDailyLogin.setState({ status, error: "" });
    return status;
  } catch {
    if (request === revision) useDailyLogin.setState({ error: "Hadiah belum termuat. Coba lagi." });
    return null;
  }
}
export async function claimDailyLogin() {
  if (useDailyLogin.getState().busy) return;
  const request = ++revision;
  useDailyLogin.setState({ busy: true, error: "" });
  try {
    const status = await worldRequest<DailyLoginStatus>("daily-login-claim");
    if (request !== revision) return;
    useDailyLogin.setState({ status });
    void command("read");
  } catch (e) {
    if (request !== revision) return;
    useDailyLogin.setState({
      error: e instanceof Error ? e.message : "Hadiah gagal diambil. Coba lagi.",
    });
  } finally {
    if (request === revision) useDailyLogin.setState({ busy: false });
  }
}
