import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { createId } from "@/lib/id";
import { useMobility } from "@/game/mobility/store";
import { useChannels } from "@/net/channel-store";
import { vehicleFor } from "@/game/vehicles/model";
import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { usahaOrigin, type UsahaKind, type UsahaSnapshot } from "./model";

interface UsahaStore {
  data: UsahaSnapshot | null;
  /** Instance room the player stands in; the city is not rendered meanwhile. */
  inside: UsahaKind | null;
  returnTo: [number, number, number] | null;
  panel: UsahaKind | null;
  busy: boolean;
  error: string;
}

export const useUsaha = create<UsahaStore>(() => ({
  data: null,
  inside: null,
  returnTo: null,
  panel: null,
  busy: false,
  error: "",
}));

const NO_REQUEST_ID = new Set(["read", "harga", "sewa"]);

/** Server-authoritative: every action returns the full snapshot (Kas usaha included). */
export async function usahaCommand(action: string, extra: Record<string, unknown> = {}) {
  if (useUsaha.getState().busy) return null;
  useUsaha.setState({ busy: true, error: "" });
  try {
    const s = await worldRequest<UsahaSnapshot>("usaha", {
      action,
      ...(NO_REQUEST_ID.has(action) ? {} : { requestId: createId() }),
      ...extra,
    });
    useUsaha.setState({ data: s });
    // Kas usaha is the warung wallet: keep the warung HUD balance in sync.
    if (s.kas !== null)
      useWarung.setState((w) =>
        w.data?.warung ? { data: { ...w.data, warung: { ...w.data.warung, cash: s.kas! } } } : {},
      );
    const news = settledNews(s);
    if (news) useGame.getState().setToast(news);
    return s;
  } catch (e) {
    useUsaha.setState({
      error: e instanceof Error ? e.message : "Usaha sementara tidak tersedia.",
    });
    return null;
  } finally {
    useUsaha.setState({ busy: false });
  }
}

function settledNews(s: UsahaSnapshot): string | null {
  const parts: string[] = [];
  const w = s.settled?.warteg;
  if (w?.revenue) parts.push(`🍛 Warteg laku ${rupiah(w.revenue)}`);
  if (w?.wasted) parts.push(`🗑️ ${w.wasted} porsi basi`);
  const k = s.settled?.kos;
  if (k?.income) parts.push(`🏠 Sewa kos masuk ${rupiah(k.income)}`);
  if (k?.left) parts.push(`${k.left} penghuni pindah`);
  return parts.length ? parts.join(" · ") : null;
}

export function openUsahaPanel(kind: UsahaKind) {
  useUsaha.setState({ panel: kind });
  void usahaCommand("read");
}

export function enterUsaha(kind: UsahaKind) {
  const game = useGame.getState();
  const playerId = useChannels.getState().lease?.playerId;
  const blocked =
    useWarung.getState().inside || game.pendingTeleport
      ? "Selesaikan aktivitasmu dulu."
      : playerId && vehicleFor(useMobility.getState().vehicles ?? [], playerId)
        ? "Turun dari kendaraan dulu."
        : null;
  if (blocked) {
    game.setToast(blocked);
    return;
  }
  const [x, y, z] = usahaOrigin(kind);
  game.setSitting(false);
  useUsaha.setState({ inside: kind, returnTo: [...game.playerPos] });
  useGame.setState({ pendingTeleport: [x, y + 0.83, z + 3] });
  void usahaCommand("read");
}

export function exitUsaha() {
  const { returnTo, inside } = useUsaha.getState();
  if (!inside) return;
  useUsaha.setState({ inside: null, returnTo: null, panel: null });
  useGame.setState({ pendingTeleport: returnTo ?? [0, 0.83, 12] });
}

/** Channel change or logout: leave the room without a server call. */
export function resetUsahaRoom() {
  if (useUsaha.getState().inside) exitUsaha();
}
