import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAccount } from "@/auth/useSession";
import { useStaff } from "@/game/staff/store";
import { rupiah, type WarungItem } from "@/game/warung/model";
import type { WarungNotice } from "@/game/warung/notices";
import { ackNotices, useWarung } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import {
  BILL_SNOOZE_MS,
  CHAT_FRESH_MS,
  billKey,
  visibleCards,
  type Dismissed,
  type NotifyChat,
} from "./notify-model";

interface Receipt {
  dismissed: Dismissed;
  receivedChats: Record<string, number>;
  seen: string[];
}

const EMPTY: Receipt = { dismissed: { chats: {} }, receivedChats: {}, seen: [] };
const NO_NOTICES: WarungNotice[] = [];
const NO_CATALOG: WarungItem[] = [];
const receipts = new Map<string, Receipt>();
const listeners = new Set<() => void>();
const storageKey = (scope: string) => `world.phone.inbox.${scope}`;

function read(scope: string) {
  if (!scope) return EMPTY;
  const cached = receipts.get(scope);
  if (cached) return cached;
  let receipt = EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(scope)) ?? "null") as Receipt | null;
    if (raw?.dismissed?.chats && raw.receivedChats && Array.isArray(raw.seen)) receipt = raw;
  } catch {
    // A blocked or unavailable cache leaves the inbox usable in memory.
  }
  receipts.set(scope, receipt);
  return receipt;
}

function update(scope: string, change: (current: Receipt) => Receipt) {
  if (!scope) return;
  const previous = read(scope);
  const next = change(previous);
  if (next === previous) return;
  receipts.set(scope, next);
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // Other HUD surfaces still see the in-memory receipt.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const noticeKey = (n: WarungNotice) =>
  JSON.stringify([
    "warung",
    n.kind,
    n.count,
    n.amount,
    n.who,
    Object.entries(n.items).sort(([a], [b]) => a.localeCompare(b)),
  ]);

export function usePhoneNotices() {
  const accountId = useAccount((s) => s.user?.id);
  const warungId = useWarung((s) => s.data?.warung?.id);
  const accountKey = accountId ? `account:${accountId}` : warungId ? `warung:${warungId}` : "";
  const receipt = useSyncExternalStore(
    subscribe,
    () => read(accountKey),
    () => EMPTY,
  );
  const notices = useWarung((s) => (s.data?.warung ? s.notices : NO_NOTICES));
  const catalog = useWarung((s) => s.data?.catalog ?? NO_CATALOG);
  const rent = useWarung((s) => (s.data?.warung ? s.data.rent : null));
  const debts = useWarung((s) => s.data?.debts);
  const staff = useStaff((s) => s.data?.messages);
  const inboxOpen = useHud((s) => s.sheet === "feed" && s.feedTab === "inbox");

  const chats = useMemo(() => {
    const out: NotifyChat[] = [];
    for (const m of staff ?? [])
      out.push({ id: `staff-${m.name}`, name: m.name, preview: m.text, at: Date.parse(m.at) });
    for (const d of debts ?? [])
      if (d.lastRemindedAt)
        out.push({
          id: `debt-${d.id}`,
          name: d.npc,
          preview: `Utang ${rupiah(d.amount)} · Ketuk untuk menagih`,
          at: Date.parse(d.lastRemindedAt),
        });
    return out.filter((c) => Number.isFinite(c.at));
  }, [staff, debts]);

  // Admit recent messages once. A visit to the inbox can then wait longer than the old banner's freshness window.
  useEffect(() => {
    const cutoff = Date.now() - CHAT_FRESH_MS;
    update(accountKey, (current) => {
      const receivedChats = { ...current.receivedChats };
      let changed = false;
      for (const chat of chats) {
        if (
          chat.at >= cutoff &&
          chat.at > (current.dismissed.chats[chat.id] ?? 0) &&
          chat.at > (receivedChats[chat.id] ?? 0)
        ) {
          receivedChats[chat.id] = chat.at;
          changed = true;
        }
      }
      return changed ? { ...current, receivedChats } : current;
    });
  }, [accountKey, chats]);

  // Honor reminders postponed before the inbox switched to the single payment action.
  const [wokeAt, setWokeAt] = useState(0);
  useEffect(() => {
    if (!receipt.dismissed.bill) return;
    const delay = receipt.dismissed.bill.at + BILL_SNOOZE_MS - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setWokeAt(Date.now()), delay + 1);
    return () => window.clearTimeout(timer);
  }, [receipt.dismissed.bill]);

  const cards = useMemo(
    () =>
      visibleCards({
        bill:
          rent && rent.owedDays > 0
            ? { amount: rent.owed, owedDays: rent.owedDays, paidUntil: rent.paidUntil }
            : null,
        chats,
        dismissed: receipt.dismissed,
        receivedChats: receipt.receivedChats,
        now: Math.max(Date.now(), wokeAt),
      }),
    [rent, chats, receipt.dismissed, receipt.receivedChats, wokeAt],
  );
  const noticeKeys = useMemo(
    () => [
      ...notices.map(noticeKey),
      ...cards.map((card) =>
        card.kind === "chat"
          ? `${card.key}:${card.chat.at}`
          : `bill:${billKey(card.bill)}:${receipt.dismissed.bill?.key === billKey(card.bill) ? receipt.dismissed.bill.at : 0}`,
      ),
    ],
    [notices, cards, receipt.dismissed.bill],
  );
  const unreadKeys = useMemo(
    () => noticeKeys.filter((key) => !receipt.seen.includes(key)),
    [noticeKeys, receipt.seen],
  );

  useEffect(() => {
    if (inboxOpen && unreadKeys.length) {
      update(accountKey, (current) =>
        noticeKeys.every((key) => current.seen.includes(key))
          ? current
          : { ...current, seen: noticeKeys },
      );
    }
  }, [inboxOpen, accountKey, noticeKeys, unreadKeys]);

  const dismissChat = (chat: NotifyChat) =>
    update(accountKey, (current) => {
      const receivedChats = { ...current.receivedChats };
      if ((receivedChats[chat.id] ?? 0) <= chat.at) delete receivedChats[chat.id];
      return {
        ...current,
        receivedChats,
        dismissed: {
          ...current.dismissed,
          chats: {
            ...current.dismissed.chats,
            [chat.id]: Math.max(chat.at, current.dismissed.chats[chat.id] ?? 0),
          },
        },
      };
    });

  const acknowledgeNotices = () => {
    ackNotices();
    const cleared = new Set(notices.map(noticeKey));
    update(accountKey, (current) => ({
      ...current,
      seen: current.seen.filter((key) => !cleared.has(key)),
    }));
  };

  return {
    accountKey,
    notices,
    catalog,
    cards,
    noticeKeys,
    unreadKeys,
    pendingCount: Number(notices.length > 0) + cards.length,
    dismissChat,
    acknowledgeNotices,
  };
}
