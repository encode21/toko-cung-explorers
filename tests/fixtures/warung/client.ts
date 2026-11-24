import type {
  OrderLine,
  PublicWarung,
  WarungShipment,
  WarungSnapshot,
  WarungStock,
} from "@/game/warung/model";
import type { DecorPlacement } from "@/game/warung/decor";
import { DECOR_DEFAULT_INSTANCES, validateDecorPlacement } from "@/game/warung/decor-placement";
import { createDirectory, createLeaderboard, createSnapshot, createVisit } from "./data";

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
let failNextDirectory = false;
let failNextVisit = false;
let failNextEvent = false;
let failNextDecor = false;
let failNextDecorPlace = false;
let failNextUnload = false;
let emptyCommunity = false;
const receipts = new Map<string, unknown>();
export const requests: { operation: string; action: unknown }[] = [];

export function resetTransport(state: string) {
  snapshot = createSnapshot(state);
  visit = createVisit(snapshot);
  failNextSale = state === "retry";
  failNextRestock = state === "tokocung-retry";
  failNextDirectory = state === "community-error";
  failNextVisit = state === "community-visit-retry";
  failNextEvent = state === "story-retry";
  failNextDecor = state === "decor-retry";
  failNextDecorPlace = state === "decor-place-retry";
  failNextUnload = state === "delivery-retry";
  emptyCommunity = state === "community-empty";
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

/** Deliver each order once, then remove it so polling cannot duplicate rack stock. */
function receiveShipments(shipments: WarungShipment[]) {
  const stock = snapshot.warung!.stock;
  for (const shipment of shipments) {
    for (const line of shipment.items) {
      const item = stock.find((item) => item.itemId === line.itemId);
      if (item) item.qty += line.qty;
      else {
        const product = snapshot.catalog.find((item) => item.id === line.itemId)!;
        stock.push({ itemId: line.itemId, qty: line.qty, price: product.market });
      }
    }
  }
  const deliveredIds = new Set(shipments.map((shipment) => shipment.id));
  snapshot.shipments = (snapshot.shipments ?? []).filter(
    (shipment) => !deliveredIds.has(shipment.id),
  );
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
  if (action === "read") {
    receiveShipments(
      (snapshot.shipments ?? []).filter(
        (shipment) =>
          shipment.mode === "antar" &&
          shipment.etaAt !== null &&
          Date.parse(shipment.etaAt) <= Date.now(),
      ),
    );
    response = snapshot;
  } else if (action === "event") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const event = snapshot.event;
    if (!event || event.id !== Number(data["eventId"]))
      throw new WorldApiError(409, "Permintaan pelanggan sudah tidak tersedia.");
    const choice = data["choice"];
    if (choice !== "accept" && choice !== "decline")
      throw new WorldApiError(400, "Pilih terima atau tolak permintaan pelanggan.");
    if (failNextEvent) {
      failNextEvent = false;
      throw new WorldApiError(503, "Koneksi terputus. Jawaban belum tersimpan. Coba lagi.");
    }
    if (choice === "accept") {
      sell(snapshot.warung!.stock, event.items);
      snapshot.debts.push({
        id: event.id,
        npc: event.npc,
        amount: event.amount,
        dueAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      });
    }
    snapshot.event = null;
    response = snapshot;
  } else if (action === "serve") {
    const revenue = sell(snapshot.warung!.stock, data["items"] as OrderLine[]);
    snapshot.warung!.cash += Math.round(revenue * (data["fast"] ? 1.1 : 1));
    snapshot.warung!.totalSales += revenue;
    response = snapshot;
  } else if (action === "work") {
    const revenue = sell(visit.stock, data["items"] as OrderLine[]);
    const wage = Math.round(revenue * 0.1);
    snapshot.savings += wage;
    response = {
      visit,
      warung: snapshot.warung,
      wage,
      savings: snapshot.savings,
    };
  } else if (action === "visit") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (failNextVisit) {
      failNextVisit = false;
      throw new WorldApiError(503, "Warung belum dapat dikunjungi. Coba lagi.");
    }
    const id = Number(data["warungId"]);
    if (!createDirectory(snapshot).top.some((card) => card.id === id))
      throw new WorldApiError(404, "Warung tidak ditemukan.");
    if (visit.id !== id || id === snapshot.warung?.id) visit = createVisit(snapshot, id);
    response = { visit, warung: snapshot.warung };
  } else if (action === "buy") {
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
  } else if (action === "pickup" || action === "unload") {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const shipments = (snapshot.shipments ?? []).filter(
      (shipment) =>
        shipment.mode === "ambil" &&
        shipment.status === (action === "pickup" ? "PENDING" : "CARRYING"),
    );
    if (!shipments.length) throw new WorldApiError(409, "Tidak ada dus yang bisa diterima.");
    if (action === "unload" && failNextUnload) {
      failNextUnload = false;
      throw new WorldApiError(503, "Koneksi terputus. Dus belum diterima. Coba lagi.");
    }
    if (action === "pickup") shipments.forEach((shipment) => (shipment.status = "CARRYING"));
    else receiveShipments(shipments);
    response = snapshot;
  } else if (action === "lots") response = { lots: [], pickups: [] };
  else if (action === "directory") {
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (failNextDirectory) {
      failNextDirectory = false;
      throw new WorldApiError(503, "Daftar warung belum dapat dimuat. Coba lagi.");
    }
    response = createDirectory(snapshot, emptyCommunity);
  } else if (action === "leaderboard") {
    await new Promise((resolve) => setTimeout(resolve, 300));
    response = createLeaderboard(snapshot, emptyCommunity);
  } else if (
    [
      "hours",
      "hire",
      "price",
      "decor_buy",
      "decor_apply",
      "decor_place",
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
    } else if (action === "decor_place") {
      const decorId = data["decorId"];
      const instanceId = data["instanceId"];
      const item = snapshot.decor?.find((item) => item.id === decorId);
      const instance = DECOR_DEFAULT_INSTANCES.find((instance) => instance.id === instanceId);
      if (!item || item.slot !== "extra" || !w.style || !instance || instance.decorId !== decorId)
        throw new WorldApiError(404, "Hiasan tidak ditemukan.");
      if (!w.style.owned.includes(item.id))
        throw new WorldApiError(409, "Beli dekorasi ini terlebih dahulu.");
      if (!w.style.extras.includes(item.id))
        throw new WorldApiError(409, "Pasang hiasan ini terlebih dahulu.");
      const candidate = data["placement"];
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
        throw new WorldApiError(400, "Pilih posisi hiasan yang valid.");
      const placement = candidate as DecorPlacement;
      if (!validateDecorPlacement(instance.id, placement, w.style))
        throw new WorldApiError(409, "Posisi hiasan tidak sesuai atau terhalang.");
      if (failNextDecorPlace) {
        failNextDecorPlace = false;
        throw new WorldApiError(503, "Koneksi terputus. Posisi hiasan belum tersimpan. Coba lagi.");
      }
      // Persist only the accepted position, after every guard/failure has passed.
      w.style.placements = {
        ...w.style.placements,
        [instance.id]: {
          surface: placement.surface,
          x: placement.x,
          y: placement.y,
          z: placement.z,
          rotation: placement.rotation,
        },
      };
    } else if (action === "decor_buy" || action === "decor_apply") {
      const item = snapshot.decor?.find((item) => item.id === data["decorId"]);
      if (!item || !w.style) throw new WorldApiError(404, "Dekorasi tidak ditemukan.");
      const owned = item.price === 0 || w.style.owned.includes(item.id);
      if (action === "decor_buy") {
        if (!owned && w.level < item.level)
          throw new WorldApiError(409, `Dekorasi tersedia mulai Lv. ${item.level}.`);
        if (!owned && w.cash < item.price)
          throw new WorldApiError(409, "Kas belum cukup untuk dekorasi ini.");
        if (failNextDecor) {
          failNextDecor = false;
          throw new WorldApiError(503, "Koneksi terputus. Dekorasi belum dibeli. Coba lagi.");
        }
        if (!owned) {
          w.cash -= item.price;
          w.style.owned.push(item.id);
        }
      } else {
        if (!owned) throw new WorldApiError(409, "Beli dekorasi ini terlebih dahulu.");
        if (item.slot === "extra") {
          if (typeof data["on"] !== "boolean")
            throw new WorldApiError(400, "Pilih pasang atau lepas dekorasi.");
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
