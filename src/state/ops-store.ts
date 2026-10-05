import { create } from "zustand";

export type TruckPhase = "away" | "incoming" | "loading" | "leaving";

interface OpsState {
  /** Dus yang sudah ditumpuk Nakama di palet gudang. */
  palletBoxes: number;
  /** Pesanan online yang menunggu dipacking. */
  pendingOrders: number;
  /** Paket yang sudah diserahkan ke kurir hari ini. */
  shipped: number;
  truck: TruckPhase;
  /** Baris aktivitas terakhir untuk HUD. */
  status: string;

  queueOrder: (note?: string) => void;
  startPacking: () => void;
  addPalletBox: () => void;
  takePalletBox: () => void;
  callTruck: () => void;
  setTruck: (phase: TruckPhase) => void;
  shipPackage: () => void;
  setStatus: (s: string) => void;
}

export const useOps = create<OpsState>((set, get) => ({
  palletBoxes: 2,
  pendingOrders: 0,
  shipped: 0,
  truck: "away",
  status: "Nakama gudang sedang menata stok",

  queueOrder: (note) =>
    set((s) => ({
      pendingOrders: s.pendingOrders + 1,
      status: note ?? "Pesanan online baru masuk — menunggu packing",
    })),

  startPacking: () =>
    set((s) => ({
      pendingOrders: Math.max(0, s.pendingOrders - 1),
      status: "Nakama packing menyiapkan pesanan",
    })),

  addPalletBox: () =>
    set((s) => ({
      palletBoxes: Math.min(8, s.palletBoxes + 1),
      status: "Stok dari rak masuk ke palet gudang",
    })),

  takePalletBox: () =>
    set((s) => ({
      palletBoxes: Math.max(0, s.palletBoxes - 1),
      status: "Dus diambil dari palet untuk dipacking",
    })),

  callTruck: () => {
    if (get().truck !== "away") return;
    set({ truck: "incoming", status: "Truk dipanggil — sedang menuju toko" });
  },

  setTruck: (phase) => set({ truck: phase }),

  shipPackage: () =>
    set((s) => ({
      shipped: s.shipped + 1,
      truck: "leaving",
      status: "Paket diserahkan ke kurir, truk jalan",
    })),

  setStatus: (status) => set({ status }),
}));

// Debug hook (dev only): akses simulasi operasional dari console browser.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __ops?: typeof useOps }).__ops = useOps;
}
