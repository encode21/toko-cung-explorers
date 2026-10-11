import type { PickupRun, WorldEvent } from "./model";
/** Pure handoff-safe state machine; the existing vehicle owns driving and parking. */
export function stepPickup(
  run: PickupRun | null,
  event: WorldEvent | undefined,
  truck: string,
  packingBusy: boolean,
  courierAt: string,
  now: number,
): { run: PickupRun | null; truck?: "incoming" | "leaving" } {
  if (!run || run.stage === "done") {
    if (event && event.id !== run?.eventId && truck === "away" && !packingBusy)
      return { run: { eventId: event.id, stage: "incoming", stageAt: now }, truck: "incoming" };
    return { run };
  }
  const stage = (s: PickupRun["stage"]) => ({ ...run, stage: s, stageAt: now });
  if (run.stage === "incoming" && truck === "loading") return { run: stage("pickup") };
  if (run.stage === "pickup" && courierAt === "pickup" && now - run.stageAt >= 8000)
    return { run: stage("returning") };
  if (run.stage === "returning" && courierAt === "returning" && now - run.stageAt >= 2000)
    return { run: stage("leaving"), truck: "leaving" };
  if (run.stage === "leaving" && truck === "away") return { run: stage("done") };
  return { run };
}
