import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { useAccount } from "@/auth/useSession";
import { storyCommand } from "@/game/story/store";
import type { PrologCommand, PrologData, PrologSnapshot } from "./types";

export const useProlog = create<{
  data: PrologData | null;
  busy: boolean;
  error: string;
  retry: PrologCommand | null;
  presenting: boolean;
}>(() => ({ data: null, busy: false, error: "", retry: null, presenting: true }));
let generation = 0;
let refreshPending = false;
export function clearProlog() {
  generation++;
  refreshPending = false;
  useProlog.setState({ data: null, busy: false, error: "", retry: null, presenting: true });
}

export async function prologCommand(
  action: PrologCommand["action"],
  extra: Partial<PrologCommand> = {},
) {
  const account = useAccount.getState().user;
  if (!account) return;
  if (useProlog.getState().busy) {
    if (action === "state") refreshPending = true;
    return;
  }
  if (useProlog.getState().retry && !extra.requestId) return;
  const ticket = generation;
  const request: PrologCommand = { action, requestId: createId(), ...extra };
  useProlog.setState({ busy: true, error: "" });
  try {
    const data = await worldRequest<PrologSnapshot>("prolog", { ...request });
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    useProlog.setState({ data: data.enabled ? data : null, retry: null });
    if (action !== "state" && data.enabled) void storyCommand("state");
  } catch (e) {
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    // Backend is released first; an older server hides the optional panel cleanly.
    if (e instanceof WorldApiError && e.status === 404) {
      useProlog.setState({ data: null, retry: null });
    } else {
      useProlog.setState({
        error: e instanceof Error ? e.message : "",
        retry: e instanceof WorldApiError && e.status < 500 ? null : request,
      });
    }
  } finally {
    if (ticket === generation && account.id === useAccount.getState().user?.id) {
      useProlog.setState({ busy: false });
      if (refreshPending && !useProlog.getState().retry) {
        refreshPending = false;
        void prologCommand("state");
      }
    }
  }
}
export function retryProlog() {
  const request = useProlog.getState().retry;
  if (request) void prologCommand(request.action, request);
}
