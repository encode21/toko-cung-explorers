import { worldRequest as hudRequest } from "../hud/client";
import { worldRequest as warungRequest } from "../warung/client";
export { WorldApiError, onAccountExpired } from "../warung/client";

/** Entirely offline transport: preserve real UI and purchasing actions. */
export async function worldRequest<T>(
  operation: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  if (operation === "warung") {
    const delay = (window as Window & { grosirCheckoutDelay?: number }).grosirCheckoutDelay;
    if (data["action"] === "kulakan" && delay)
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    return warungRequest<T>(operation, data);
  }
  return hudRequest(operation, data) as Promise<T>;
}
