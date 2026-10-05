import { create } from "zustand";
import { productBySku, type Product } from "@/commerce/products/catalog";
import type { ShelfId } from "@/game/world/layout";
import { useOps } from "@/state/ops-store";

export type Overlay = "none" | "dialogue" | "shelf" | "pos" | "payment" | "success";

export interface CartLine {
  sku: string;
  name: string;
  price: number;
  qty: number;
}

export interface DialogueTurn {
  role: "player" | "npc";
  text: string;
}

export interface NearbyTarget {
  id: string;
  label: string;
  kind: "npc" | "shelf" | "cashier" | "bench" | "player";
}

export interface OrderReceipt {
  id: string;
  method: "QRIS" | "VA";
  total: number;
  paidAt: string;
}

interface GameState {
  overlay: Overlay;
  nearby: NearbyTarget | null;
  cart: CartLine[];
  waypoint: ShelfId | null;
  activeShelf: ShelfId | null;
  activeNpc: string | null;
  dialogue: DialogueTurn[];
  npcThinking: boolean;
  order: OrderReceipt | null;
  toast: string | null;
  playerPos: [number, number, number];
  playerYaw: number;
  inside: boolean;
  /** Sedang duduk di bangku (animasi Sit). */
  sitting: boolean;
  sittingBenchId: string | null;

  setNearby: (t: NearbyTarget | null) => void;
  setSitting: (sitting: boolean, benchId?: string | null) => void;
  interact: () => void;
  /** Aksi sosial ke pemain terdekat: sapa (default F) atau pukul. */
  socialAct: (kind: "wave" | "punch") => void;
  closeOverlay: () => void;
  openPos: () => void;
  setOverlay: (o: Overlay) => void;
  addToCart: (product: Product, qty?: number) => void;
  changeQty: (sku: string, delta: number) => void;
  clearCart: () => void;
  setWaypoint: (id: ShelfId | null) => void;
  pushDialogue: (turn: DialogueTurn) => void;
  setNpcThinking: (v: boolean) => void;
  completeOrder: (receipt: OrderReceipt) => void;
  setToast: (msg: string | null) => void;
  setPlayerPos: (p: [number, number, number], inside: boolean, yaw?: number) => void;
}

export const cartTotal = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.price * l.qty, 0);
export const cartCount = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.qty, 0);

export const useGame = create<GameState>((set, get) => ({
  overlay: "none",
  nearby: null,
  cart: [],
  waypoint: null,
  activeShelf: null,
  activeNpc: null,
  dialogue: [],
  npcThinking: false,
  order: null,
  toast: null,
  playerPos: [0, 0, 12],
  playerYaw: 0,
  inside: false,
  sitting: false,
  sittingBenchId: null,

  setNearby: (t) => {
    const cur = get().nearby;
    if (cur?.id === t?.id && cur?.kind === t?.kind) return;
    set({ nearby: t });
  },

  setSitting: (sitting, benchId = null) =>
    set({ sitting, sittingBenchId: sitting ? benchId : null }),

  interact: () => {
    const { nearby, overlay, sitting, sittingBenchId } = get();
    if (!nearby || overlay !== "none") return;
    if (nearby.kind === "player") {
      get().socialAct("wave");
      return;
    }
    if (nearby.kind === "bench") {
      if (sitting && sittingBenchId === nearby.id) {
        set({ sitting: false, sittingBenchId: null, toast: null });
      } else {
        set({ sitting: true, sittingBenchId: nearby.id, toast: "Duduk di bangku · F untuk berdiri" });
      }
      return;
    }
    if (sitting) set({ sitting: false, sittingBenchId: null });
    if (nearby.kind === "shelf") {
      set({ overlay: "shelf", activeShelf: nearby.id as ShelfId, waypoint: null });
    } else if (nearby.kind === "cashier") {
      set({ overlay: "pos" });
    } else {
      set({ overlay: "dialogue", activeNpc: nearby.id, dialogue: [] });
    }
  },

  socialAct: (kind) => {
    const { nearby, overlay } = get();
    if (!nearby || nearby.kind !== "player" || overlay !== "none") return;
    // Dynamic import menghindari cyclic dep dengan social-actions → useGame.
    void import("@/game/social/social-actions").then(({ performSocialAct }) => {
      performSocialAct(kind, nearby.id, nearby.label);
    });
  },

  closeOverlay: () => set({ overlay: "none", activeShelf: null, activeNpc: null, npcThinking: false }),
  openPos: () => set({ overlay: "pos" }),
  setOverlay: (o) => set({ overlay: o }),

  addToCart: (product, qty = 1) =>
    set((s) => {
      const existing = s.cart.find((l) => l.sku === product.sku);
      const cart = existing
        ? s.cart.map((l) => (l.sku === product.sku ? { ...l, qty: l.qty + qty } : l))
        : [...s.cart, { sku: product.sku, name: product.name, price: product.price, qty }];
      return { cart, toast: `${product.name} masuk keranjang` };
    }),

  changeQty: (sku, delta) =>
    set((s) => ({
      cart: s.cart
        .map((l) => (l.sku === sku ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    })),

  clearCart: () => set({ cart: [] }),
  setWaypoint: (id) => set({ waypoint: id }),
  pushDialogue: (turn) => set((s) => ({ dialogue: [...s.dialogue, turn] })),
  setNpcThinking: (v) => set({ npcThinking: v }),

  completeOrder: (receipt) => {
    useOps.getState().queueOrder(`Order ${receipt.id} masuk — Nakama mulai packing`);
    set({ order: receipt, overlay: "success", cart: [] });
  },
  setToast: (msg) => set({ toast: msg }),
  setPlayerPos: (p, inside, yaw) => set({ playerPos: p, inside, ...(yaw === undefined ? {} : { playerYaw: yaw }) }),
}));

/** Dipakai AI action handler: tambah produk by SKU. */
export function addSkuToCart(sku: string) {
  const p = productBySku(sku);
  if (p) useGame.getState().addToCart(p);
}

// Debug hook (dev only): akses state dunia dari console browser.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __game?: typeof useGame }).__game = useGame;
}
