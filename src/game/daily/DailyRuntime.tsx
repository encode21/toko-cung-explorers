import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { clearDaily, dailyCommand, useDaily } from "./store";
export function DailyRuntime() {
  const id = useProfile((s) => s.profile?.id);
  const resetAt = useDaily((s) => s.resetAt);
  useEffect(() => {
    clearDaily();
    if (!id) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void dailyCommand("read");
    };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearDaily();
    };
  }, [id]);
  useEffect(() => {
    if (!id || !resetAt) return;
    const timer = window.setTimeout(
      () => void dailyCommand("read"),
      Math.max(100, resetAt - Date.now() + 150),
    );
    return () => clearTimeout(timer);
  }, [id, resetAt]);
  return null;
}
