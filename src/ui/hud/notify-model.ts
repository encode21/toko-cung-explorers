export interface NotifyBill {
  amount: number;
  owedDays: number;
}
export interface NotifyChat {
  id: string;
  name: string;
  preview: string;
  /** Message time, epoch ms. */
  at: number;
}
export interface Dismissed {
  bill?: { key: string; at: number };
  /** Chat id -> timestamp of the newest message that was dismissed. */
  chats: Record<string, number>;
}
export type NotifyCard =
  { kind: "bill"; key: string; bill: NotifyBill } | { kind: "chat"; key: string; chat: NotifyChat };

export const BILL_SNOOZE_MS = 6 * 3600_000;
/** Older messages are history, not news. */
export const CHAT_FRESH_MS = 10 * 60_000;
export const MAX_CARDS = 2;

export const billKey = (b: NotifyBill) => `${b.amount}|${b.owedDays}`;

export function visibleCards(input: {
  bill: NotifyBill | null;
  chats: NotifyChat[];
  dismissed: Dismissed;
  now: number;
  /** Currently open phone app/sheet; its own card is hidden. */
  sheet: string | null;
}): NotifyCard[] {
  const { bill, chats, dismissed, now, sheet } = input;
  const cards: NotifyCard[] = [];
  const d = dismissed.bill;
  if (
    bill &&
    bill.owedDays > 0 &&
    sheet !== "cngbank" &&
    !(d && d.key === billKey(bill) && now - d.at < BILL_SNOOZE_MS)
  )
    cards.push({ kind: "bill", key: "bill", bill });
  if (sheet !== "cungchat")
    for (const chat of [...chats].sort((a, b) => b.at - a.at))
      if (now - chat.at <= CHAT_FRESH_MS && chat.at > (dismissed.chats[chat.id] ?? 0))
        cards.push({ kind: "chat", key: `chat-${chat.id}`, chat });
  return cards.slice(0, MAX_CARDS);
}
