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
import { connectionId, useChannels } from "@/net/channel-store";
import { vehicleFor, type RidePose, type RideVehicle } from "@/game/vehicles/model";
import { useFishing } from "@/game/fishing/store";
import { miniParticipant } from "@/game/minigames/store";
import { useMobility } from "@/game/mobility/store";
import { isMountainPosition } from "@/game/mountain/model";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import { showLoader, useLoader } from "@/ui/hud/travel-loader";
import { useBusRide } from "@/game/world/bus-ride";
import { houseFront, housePose, type GangData, type GangSnapshot, type DecorSlot } from "./model";
import { cityHalteArrival, waypointAfterGang } from "./model";
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
  vehicleSceneSequence++;
  vehicleSceneTarget = undefined;
  followingVehicle = false;
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
  const dungeon = useDungeon.getState().data?.instance;
  return (
    !useWarung.getState().inside &&
    !useUsaha.getState().inside &&
    !useClub.getState().inside &&
    !(dungeon && dungeon.realm !== "WORLD") &&
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
/** Why a bus to the gang cannot leave, or null when the trip can start. */
export function busToGangBlocked() {
  if (canEnter()) return null;
  return (
    useGang.getState().data?.text["finish_activity"] || "Selesaikan dulu kegiatanmu, baru naik bus."
  );
}
export async function enterGang(
  warungId?: number,
  target: { gang?: number; house?: number; playerId?: string } = {},
): Promise<boolean> {
  const blocked = () => {
    useGame
      .getState()
      .setToast(
        useGang.getState().data?.text["finish_activity"] ||
          "Selesaikan dulu kegiatanmu, baru naik bus.",
      );
    return false;
  };
  if (!canEnter()) return blocked();
  // A background gang read holds `busy` and would drop this trip on the floor.
  for (let i = 0; i < 40 && useGang.getState().busy; i++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  if (!canEnter()) return blocked();
  const visiting = !!(warungId || target.playerId);
  if (!useLoader.getState().loader && !useBusRide.getState().riding)
    showLoader("Menuju Gang Kampung", "Sebentar lagi sampai…", "gang");
  const data =
    (await gangCommand(visiting ? "visit" : "read", {
      ...target,
      ...(warungId ? { warungId } : {}),
    })) ?? (visiting || useGang.getState().error ? null : useGang.getState().data);
  if (!canEnter()) return blocked();
  if (!data) {
    const err = useGang.getState().error;
    useGame.getState().setToast(err || "Bus belum bisa berangkat. Coba lagi.");
    return false;
  }
  useGang.setState({ inside: data.gang, customize: false, board: false });
  useHud.getState().setSheet(null);
  useGame.setState({
    waypoint: null,
    pendingTeleport: houseFront(data.arrival, data.layout),
  });
  return true;
}
export function leaveGang(lot?: number) {
  const data = useGang.getState().data;
  if (!data) return;
  useGang.setState({ inside: null, customize: false, cityLot: lot ?? null });
  useHud.getState().setSheet(null);
  useGame.setState({
    pendingTeleport: cityHalteArrival(data.layout.gate),
    waypoint: lot === undefined ? waypointAfterGang(useGame.getState().waypoint) : "gang-city-shop",
  });
}

/**
 * Gerbang Kampung for drivers: returns where the ride lands on the other side (or null), so the
 * vehicle crosses with its driver; a player teleport would cancel the seat and strand the vehicle.
 * Like the bus, leaving one side heading out (−z) arrives on the other side heading in (+z).
 */
export function driveThroughGate(
  v: RideVehicle,
  p: RidePose,
  targetGang?: number | null,
): RidePose | null {
  const { data, inside } = useGang.getState();
  if (!data || useGame.getState().pendingTeleport) return null;
  const { gate, origin } = data.layout;
  const [ox, , oz] = origin;
  // Between the gate pillars (±4.9 m), just past the gate line.
  const crossed =
    inside === null
      ? Math.abs(p.x - gate.x) < 4.5 && p.z < gate.z - 1 && p.z > gate.z - 8
      : Math.abs(p.x - ox) < 4.5 && p.z < oz - 11 && p.z > oz - 26;
  if (!crossed) return null;
  if (
    v.occupants.some(
      (s) => s.status !== "active" || (s.transition && s.transition.phase !== "seated"),
    )
  )
    return null;
  const destination = targetGang ?? data.home.gang;
  if (inside === null && data.gang !== destination) {
    p.speed = 0;
    if (!useGang.getState().busy) void gangCommand("read", { gang: destination });
    return null;
  }
  useHud.getState().setSheet(null);
  if (inside === null) {
    showLoader("Menuju Gang Kampung", "Kendaraanmu ikut masuk gang", "gang", 900);
    useGang.setState({ inside: data.gang, customize: false, board: false });
    return { x: ox, y: 0, z: oz - 3, yaw: 0, speed: 0, gang: data.gang };
  }
  showLoader("Kembali ke kota", "Keluar lewat Gerbang Kampung", "gang", 900);
  useGang.setState({ inside: null, customize: false, cityLot: null });
  return { x: gate.x + 1.6, y: 0, z: gate.z + 6, yaw: 0, speed: 0, gang: null };
}
let vehicleSceneSequence = 0;
let vehicleSceneTarget: number | null | undefined;
let followingVehicle = false;
/** Follow the confirmed driver pose without teleporting the passenger out of their seat. */
export async function followVehicleGang(v: RideVehicle, p: RidePose) {
  if (
    !v.occupants.some(
      (s) => s.connectionId === connectionId && s.seat !== 0 && s.status === "active",
    )
  )
    return;
  const gang = p.gang ?? null;
  if (vehicleSceneTarget === gang && (followingVehicle || useGang.getState().inside === gang))
    return;
  const ticket = ++vehicleSceneSequence;
  vehicleSceneTarget = gang;
  followingVehicle = false;
  if (gang === null) {
    useGang.setState({ inside: null, customize: false, board: false });
    return;
  }
  if (useGang.getState().inside === gang) return;
  followingVehicle = true;
  showLoader("Menuju Gang Kampung", "Mengikuti kendaraanmu", "gang", 900);
  for (let i = 0; i < 40 && useGang.getState().busy; i++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  if (ticket !== vehicleSceneSequence) return;
  const data =
    useGang.getState().data?.gang === gang
      ? useGang.getState().data
      : await gangCommand("read", { gang });
  const current = vehicleFor(useMobility.getState().vehicles ?? [], connectionId);
  if (ticket !== vehicleSceneSequence) return;
  followingVehicle = false;
  if (current?.id !== v.id || !data) return;
  useGang.setState({ inside: gang, customize: false, board: false });
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
