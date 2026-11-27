import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { createId } from "@/lib/id";
import { useGame } from "@/state/game-store";
import { mobilityCommand, useMobility } from "@/game/mobility/store";
import type { ShowroomModel } from "@/game/showroom/models";
import { isShowroomRoom } from "@/game/showroom/layout";

export type GarasiKind = "car" | "paint" | "jacket" | "helmet";
export interface GarasiItem {
  id: string;
  name: string;
  price: number;
  color: string;
  blurb?: string;
  model?: string;
  trim?: string;
  shape?: "half" | "full";
}
export type ShowroomItem = GarasiItem & { id: ShowroomModel };

export interface GarasiSnapshot {
  catalog: Record<GarasiKind, GarasiItem[]> & { showroom?: ShowroomItem[] };
  garasi: {
    hasWarung: boolean;
    cash: number | null;
    motor: { id: string; name: string } | null;
    spotName: string;
    owned: { kind: GarasiKind | "showroom"; itemId: string; equipped: boolean }[];
  };
}

export const useGarasi = create<{
  data: GarasiSnapshot | null;
  busy: boolean;
  error: string | null;
}>(() => ({ data: null, busy: false, error: null }));

/** Kas usaha purchases (idempotent requestId) and free equip/take-off of owned style. */
export async function garasiCommand(
  action: "read" | "buy" | "equip" | "showroom-read" | "showroom-buy",
  extra: {
    kind?: GarasiKind;
    itemId?: string;
    requestId?: string;
    room?: string;
    connectionId?: string;
  } = {},
) {
  if (useGarasi.getState().busy) return undefined;
  useGarasi.setState({ busy: true, error: null });
  try {
    const data = await worldRequest<GarasiSnapshot>("garasi", {
      action,
      ...(action === "buy" ? { requestId: createId() } : {}),
      ...extra,
    });
    useGarasi.setState({ data });
    return data;
  } catch (e) {
    useGarasi.setState({ error: e instanceof Error ? e.message : "Garasi gagal dimuat." });
    return undefined;
  } finally {
    useGarasi.setState({ busy: false });
  }
}

/** Park the motor ("motor") or an owned car beside the player, or at the Garasi spot. */
export async function summonVehicle(vehicle: string, at: "here" | "garasi") {
  const [x, , z] = useGame.getState().playerPos;
  if (at === "here" && isShowroomRoom(x, z)) {
    useGame.getState().setToast("Keluar ke kota untuk memanggil kendaraan.");
    return;
  }
  await mobilityCommand("vehicle-summon", { summonVehicle: vehicle, summonAt: at });
  if (useMobility.getState().error) return; // The mobility store already toasted the reason.
  const game = useGame.getState();
  if (at === "garasi") {
    game.setWaypoint("garasi-parkir");
    game.setToast(
      `Kendaraanmu parkir di ${useGarasi.getState().data?.garasi.spotName ?? "garasi"}.`,
    );
  } else game.setToast("Kendaraanmu sudah parkir di sebelahmu. Tekan Naik.");
}
