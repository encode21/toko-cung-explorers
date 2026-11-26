import { create } from "zustand";
import { prologSignupSeen } from "@/ui/hud/announcements";
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
  phoneOpened: boolean;
  registrationPrompt: boolean;
}>(() => ({
  data: null,
  busy: false,
  error: "",
  retry: null,
  presenting: true,
  phoneOpened: false,
  registrationPrompt: false,
}));
let generation = 0;
let refreshPending = false;
export function clearProlog() {
  generation++;
  refreshPending = false;
  useProlog.setState({
    data: null,
    busy: false,
    error: "",
    retry: null,
    presenting: true,
    phoneOpened: false,
    registrationPrompt: false,
  });
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
    useProlog.setState((state) => ({
      data: data.enabled ? data : null,
      retry: null,
      phoneOpened: data.enabled && data.step === "phone" && state.phoneOpened,
      registrationPrompt:
        !!account.guest &&
        data.enabled &&
        data.guest &&
        data.step === "done" &&
        !!data.completedAt &&
        !prologSignupSeen(account.id),
    }));
    if (action !== "state" && data.enabled) void storyCommand("state");
  } catch (e) {
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    // Backend is released first; an older server hides the optional panel cleanly.
    if (e instanceof WorldApiError && e.status === 404) {
      useProlog.setState({
        data: null,
        retry: null,
        phoneOpened: false,
        registrationPrompt: false,
      });
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
