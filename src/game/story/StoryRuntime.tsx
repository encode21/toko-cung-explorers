import { useEffect } from "react";
import { useAccount } from "@/auth/useSession";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { useOjek } from "@/game/ojek/store";
import { clearStory, storyCommand, useStory } from "./store";

export function StoryRuntime() {
  const account = useAccount((s) => s.user);
  const resetAt = useStory((s) => (s.data?.enabled ? s.data.nextPageAt : null));
  useEffect(() => {
    clearStory();
    if (!account || account.guest) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void storyCommand("state");
    };
    refresh();
    const unsubscribers = [useWarung, useUsaha, useOjek].map((store) =>
      store.subscribe((state, previous) => {
        if (state.data !== previous.data) refresh();
      }),
    );
    window.addEventListener("focus", refresh);
    return () => {
      clearStory();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener("focus", refresh);
    };
  }, [account]);
  useEffect(() => {
    if (!resetAt || Date.parse(resetAt) <= Date.now()) return;
    const timer = window.setTimeout(
      () => void storyCommand("state"),
      Date.parse(resetAt) - Date.now() + 100,
    );
    return () => window.clearTimeout(timer);
  }, [resetAt]);
  return null;
}
