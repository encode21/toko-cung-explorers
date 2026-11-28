export interface NotifyBill {
  amount: number;
  owedDays: number;
  paidUntil?: string;
}
export interface NotifyChat {
  id: string;
  name: string;
  preview: string;
  at: number;
}
export interface Dismissed {
  bill?: { key: string; at: number };
  chats: Record<string, number>;
}
export type NotifyCard =
  { kind: "bill"; key: string; bill: NotifyBill } | { kind: "chat"; key: string; chat: NotifyChat };

export interface PhoneWorldNotice {
  key: string;
  title: string;
  text: string;
  kind: "town" | "incident";
}

export const BILL_SNOOZE_MS = 6 * 3600_000;
export const CHAT_FRESH_MS = 10 * 60_000;
export const billKey = (b: NotifyBill) => `${b.amount}|${b.owedDays}|${b.paidUntil ?? ""}`;

export function visibleCards(input: {
  bill: NotifyBill | null;
  chats: NotifyChat[];
  dismissed: Dismissed;
  receivedChats?: Record<string, number>;
  now: number;
}): NotifyCard[] {
  const { bill, chats, dismissed, now, receivedChats } = input;
  const cards: NotifyCard[] = [];
  const d = dismissed.bill;
  if (bill && bill.owedDays > 0 && !(d && d.key === billKey(bill) && now - d.at < BILL_SNOOZE_MS))
    cards.push({ kind: "bill", key: "bill", bill });
  const included = new Set<string>();
  for (const chat of [...chats].sort((a, b) => b.at - a.at)) {
    if (included.has(chat.id) || chat.at <= (dismissed.chats[chat.id] ?? 0)) continue;
    if (now - chat.at > CHAT_FRESH_MS && receivedChats?.[chat.id] !== chat.at) continue;
    cards.push({ kind: "chat", key: `chat-${chat.id}`, chat });
    included.add(chat.id);
  }
  return cards;
}
