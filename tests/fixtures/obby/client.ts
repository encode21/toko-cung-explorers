import { createSnapshot } from "../warung/data";
import { fishingRequest } from "../fishing/client";
import { worldRequest as fixtureRequest } from "../hud/client";
export { onAccountExpired, WorldApiError } from "../hud/client";

/** Transport only is replaced; movement, collision, progression and UI remain production code. */
export async function worldRequest(operation: string, data: unknown) {
  const qa = window as any;
  (qa.obbyRequests ??= []).push({ operation, data: structuredClone(data) });
  if (operation === "warung" && new URLSearchParams(location.search).has("warung-delivery")) {
    const action = (data as { action?: string })?.action ?? "read";
    if (action === "personas") return { personas: {}, order: [] };
    const snapshot = createSnapshot("waiting");
    snapshot.warung!.id = 37;
    const eta = qa.deliveryEta ??= Date.now()+15000;
    snapshot.warung!.truckEta = eta;
    snapshot.warung!.deliveryTrips = [{ id: 37, warungId: 37, gang: 1, house: 1, departAt: eta-150000, etaAt: eta, returnAt: eta+135000 }];
    if (action === "deliveries") return { deliveryTrips: snapshot.warung!.deliveryTrips };
    return snapshot;
  }
  if (operation === "fishing") return fishingRequest(data);
  return fixtureRequest(operation, data);
}
