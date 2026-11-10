import { checkpointAt, MOUNTAIN_SUMMIT_ID, MOUNTAIN_ROUTE_VERSION } from "@/game/mountain/model";
import { worldRequest as fixtureRequest } from "../hud/client";
export { onAccountExpired, WorldApiError } from "../hud/client";

let summitRun: { id: string; checkpoint: number; completed: boolean } | null = null;
let summits = 0;

/** Backend transport alone is substituted; all mountain logic and collision are real. */
export async function worldRequest(operation: string, data: unknown) {
  const fixture = window as Window & {
    mountainRequests?: unknown[];
    mountainStepDelayMs?: number;
    mountainSkipNextCpAck?: boolean;
  };
  (fixture.mountainRequests ??= []).push({
    operation,
    data: structuredClone(data),
    at: performance.now(),
  });
  if (operation === "mountain") {
    const request = data as { action: string; runId?: string; position?: [number, number, number] };
    if (request.action === "step" && fixture.mountainStepDelayMs)
      await new Promise((resolve) => setTimeout(resolve, fixture.mountainStepDelayMs));
    if (request.action === "start" && request.runId && summitRun?.id !== request.runId)
      summitRun = { id: request.runId, checkpoint: 0, completed: false };
    if (request.action === "step" && summitRun && !summitRun.completed && request.position) {
      const [x, y, z] = request.position;
      const checkpoint = checkpointAt(x, y - 0.83, z);
      if (checkpoint === summitRun.checkpoint + 1) {
        if (fixture.mountainSkipNextCpAck) fixture.mountainSkipNextCpAck = false;
        else if (checkpoint === MOUNTAIN_SUMMIT_ID) {
          summitRun.completed = true;
          summits++;
        } else summitRun.checkpoint = checkpoint;
      }
    }
    return {
      entries: summits ? [{ rank: 1, playerId: "mountain-qa", name: "Pendaki QA", summits }] : [],
      routeVersion: MOUNTAIN_ROUTE_VERSION,
      ownSummits: summits,
      run: summitRun ? { ...summitRun } : null,
    };
  }
  return fixtureRequest(operation, data);
}
