import { create } from "zustand";
export type NoticeScope = "daily" | "quests" | "inventory";
type Seen = Record<string, string[]>;
const memory = new Map<string, Seen>();
function load(account: string): Seen {
  if (memory.has(account)) return memory.get(account)!;
  const value: Seen = {};
  try {
    const raw = JSON.parse(localStorage.getItem(`tc-mission-notices-v1:${account}`) ?? "{}");
    if (raw && typeof raw === "object")
      for (const [key, ids] of Object.entries(raw))
        if (Array.isArray(ids))
          value[key] = ids.filter((id): id is string => typeof id === "string");
  } catch {
    /* private storage */
  }
  memory.set(account, value);
  return value;
}
function save(account: string, seen: Seen) {
  memory.set(account, seen);
  try {
    localStorage.setItem(`tc-mission-notices-v1:${account}`, JSON.stringify(seen));
  } catch {
    /* memory fallback */
  }
}
export const useMissionNotices = create(() => ({
  account: "",
  current: { daily: [], quests: [], inventory: [] } as Record<NoticeScope, string[]>,
  unread: { daily: false, quests: false, inventory: false },
}));
export function updateNotices(account: string, updates: Record<NoticeScope, string[] | null>) {
  const current = {} as Record<NoticeScope, string[]>;
  const seen = load(account);
  const unread = { daily: false, quests: false, inventory: false };
  for (const scope of Object.keys(unread) as NoticeScope[]) {
    current[scope] = updates[scope] ?? seen[`current:${scope}`] ?? [];
    seen[`current:${scope}`] = current[scope];
    unread[scope] = current[scope].some((id) => !seen[scope]?.includes(id));
  }
  if (account) save(account, seen);
  useMissionNotices.setState({ account, current, unread });
}
export function markNoticesRead(scope: NoticeScope) {
  const { account, current } = useMissionNotices.getState();
  if (!account) return;
  const seen = load(account);
  seen[scope] = [...new Set([...(seen[scope] ?? []), ...current[scope]])];
  save(account, seen);
  useMissionNotices.setState((s) => ({ unread: { ...s.unread, [scope]: false } }));
}
export function receiptPresented(account: string, id: string) {
  return load(account)["receipts"]?.includes(id) ?? false;
}
export function rememberReceipt(account: string, id: string) {
  const seen = load(account);
  seen["receipts"] = [...new Set([...(seen["receipts"] ?? []), id])];
  save(account, seen);
}
