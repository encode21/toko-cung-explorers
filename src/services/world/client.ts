import type { WorldOperation } from "./contracts";
import { worldApi } from "./api.functions";
import { UNREACHABLE_MESSAGE } from "./gateway-http";
export class WorldApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let onExpired = () => {};
export function onAccountExpired(handler: () => void) {
  onExpired = handler;
}
export async function worldRequest<T>(
  operation: WorldOperation,
  data?: Record<string, unknown>,
): Promise<T> {
  let result: Awaited<ReturnType<typeof worldApi>>;
  try {
    result = await worldApi({ data: { operation, ...(data ? { data } : {}) } });
  } catch (e) {
    // Network/server-function failures carry raw internals (URLs, stacks); keep them in the console.
    if (import.meta.env.DEV) console.error("[world-api]", operation, e);
    throw new WorldApiError(503, UNREACHABLE_MESSAGE);
  }
  if (!result.ok) {
    if (
      result.status === 401 &&
      operation !== "login" &&
      operation !== "app-handoff" &&
      operation !== "guest"
    )
      onExpired();
    throw new WorldApiError(result.status, result.message);
  }
  return result.value as unknown as T;
}
