import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { markMapAnnouncementSeen } from "@/ui/hud/announcements";
import { useAccount } from "@/auth/useSession";
import { retryIntroCompletion, useIntro } from "@/state/intro-store";
import { useWarung } from "@/game/warung/store";
import { useOjek } from "@/game/ojek/store";
import { useHud } from "@/state/hud-store";
import { clearProlog, prologCommand, useProlog } from "./store";
import { PrologUI } from "./PrologUI";

export function PrologRuntime() {
  const account = useAccount((s) => s.user?.id);
  const seenAt = useIntro((s) => s.seenAt);
  const data = useProlog((s) => s.data);
  useEffect(() => {
    clearProlog();
    if (!account) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void prologCommand("state");
    };
    refresh();
    void retryIntroCompletion();
    const off = [useWarung, useOjek].map((store) =>
      store.subscribe((next, old) => {
        if (next.data !== old.data && !useProlog.getState().data?.completedAt) refresh();
      }),
    );
    window.addEventListener("focus", refresh);
    return () => {
      clearProlog();
      off.forEach((f) => f());
      window.removeEventListener("focus", refresh);
    };
  }, [account, seenAt]);
  const step = data?.step;
  useEffect(() => {
    useProlog.setState({ presenting: true });
    if (step === "map") markMapAnnouncementSeen(useProfile.getState().profile?.id);
    if (step === "book" || step === "finish") useHud.getState().setSheet("notes");
    else if (step === "reveal" || step === "map" || step === "path")
      useHud.getState().setSheet(null);
  }, [step]);
  const interval = data && !data.completedAt ? data.pollSeconds : 0;
  useEffect(() => {
    if (!interval) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void prologCommand("state");
    }, interval * 1000);
    return () => window.clearInterval(timer);
  }, [interval]);
  return <PrologUI />;
}
