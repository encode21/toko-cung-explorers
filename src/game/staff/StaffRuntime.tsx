import { useEffect } from "react";
import { useAccount } from "@/auth/useSession";
import { clearStaff, staffCommand, useStaff } from "./store";

export function StaffRuntime() {
  const account = useAccount((s) => s.user?.id);
  const interval = useStaff((s) => s.data?.pollSeconds);
  useEffect(() => {
    clearStaff();
    if (!account) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void staffCommand("state");
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      clearStaff();
      window.removeEventListener("focus", refresh);
    };
  }, [account]);
  useEffect(() => {
    if (!account || !interval) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void staffCommand("state");
    }, interval * 1000);
    return () => window.clearInterval(timer);
  }, [account, interval]);
  return null;
}
