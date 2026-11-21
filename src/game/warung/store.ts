import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { createId } from "@/lib/id";
import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useFishing } from "@/game/fishing/store";
import { miniParticipant } from "@/game/minigames/store";
import { useMobility } from "@/game/mobility/store";
import { isMountainPosition } from "@/game/mountain/model";
import { vehicleFor } from "@/game/vehicles/model";
import {
  warungOrigin,
  type MyWarung,
  type OrderLine,
  type PublicWarung,
  type WarungDirectory,
  type WarungSnapshot,
} from "./model";

interface WarungStore {
  data: WarungSnapshot | null;
  directory: WarungDirectory | null;
  /** Warung the player is standing in (own or visited); null = outside. */
  inside: PublicWarung | null;
  /** Where to return to on exit. */
  returnTo: [number, number, number] | null;
  /** Walk-in customer waiting at the counter (own warung only). */
  order: OrderLine[] | null;
  busy: boolean;
  error: string;
}
export const useWarung = create<WarungStore>(() => ({
  data: null,
  directory: null,
  inside: null,
  returnTo: null,
  order: null,
  busy: false,
  error: "",
}));

type VisitResult = { visit: PublicWarung; warung: MyWarung | null };

function asPublic(w: MyWarung, ownerName: string | null): PublicWarung {
  return { ...w, ownerName };
}
export function isOwnWarung() {
  const s = useWarung.getState();
  return !!s.inside && s.inside.id === s.data?.warung?.id;
}

async function run<T>(action: string, extra: Record<string, unknown> = {}): Promise<T | null> {
  if (useWarung.getState().busy) return null;
  useWarung.setState({ busy: true, error: "" });
  try {
    return await worldRequest<T>("warung", { action, ...extra });
  } catch (e) {
    useWarung.setState({
      error: e instanceof Error ? e.message : "Warung sementara tidak tersedia.",
    });
    return null;
  } finally {
    useWarung.setState({ busy: false });
  }
}

/** Owner actions return the owner snapshot; keep the 3D room in sync when standing inside. */
export async function warungCommand(action: string, extra: Record<string, unknown> = {}) {
  const needsId = ["restock", "serve", "upgrade"].includes(action);
  const s = await run<WarungSnapshot>(
    action,
    needsId ? { requestId: createId(), ...extra } : extra,
  );
  if (!s) return null;
  const inside = useWarung.getState().inside;
  useWarung.setState({
    data: s,
    inside:
      inside && s.warung && inside.id === s.warung.id
        ? asPublic(s.warung, inside.ownerName)
        : inside,
  });
  if (s.settled && s.settled.revenue > 0)
    useGame
      .getState()
      .setToast(
        `Selagi kamu pergi, ${Object.values(s.settled.items).reduce((a, b) => a + b, 0)} barang terjual.`,
      );
  return s;
}

export const serveOrder = (items: OrderLine[]) => warungCommand("serve", { items });

export async function loadDirectory() {
  const room = useChannels.getState().lease?.channel;
  const d = await run<WarungDirectory>("directory", room?.startsWith("CHANNEL-") ? { room } : {});
  if (d) useWarung.setState({ directory: d });
}

function teleportInto(w: PublicWarung) {
  const game = useGame.getState();
  const [x, y, z] = warungOrigin(w.id);
  game.setSitting(false);
  useWarung.setState({
    inside: w,
    returnTo: useWarung.getState().returnTo ?? [...game.playerPos],
  });
  useGame.setState({ pendingTeleport: [x, y + 0.83, z + 3] });
}

/** The warung room replaces the city scene, so only enter from plain city walking. */
function blockedReason(): string | null {
  const game = useGame.getState();
  const playerId = useChannels.getState().lease?.playerId;
  if (useDungeon.getState().data?.instance) return "Selesaikan dungeon dulu.";
  if (useClub.getState().inside && !useClub.getState().outdoor) return "Keluar dari club dulu.";
  if (isMountainPosition(game.playerPos[0], game.playerPos[2])) return "Kembali ke kota dulu.";
  if (playerId && vehicleFor(useMobility.getState().vehicles ?? [], playerId))
    return "Turun dari kendaraan dulu.";
  if (miniParticipant() || useFishing.getState().open || game.pendingTeleport)
    return "Selesaikan aktivitasmu dulu.";
  return null;
}

export async function enterWarung(id: number) {
  const blocked = useWarung.getState().inside ? null : blockedReason();
  if (blocked) {
    useGame.getState().setToast(blocked);
    return;
  }
  const mine = useWarung.getState().data?.warung;
  if (mine && mine.id === id) {
    const s = await warungCommand("read");
    if (s?.warung) teleportInto(asPublic(s.warung, "Kamu"));
    return;
  }
  const r = await run<VisitResult>("visit", { warungId: id });
  if (!r) return;
  useWarung.setState((s) => ({ data: s.data ? { ...s.data, warung: r.warung } : s.data }));
  teleportInto(r.visit);
}

export async function buyFromWarung(itemId: string, qty: number, expectedPrice: number) {
  const inside = useWarung.getState().inside;
  if (!inside) return;
  const r = await run<VisitResult>("buy", {
    requestId: createId(),
    warungId: inside.id,
    itemId,
    qty,
    expectedPrice,
  });
  if (!r) {
    // Price changed under us: refresh the rack so the player sees the new price.
    if (useWarung.getState().error.startsWith("Harga berubah")) {
      const v = await run<VisitResult>("visit", { warungId: inside.id });
      if (v) useWarung.setState({ inside: v.visit, error: "Harga berubah. Cek lagi raknya." });
    }
    return;
  }
  useWarung.setState((s) => ({
    inside: r.visit,
    data: s.data ? { ...s.data, warung: r.warung } : s.data,
  }));
  useGame.getState().setToast("Stok masuk ke warungmu.");
}

export function exitWarung() {
  const { returnTo, inside } = useWarung.getState();
  if (!inside) return;
  useWarung.setState({ inside: null, returnTo: null, order: null });
  useGame.setState({ pendingTeleport: returnTo ?? [0, 0.83, 12] });
}

/** Channel change or logout: leave the room without a server call. */
export function resetWarung() {
  if (useWarung.getState().inside) exitWarung();
  useWarung.setState({ directory: null, error: "" });
}
