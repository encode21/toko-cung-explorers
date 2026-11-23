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
const receipts = new Map<string, unknown>();
export const requests: { operation: string; action: unknown }[] = [];

export function resetTransport(state: string) {
  snapshot = createSnapshot(state);
  visit = createVisit(snapshot);
  failNextSale = state === "retry";
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
  } else if (action === "lots") response = { lots: [], pickups: [] };
  else if (action === "directory") response = { mineId: snapshot.warung!.id, online: [], top: [] };
  else throw new WorldApiError(400, `Aksi ${action} belum disimulasikan di preview.`);
  if (requestId) receipts.set(requestId, structuredClone(response));
  return structuredClone(response) as T;
}
