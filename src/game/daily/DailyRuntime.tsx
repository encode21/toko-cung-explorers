import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { useChannels } from "@/net/channel-store";
import { useHud } from "@/state/hud-store";
import { clearDaily, dailyCommand, useDaily } from "./store";
import { clearDailyLogin, loadDailyLogin, useDailyLogin } from "./login";
import { useReactiveWorld } from "@/game/reactive-world/store";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { useDungeon } from "@/game/dungeon/store";
import { useWorldEditor } from "@/game/editor/store";
import { mapAnnouncementSeen } from "@/ui/hud/announcements";
// Module scope: the HUD remounts across channel switches, and a dismissed popup should stay dismissed.
const promptedFor = new Set<string>();
export function DailyRuntime() {
  const id = useProfile((s) => s.profile?.id);
  const resetAt = useDaily((s) => s.resetAt);
  const playing = useChannels((s) => s.playing);
  const sceneReady = useChannels((s) => s.sceneReady);
  const login = useDailyLogin((s) => s.status);
  const event = useReactiveWorld((s) =>
    s.events.find((e) => e.type === "NATIONAL_DAY" && e.payload.theme === "pahlawan"),
  );
  const sheet = useHud((s) => s.sheet);
  const overlay = useGame((s) => s.overlay);
  const panels = useGameUi((s) => s.panels);
  const talking = useNpcConversation();
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const mode = useWorldEditor((s) => s.mode);
  useEffect(() => {
    clearDailyLogin();
    if (id && playing) void loadDailyLogin();
    return clearDailyLogin;
  }, [id, playing]);
  useEffect(() => {
    if (!id) return;
    const eventKey = event ? `${id}:event:${event.id}` : null;
    const mapKey = `${id}:announce:map`;
    const loginKey = login ? `${id}:login:${login.resetAt}` : null;
    if (sheet === "pahlawan-event") {
      if (eventKey) promptedFor.add(eventKey);
      promptedFor.add(mapKey);
    }
    if (sheet === "daily-login" && loginKey) promptedFor.add(loginKey);
    if (
      !playing ||
      !sceneReady ||
      sheet ||
      panels ||
      overlay !== "none" ||
      talking ||
      dungeon ||
      mode !== "PLAYER"
    )
      return;
    // One shared sheet: a late event/login response waits until the current dialog closes.
    // The announcement carousel opens for a new event, or once for the unseen map slide.
    if (
      (eventKey && !promptedFor.has(eventKey)) ||
      (!mapAnnouncementSeen(id) && !promptedFor.has(mapKey))
    ) {
      if (eventKey) promptedFor.add(eventKey);
      promptedFor.add(mapKey);
      useHud.getState().setSheet("pahlawan-event");
    } else if (
      loginKey &&
      login?.enabled &&
      !login.claimedToday &&
      !login.budgetExhausted &&
      !promptedFor.has(loginKey)
    ) {
      promptedFor.add(loginKey);
      useHud.getState().setSheet("daily-login");
    }
  }, [id, playing, sceneReady, event, login, sheet, panels, overlay, talking, dungeon, mode]);
  useEffect(() => {
    if (!id || !playing || !login?.resetAt) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadDailyLogin();
    };
    const timer = window.setTimeout(refresh, Math.max(100, login.resetAt - Date.now() + 150));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [id, playing, login?.resetAt]);
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
