import { create } from "zustand";
import { worldRequest } from "@/services/world/client";

interface IntroState {
  accountId: string | null;
  seenAt: string | null;
  dismissed: boolean;
  pending: boolean;
}
export const useIntro = create<IntroState>(() => ({
  accountId: null,
  seenAt: null,
  dismissed: false,
  pending: false,
}));
const key = (id: string) => `tc-intro-pending:${id}`;
function pendingFor(id: string) {
  try {
    return localStorage.getItem(key(id)) === "1";
  } catch {
    return false;
  }
}
export function hydrateIntro(id: string, seenAt: string | null) {
  const old = useIntro.getState();
  // An older /me response must not undo a completion acknowledged in this tab.
  seenAt ??= old.accountId === id ? old.seenAt : null;
  const pending = !seenAt && ((old.accountId === id && old.pending) || pendingFor(id));
  useIntro.setState({ accountId: id, seenAt, pending, dismissed: !!seenAt || pending });
  if (seenAt) {
    try {
      localStorage.removeItem(key(id));
    } catch {
      /* private browsing */
    }
  }
}
export function clearIntro() {
  useIntro.setState({ accountId: null, seenAt: null, dismissed: false, pending: false });
}
const requests = new Map<string, Promise<void>>();
export function retryIntroCompletion(): Promise<void> {
  const { accountId, pending } = useIntro.getState();
  if (!accountId || !pending) return Promise.resolve();
  if (requests.has(accountId)) return requests.get(accountId)!;
  const request = worldRequest<{ introSeenAt: string }>("intro-complete")
    .then(({ introSeenAt }) => {
      try {
        localStorage.removeItem(key(accountId));
      } catch {
        /* storage unavailable */
      }
      if (useIntro.getState().accountId === accountId)
        useIntro.setState({ seenAt: introSeenAt, pending: false });
    })
    .catch(() => {
      /* Retry while this account is active; never block entry. */
    })
    .finally(() => {
      requests.delete(accountId);
    });
  requests.set(accountId, request);
  return request;
}
export function completeIntro() {
  const { accountId } = useIntro.getState();
  if (!accountId) return;
  try {
    localStorage.setItem(key(accountId), "1");
  } catch {
    /* memory retry remains */
  }
  useIntro.setState({ dismissed: true, pending: true });
  void retryIntroCompletion();
}
