import { itemLines, rupiah, type WarungItem } from "./model.ts";

/** Warung events that wait for the player to open them (penjaga sales, kurir restocks, debts repaid). */
export interface WarungNotice {
  kind: "sale" | "restock" | "debt" | "pricey" | "renovation";
  /** Events merged into this notice. */
  count: number;
  items: Record<string, number>;
  /** Signed Kas effect: + income, − spending. */
  amount: number;
  /** Debts: who paid most recently. */
  who?: string;
}

/** Merge into the notice of the same kind so a pile-up stays one line per kind. */
export function addNotice(list: WarungNotice[], n: WarungNotice): WarungNotice[] {
  const i = list.findIndex((x) => x.kind === n.kind);
  if (i < 0) return [...list, n];
  const old = list[i]!;
  const items = { ...old.items };
  for (const [id, q] of Object.entries(n.items)) items[id] = (items[id] ?? 0) + q;
  const merged: WarungNotice = {
    ...old,
    count: old.count + n.count,
    items,
    amount: old.amount + n.amount,
  };
  if (n.who) merged.who = n.who;
  return list.map((x, j) => (j === i ? merged : x));
}

// Match keycaps separately so ordinary numbers, # and * remain in prices and messages.
const inboxEmoji =
  /[#*0-9]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\u200D|[\uFE0E\uFE0F\u{E0020}-\u{E007F}])*/gu;

export function inboxText(value: string) {
  return value
    .replace(inboxEmoji, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** "Mi Instan ×4, Kopi ×2, +2 lainnya": the biggest lines first, so a long day stays one line. */
function topItems(items: Record<string, number>, catalog: WarungItem[], max = 3) {
  const lines = Object.entries(items)
    .map(([itemId, qty]) => ({ itemId, qty }))
    .sort((a, b) => b.qty - a.qty);
  const more = lines.length - max;
  return (
    inboxText(itemLines(lines.slice(0, max), catalog)) + (more > 0 ? `, +${more} lainnya` : "")
  );
}

export function noticeLine(n: WarungNotice, catalog: WarungItem[]) {
  const money = `${n.amount < 0 ? "−" : "+"}${rupiah(Math.abs(n.amount))}`;
  const who = inboxText(n.who ?? "");
  if (n.kind === "sale") {
    const pieces = Object.values(n.items).reduce((a, b) => a + b, 0);
    return `Terjual ${pieces} barang · ${topItems(n.items, catalog)} · ${money}`;
  }
  if (n.kind === "restock")
    return `Kurir belanja${n.count > 1 ? ` ${n.count}×` : ""} · ${topItems(n.items, catalog)} · ${money}`;
  if (n.kind === "renovation") return `Renovasi selesai! Warungmu sekarang ${who || "naik level"}.`;
  if (n.kind === "pricey") {
    const names = Object.entries(n.items)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => inboxText(catalog.find((c) => c.id === id)?.name ?? id));
    return `${n.count} pembeli batal beli · ${names.join(", ")} kemahalan`;
  }
  return `${n.count > 1 ? `${n.count} utang lunas` : `${who || "Pelanggan"} melunasi utang`} · ${money}`;
}

/** Per-warung store so unacknowledged notices survive a reload (money itself lives on the server). */
const key = (warungId: number) => `world.warung.notices.${warungId}`;
export function loadNotices(warungId: number): WarungNotice[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(warungId)) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
export function saveNotices(warungId: number, list: WarungNotice[]) {
  try {
    if (list.length) localStorage.setItem(key(warungId), JSON.stringify(list));
    else localStorage.removeItem(key(warungId));
  } catch {
    /* storage unavailable */
  }
}
