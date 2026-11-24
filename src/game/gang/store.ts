import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { useAccount } from "@/auth/useSession";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useWarung, enterWarung, openWarungPanel } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useChannels } from "@/net/channel-store";
import { vehicleFor } from "@/game/vehicles/model";
import { useFishing } from "@/game/fishing/store";
import { miniParticipant } from "@/game/minigames/store";
import { useMobility } from "@/game/mobility/store";
import { isMountainPosition } from "@/game/mountain/model";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import { showLoader, useLoader } from "@/ui/hud/travel-loader";
import { houseFront, housePose, type GangData, type GangSnapshot, type DecorSlot } from "./model";
import { cityHalteArrival } from "./model";
import { gangCoastContains } from "./beach";
import type { HomePrivacyMode } from "./model";

type GangCommand = {
  action: "read" | "visit" | "decorate" | "privacy";
  requestId: string;
  gang?: number;
  house?: number;
  playerId?: string;
  warungId?: number;
  slot?: DecorSlot;
  itemId?: string;
  privacy?: HomePrivacyMode;
};
export const useGang = create<{
  data: GangData | null;
  inside: number | null;
  busy: boolean;
  error: string;
  customize: boolean;
  board: boolean;
  retry: GangCommand | null;
  cityLot: number | null;
}>(() => ({
  data: null,
  inside: null,
  busy: false,
  error: "",
  customize: false,
  board: false,
  retry: null,
  cityLot: null,
}));
let generation = 0;
export function clearGang() {
  const { inside, data } = useGang.getState();
  if (inside && data) {
    if (useWarung.getState().inside)
      useWarung.setState({ returnTo: [data.layout.gate.x, 0.83, data.layout.gate.z + 3] });
    else leaveGang();
  }
  generation++;
  useGang.setState({
    data: null,
    inside: null,
    busy: false,
    error: "",
    customize: false,
    board: false,
    retry: null,
    cityLot: null,
  });
}
export function isGangPosition(x: number, z: number) {
  const data = useGang.getState().data;
  if (!data) return false;
  const [ox, , oz] = data.layout.origin;
  const end = 10 + Math.ceil(data.houses.length / 2) * data.layout.house_spacing;
  return gangCoastContains(x - ox, z - oz, end);
}
export function localGangId() {
  const p = useGame.getState().pendingTeleport ?? useGame.getState().playerPos;
  return isGangPosition(p[0], p[2]) ? useGang.getState().inside : null;
}
export function useGangMap() {
  const inside = useGang((s) => s.inside);
  const warung = useWarung((s) => !!s.inside);
  const usaha = useUsaha((s) => !!s.inside);
  return !!inside && !warung && !usaha;
}
export async function gangCommand(action: GangCommand["action"], extra: Partial<GangCommand> = {}) {
  const account = useAccount.getState().user;
  const state = useGang.getState();
  if (!account || state.busy || (state.retry && !extra.requestId)) return null;
  const ticket = generation;
  const command: GangCommand = { action, requestId: createId(), ...extra };
  useGang.setState({ busy: true, error: "" });
  try {
    const data = await worldRequest<GangSnapshot>("gang", command);
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return null;
    if (!data.enabled) {
      clearGang();
      return null;
    }
    useGang.setState({ data, retry: null });
    return data;
  } catch (e) {
    if (ticket === generation)
      useGang.setState({
        error: e instanceof Error ? e.message : "",
        retry: e instanceof WorldApiError && e.status < 500 ? null : command,
      });
    return null;
  } finally {
    if (ticket === generation) useGang.setState({ busy: false });
  }
}
function canEnter() {
  const g = useGame.getState();
  return (
    !useWarung.getState().inside &&
    !useUsaha.getState().inside &&
    !useClub.getState().inside &&
    !useDungeon.getState().data?.instance &&
    !vehicleFor(
      useMobility.getState().vehicles ?? [],
      useChannels.getState().lease?.playerId ?? "",
    ) &&
    !g.pendingTeleport &&
    !miniParticipant() &&
    !useFishing.getState().open &&
    !isMountainPosition(g.playerPos[0], g.playerPos[2])
  );
}
export async function enterGang(
  warungId?: number,
  target: { gang?: number; house?: number; playerId?: string } = {},
) {
  if (!canEnter()) {
    useGame.getState().setToast(useGang.getState().data?.text["finish_activity"] ?? "");
    return;
  }
  if (!useLoader.getState().loader)
    showLoader("Menuju Gang Kampung", "Sebentar lagi sampai…", "gang");
  const data = await gangCommand(warungId || target.playerId ? "visit" : "read", {
    ...target,
    ...(warungId ? { warungId } : {}),
  });
  if (!data || !canEnter()) return;
  useGang.setState({ inside: data.gang, customize: false, board: false });
  useHud.getState().setSheet(null);
  useGame.setState({
    waypoint: null,
    pendingTeleport: houseFront(data.arrival, data.layout),
  });
}
export function leaveGang(lot?: number) {
  const data = useGang.getState().data;
  if (!data) return;
  useGang.setState({ inside: null, customize: false, cityLot: lot ?? null });
  useHud.getState().setSheet(null);
  useGame.setState({
    pendingTeleport: cityHalteArrival(data.layout.gate),
    waypoint: lot === undefined ? null : "gang-city-shop",
  });
}
export async function visitGangShop(warungId: number) {
  if (useGang.getState().data) await enterGang(warungId);
  else await enterWarung(warungId);
}
export function openHomeShop() {
  useWarung.setState({ openLot: null });
  openWarungPanel("home");
}
export function cityShopTarget() {
  const n = useGang.getState().cityLot;
  const lot = n === null ? null : WARUNG_LOTS[n];
  return lot ? lotFront(lot) : null;
}

export function gangFacingAt(x: number, z: number) {
  const d = useGang.getState().data;
  if (!d) return 0;
  const nearest = [...d.houses].sort((a, b) => {
    const p = houseFront(a.number, d.layout),
      q = houseFront(b.number, d.layout);
    return Math.hypot(x - p[0], z - p[2]) - Math.hypot(x - q[0], z - q[2]);
  })[0];
  return nearest ? housePose(nearest.number, d.layout).yaw : 0;
}
