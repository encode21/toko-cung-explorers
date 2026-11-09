import { worldRequest as fixtureRequest } from "../hud/client";
export { onAccountExpired, WorldApiError } from "../hud/client";

/** Backend transport alone is substituted; all mountain logic and collision are real. */
export async function worldRequest(operation: string, data: unknown) {
  const fixture = window as Window & { mountainRequests?: unknown[] };
  (fixture.mountainRequests ??= []).push({ operation, data: structuredClone(data) });
  return fixtureRequest(operation, data);
}
