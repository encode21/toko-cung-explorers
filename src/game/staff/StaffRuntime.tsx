import { useEffect } from "react";
import { useAccount } from "@/auth/useSession";
import { clearStaff, staffCommand, useStaff } from "./store";
import { pollWarung, useWarung } from "@/game/warung/store";

/**
 * Settle the owner's warung from anywhere in the World (inside, WarungHud polls faster). It must run before
 * the staff read: that one settles server-side too and would swallow the "ada yang beli" result.
 */
async function settleAway() {
  const w = useWarung.getState();
  // Not loaded yet must still poll: spawning outside never loads the warung, so staff reads settled sales silently.
  if (!w.inside && w.data?.warung !== null) await pollWarung(false);
}

export function StaffRuntime() {
  const account = useAccount((s) => s.user?.id);
  const interval = useStaff((s) => s.data?.pollSeconds);
  useEffect(() => {
    clearStaff();
    if (!account) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void settleAway().then(() => staffCommand("state"));
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      clearStaff();
      window.removeEventListener("focus", refresh);
    };
  }, [account]);
  useEffect(() => {
    if (!account) return;
    // Staff off (no interval): still settle away sales at the same light 75 s pace.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void settleAway().then(() => (interval ? staffCommand("state") : undefined));
    }, (interval ?? 75) * 1000);
    return () => window.clearInterval(timer);
  }, [account, interval]);
  return null;
}
