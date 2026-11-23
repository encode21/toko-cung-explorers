import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { useAccount } from "@/auth/useSession";
import { useGameCore } from "@/game/core/store";
import { useWardrobe } from "@/identity/wardrobe-store";
import type { StoryCommand, StorySnapshot } from "./types";

export const useStory = create<{
  data: StorySnapshot | null;
  busy: boolean;
  error: string;
  retry: StoryCommand | null;
}>(() => ({ data: null, busy: false, error: "", retry: null }));

let generation = 0;
let refreshPending = false;
export function clearStory() {
  generation++;
  refreshPending = false;
  useStory.setState({ data: null, busy: false, error: "", retry: null });
}

export async function storyCommand(
  action: StoryCommand["action"],
  extra: Omit<Partial<StoryCommand>, "action"> = {},
) {
  const account = useAccount.getState().user;
  if (!account) return;
  if (useStory.getState().busy) {
    if (action === "state") refreshPending = true;
    return;
  }
  // Resolve an ambiguous write with its original requestId before allowing another command.
  if (useStory.getState().retry && !extra.requestId) return;
  const ticket = generation;
  const request = { action, requestId: createId(), ...extra };
  useStory.setState({ busy: true, error: "" });
  try {
    const data = await worldRequest<StorySnapshot>("story", request);
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    useStory.setState({ data, retry: null });
    if (data.enabled) {
      useGameCore.setState((s) =>
        s.snapshot
          ? {
              snapshot: { ...s.snapshot, profile: { ...s.snapshot.profile, ...data.profile } },
            }
          : {},
      );
      const earned = data.sections.filter((s) => s.completedAt).map((s) => s.cosmetic.id);
      if (useWardrobe.getState().account === account.id) {
        useWardrobe.setState((s) => ({ owned: [...new Set([...s.owned, ...earned])] }));
      }
    }
  } catch (e) {
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    useStory.setState({
      error: e instanceof Error ? e.message : "Buku Mbah belum tersedia.",
      retry: e instanceof WorldApiError && e.status >= 400 && e.status < 500 ? null : request,
    });
  } finally {
    if (ticket === generation && account.id === useAccount.getState().user?.id) {
      useStory.setState({ busy: false });
      if (refreshPending && !useStory.getState().retry) {
        refreshPending = false;
        void storyCommand("state");
      }
    }
  }
}

export function retryStory() {
  const request = useStory.getState().retry;
  if (request) void storyCommand(request.action, request);
}
