import { useEffect, useState } from "react";
import { useFishing } from "@/game/fishing/store";
import { KULI_TIME_MS } from "@/game/easyjobs/model";
import { loadJobs, tickKuli, useEasyJobs } from "@/game/easyjobs/store";
import { ActivityQuestCards } from "./ActivityQuestCards";

/** Kuli progress only (fruit/fish counts live in the Inventory app); values come from the server. */
export function EasyJobsHud() {
  const [, bump] = useState(0),
    s = useEasyJobs(),
    fishing = useFishing((f) => f.open);
  useEffect(() => void loadJobs(), []);
  useEffect(() => {
    if (!s.kuli) return;
    const t = setInterval(() => (tickKuli(), bump((n) => n + 1)), 1000);
    return () => clearInterval(t);
  }, [s.kuli]);
  if (fishing) return null;
  const left = s.kuli
    ? Math.max(0, Math.ceil((s.kuli.startedAt + KULI_TIME_MS - Date.now()) / 1000))
    : 0;
  return <ActivityQuestCards seconds={left} />;
}
