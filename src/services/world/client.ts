import type { WorldOperation } from "./contracts";
import { worldApi } from "./api.functions";
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
  const result = await worldApi({ data: { operation, ...(data ? { data } : {}) } });
  if (!result.ok) {
    if (result.status === 401 && operation !== "login" && operation !== "app-handoff") onExpired();
    throw new WorldApiError(result.status, result.message);
  }
  return result.value as unknown as T;
}
