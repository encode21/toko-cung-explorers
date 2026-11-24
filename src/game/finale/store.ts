import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";

/** F8 Final & soft-sell (server WorldFinale::state). */
export type FinaleState =
  | { enabled: false }
  | {
      enabled: true;
      softsell: boolean;
      ready: boolean;
      title: string;
      host: string;
      invitedAt: string | null;
      partyActive: boolean;
      partyEndsAt: string | null;
      partyStarted: boolean;
      completedAt: string | null;
      text: Record<string, string>;
      koperasi: {
        npc: string;
        line: string;
        title: string;
        body: string;
        cta: string;
        dismiss: string;
      } | null;
    };

export const useFinale = create<{ data: FinaleState | null; busy: boolean; error: string }>(
  () => ({ data: null, busy: false, error: "" }),
);

export async function finaleCommand(
  action: "state" | "start" | "claim" | "card",
  extra: { event?: "seen" | "click" | "dismiss" } = {},
) {
  if (useFinale.getState().busy && action !== "card") return;
  useFinale.setState({ busy: action !== "card", error: "" });
  try {
    const data = await worldRequest<FinaleState>("finale", { action, requestId: createId(), ...extra });
    useFinale.setState({ data });
  } catch (e) {
    if (action !== "card") useFinale.setState({ error: e instanceof Error ? e.message : "" });
  } finally {
    useFinale.setState({ busy: false });
  }
}
