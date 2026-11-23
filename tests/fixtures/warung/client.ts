import type { OrderLine, PublicWarung, WarungSnapshot, WarungStock } from "@/game/warung/model";
import { createSnapshot, createVisit } from "./data";

export class WorldApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function onAccountExpired(_handler: () => void) {}
let snapshot: WarungSnapshot;
let visit: PublicWarung;
let failNextSale = false;
let failNextRestock = false;
const receipts = new Map<string, unknown>();
export const requests: { operation: string; action: unknown }[] = [];

export function resetTransport(state: string) {
  snapshot = createSnapshot(state);
  visit = createVisit(snapshot);
  failNextSale = state === "retry";
  failNextRestock = state === "tokocung-retry";
  receipts.clear();
  requests.length = 0;
  return { snapshot: structuredClone(snapshot), visit: structuredClone(visit) };
}

function sell(stock: WarungStock[], items: OrderLine[]) {
  for (const line of items) {
    if (line.qty <= 0 || (stock.find((item) => item.itemId === line.itemId)?.qty ?? 0) < line.qty)
      throw new WorldApiError(409, "Stok tidak cukup. Pilih barang yang tersedia.");
  }
  let revenue = 0;
  for (const line of items) {
    const item = stock.find((item) => item.itemId === line.itemId)!;
    item.qty -= line.qty;
    revenue += item.price * line.qty;
  }
  return revenue;
}

/** All account/world calls terminate here. Unsupported operations fail, never fall through. */
export async function worldRequest<T>(
  operation: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  requests.push({ operation, action: data["action"] });
  if (operation !== "warung") throw new WorldApiError(400, `Preview tidak mendukung ${operation}.`);
  const action = String(data["action"] ?? "read");
  const requestId = typeof data["requestId"] === "string" ? data["requestId"] : null;
  if (requestId && receipts.has(requestId)) return structuredClone(receipts.get(requestId)) as T;
  if (["serve", "work", "buy"].includes(action)) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (failNextSale) {
      failNextSale = false;
      throw new WorldApiError(503, "Koneksi terputus. Pesanan belum tersimpan. Coba lagi.");
    }
  }
  let response: unknown;
  if (action === "read") response = snapshot;
  else if (action === "serve") {
    const revenue = sell(snapshot.warung!.stock, data["items"] as OrderLine[]);
    snapshot.warung!.cash += Math.round(revenue * (data["fast"] ? 1.1 : 1));
    snapshot.warung!.totalSales += revenue;
    response = snapshot;
  } else if (action === "work") {
    const revenue = sell(visit.stock, data["items"] as OrderLine[]);
    const wage = Math.round(revenue * 0.1);
    snapshot.savings += wage;
    response = { visit, warung: snapshot.warung, wage, savings: snapshot.savings };
  } else if (action === "visit") response = { visit, warung: snapshot.warung };
  else if (action === "buy") {
    const itemId = String(data["itemId"]);
    const qty = Number(data["qty"]);
    sell(visit.stock, [{ itemId, qty }]);
    const owned = snapshot.warung!.stock.find((item) => item.itemId === itemId)!;
    owned.qty += qty;
    snapshot.warung!.cash -= owned.price * qty;
    response = { visit, warung: snapshot.warung };
  } else if (action === "kulakan") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const w = snapshot.warung!;
    const rawItems = data["items"];
    const mode = data["delivery"];
    if (!Array.isArray(rawItems) || !rawItems.length)
      throw new WorldApiError(400, "Keranjang masih kosong.");
    if (mode !== "antar" && mode !== "ambil")
      throw new WorldApiError(400, "Pilih cara pengiriman.");
    const quantities = new Map<string, number>();
    for (const raw of rawItems) {
      const line = raw as Partial<OrderLine> | null;
      if (
        !line ||
        typeof line.itemId !== "string" ||
        !Number.isInteger(line.qty) ||
        Number(line.qty) < 1 ||
        Number(line.qty) > 999
      )
        throw new WorldApiError(400, "Jumlah barang harus 1–999 pcs.");
      quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + Number(line.qty));
    }
    const items = [...quantities].map(([itemId, qty]) => ({ itemId, qty }));
    let total = 0;
    for (const line of items) {
      const product = snapshot.catalog.find((item) => item.id === line.itemId);
      if (!product) throw new WorldApiError(404, "Barang tidak ditemukan.");
      if (product.level > w.level)
        throw new WorldApiError(409, `Barang tersedia mulai Lv. ${product.level}.`);
      const have = w.stock.find((item) => item.itemId === line.itemId)?.qty ?? 0;
      const incoming = (snapshot.shipments ?? []).reduce(
        (sum, shipment) =>
          sum +
          shipment.items.reduce(
            (qty, item) => qty + (item.itemId === line.itemId ? item.qty : 0),
            0,
          ),
        0,
      );
      if (line.qty > 999 || have + incoming + line.qty > w.maxStock)
        throw new WorldApiError(409, `Rak ${product.name} tidak cukup. Kurangi jumlah pesanan.`);
      total += product.wholesale * line.qty;
    }
    // Same display rule as deliveryFee: 5%, minimum Rp3.000, rounded up to Rp500.
    const fee = mode === "antar" ? Math.ceil(Math.max(3000, total * 0.05) / 500) * 500 : 0;
    if (w.cash < total + fee)
      throw new WorldApiError(409, "Kas belum cukup untuk barang dan ongkir.");
    if (failNextRestock) {
      failNextRestock = false;
      throw new WorldApiError(503, "Koneksi terputus. Pesanan belum tersimpan. Coba lagi.");
    }
    w.cash -= total + fee;
    snapshot.shipments ??= [];
    snapshot.shipments.push({
      id: snapshot.shipments.length + 1,
      mode,
      status: "PENDING",
      boxes: Math.max(1, Math.ceil(items.reduce((sum, item) => sum + item.qty, 0) / 10)),
      fee,
      items,
      etaAt: mode === "antar" ? new Date(Date.now() + 60_000).toISOString() : null,
    });
    response = snapshot;
  } else if (action === "lots") response = { lots: [], pickups: [] };
  else if (action === "directory") response = { mineId: snapshot.warung!.id, online: [], top: [] };
  else if (action === "leaderboard") {
    const mine = snapshot.warung!;
    const row = {
      rank: 1,
      id: mine.id,
      name: mine.name,
      ownerName: "Kamu",
      level: mine.level,
      levelName: mine.levelName,
      npc: mine.totalSales,
      player: 0,
      total: mine.totalSales,
    };
    response = { since: "2026-11-23T00:00:00+07:00", top: [row], me: row };
  } else if (
    [
      "hours",
      "hire",
      "price",
      "decor_buy",
      "decor_apply",
      "pay_rent",
      "rent_bargain",
      "upgrade",
    ].includes(action)
  ) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const w = snapshot.warung!;
    if (action === "hours") {
      w.openHour = Number(data["openHour"]);
      w.closeHour = Number(data["closeHour"]);
    } else if (action === "hire") w.hiring = Boolean(data["hiring"]);
    else if (action === "price") {
      const item = w.stock.find((item) => item.itemId === data["itemId"]);
      if (!item) throw new WorldApiError(404, "Barang tidak ditemukan.");
      item.price = Number(data["price"]);
    } else if (action === "decor_buy" || action === "decor_apply") {
      const item = snapshot.decor?.find((item) => item.id === data["decorId"]);
      if (!item || !w.style) throw new WorldApiError(404, "Dekorasi tidak ditemukan.");
      const owned = item.price === 0 || w.style.owned.includes(item.id);
      if (action === "decor_buy") {
        if (!owned && (w.level < item.level || w.cash < item.price))
          throw new WorldApiError(409, "Level atau kas belum cukup untuk dekorasi ini.");
        if (!owned) {
          w.cash -= item.price;
          w.style.owned.push(item.id);
        }
      } else {
        if (!owned) throw new WorldApiError(409, "Beli dekorasi ini terlebih dahulu.");
        if (item.slot === "extra") {
          w.style.extras = w.style.extras.filter((id) => id !== item.id);
          if (data["on"]) w.style.extras.push(item.id);
        } else w.style[item.slot] = item.id;
      }
    } else if (action === "pay_rent" || action === "rent_bargain") {
      if (snapshot.rent) {
        const amount = action === "pay_rent" ? snapshot.rent.owed : 0;
        if (w.cash < amount) throw new WorldApiError(409, "Kas belum cukup untuk membayar sewa.");
        w.cash -= amount;
        snapshot.rent.owed = 0;
        snapshot.rent.owedDays = 0;
        snapshot.rent.sealed = false;
        snapshot.rent.canBargain = false;
      }
    } else if (action === "upgrade") {
      if (w.nextUpgradeCost === null || w.cash < w.nextUpgradeCost)
        throw new WorldApiError(409, "Kas belum cukup untuk naik level.");
      w.cash -= w.nextUpgradeCost;
      w.level += 1;
      const next = snapshot.levels[String(w.level)];
      w.levelName = next?.name ?? w.levelName;
      w.maxStock = next?.maxStock ?? w.maxStock;
      w.nextUpgradeCost = null;
    }
    response = snapshot;
  } else throw new WorldApiError(400, `Aksi ${action} belum disimulasikan di preview.`);
  if (requestId) receipts.set(requestId, structuredClone(response));
  return structuredClone(response) as T;
}
