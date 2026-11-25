import { createSnapshot } from "../warung/data";
import { fishingRequest } from "../fishing/client";
import { worldRequest as fixtureRequest } from "../hud/client";
export { onAccountExpired, WorldApiError } from "../hud/client";

/** Transport only is replaced; movement, collision, progression and UI remain production code. */
export async function worldRequest(operation: string, data: unknown) {
  const qa = window as any;
  (qa.obbyRequests ??= []).push({ operation, data: structuredClone(data) });
  if (operation === "warung" && new URLSearchParams(location.search).has("warung-delivery")) {
    const snapshot = createSnapshot("waiting");
    snapshot.warung!.id = 37;
    snapshot.warung!.truckEta = qa.deliveryEta ??= Date.now()+15000;
    return snapshot;
  }
  if (operation === "fishing") return fishingRequest(data);
  return fixtureRequest(operation, data);
}
