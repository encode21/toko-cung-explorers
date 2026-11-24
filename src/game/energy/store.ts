import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { parseEnergy, type Energy } from "./model";

export const useEnergy = create<Energy & { enabled: boolean; sleepChoice: boolean }>(() => ({
  value: 100,
  max: 100,
  tired: false,
  enabled: false,
  sleepChoice: false,
}));
export function clearEnergy() {
  useEnergy.setState({ value: 100, max: 100, tired: false, enabled: false });
}
/** Picks `energy` off any response; announces the first time the player turns tired. */
export function takeEnergy(response: unknown) {
  const e = parseEnergy(response);
  if (!e) return;
  const was = useEnergy.getState().tired;
  useEnergy.setState({ ...e, enabled: true });
  if (e.tired && !was)
    useGame
      .getState()
      .setToast("Badan mulai capek… jalan jadi pelan. Tidur di rumah biar segar lagi.");
}
/** Resolves false only when blocked (409, toasted); a missing endpoint or enabled:false hides the bar and allows. */
export async function energyCommand(
  action: "read" | "spend" | "sleep",
  extra: { kind?: "job_kuli" | "job_petik" | "job_jual" } = {},
) {
  try {
    const r = await worldRequest<{ enabled?: boolean; energy?: Energy }>("energy", {
      action,
      requestId: createId(),
      ...extra,
    });
    if (r.enabled === false) clearEnergy();
    else takeEnergy(r);
    return true;
  } catch (e) {
    if (e instanceof WorldApiError && e.status === 409) {
      useGame.getState().setToast(e.message);
      return false;
    }
    if (e instanceof WorldApiError && e.status === 404) clearEnergy();
    return true;
  }
}
