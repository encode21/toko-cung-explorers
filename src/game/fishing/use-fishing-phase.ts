import { useEffect, useState } from "react";
import { catchRevealing, fishingPhase } from "./model";
import { fishingNow, useFishing } from "./store";

export function useFishingPhase() {
  const { open, data, revealStarted } = useFishing();
  const [now, setNow] = useState(fishingNow);
  useEffect(() => {
    if (!open) return;
    setNow(fishingNow());
    const timer = setInterval(() => setNow(fishingNow()), 60);
    return () => clearInterval(timer);
  }, [open, data]);
  return {
    now,
    phase: fishingPhase(data?.cast ?? null, now),
    revealing: catchRevealing(revealStarted, performance.now()),
  };
}
