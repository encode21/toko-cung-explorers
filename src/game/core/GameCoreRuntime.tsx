import { useEffect, useRef } from "react";
import { useProfile } from "@/identity/profile-store";
import { useSecretQuest } from "@/game/secret/store";
import { useGame } from "@/state/game-store";
import { tryAutoCompleteQuest } from "./auto-complete";
import { clearGameCore, command, useGameCore } from "./store";
/** Private HTTPS state only. Never added to multiplayer presence or broadcasts. */
export function GameCoreRuntime() {
  const id = useProfile((s) => s.profile?.id);
  const previousId = useRef<string | null>(null);
  const snapshot = useGameCore((s) => s.snapshot);
  const busy = useGameCore((s) => s.busy);
  const overlay = useGame((s) => s.overlay);
  const secretOpen = useSecretQuest((s) => s.open);

  useEffect(() => {
    // Hanya clear saat logout / ganti akun — jangan hapus snapshot yang sudah
    // diisi dungeon/hub saat profil baru selesai load.
    if (!id) {
      previousId.current = null;
      clearGameCore();
      return;
    }
    if (previousId.current && previousId.current !== id) clearGameCore();
    previousId.current = id;
    void command("read");
    const timer = window.setInterval(() => {
      if (useGameCore.getState().snapshot) void command("pose");
    }, 2500);
    const refresh = window.setInterval(() => void command("read"), 30000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, [id]);

  useEffect(() => {
    tryAutoCompleteQuest();
  }, [snapshot, busy, overlay, secretOpen]);

  return null;
}
