import { create } from "zustand";
import { command } from "@/game/core/store";
import { worldRequest } from "@/services/world/client";

export type DailyLoginStatus = { enabled: boolean; points: number; claimedToday: boolean };
export const useDailyLogin = create<{
  status: DailyLoginStatus | null;
  busy: boolean;
  error: string;
}>(() => ({ status: null, busy: false, error: "" }));

export async function loadDailyLogin(): Promise<DailyLoginStatus | null> {
  try {
    const status = await worldRequest<DailyLoginStatus>("daily-login");
    useDailyLogin.setState({ status });
    return status;
  } catch {
    return null;
  }
}
export async function claimDailyLogin() {
  if (useDailyLogin.getState().busy) return;
  useDailyLogin.setState({ busy: true, error: "" });
  try {
    const status = await worldRequest<DailyLoginStatus>("daily-login-claim");
    useDailyLogin.setState({ status });
    void command("read");
  } catch (e) {
    useDailyLogin.setState({
      error: e instanceof Error ? e.message : "Hadiah gagal diambil. Coba lagi.",
    });
  } finally {
    useDailyLogin.setState({ busy: false });
  }
}
