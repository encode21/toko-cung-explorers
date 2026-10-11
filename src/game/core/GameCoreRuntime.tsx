import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { clearGameCore, command, useGameCore } from "./store";
/** Private HTTPS state only. Never added to multiplayer presence or broadcasts. */
export function GameCoreRuntime() {
  const id = useProfile((s) => s.profile?.id);
  useEffect(() => {
    clearGameCore();
    if (!id) return;
    void command("read");
    const timer = window.setInterval(() => {
      if (useGameCore.getState().snapshot) void command("pose");
    }, 2500);
    const refresh = window.setInterval(() => void command("read"), 30000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
      clearGameCore();
    };
  }, [id]);
  return null;
}
