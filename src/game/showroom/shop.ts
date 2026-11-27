import { create } from "zustand";
import { garasiCommand, type GarasiKind } from "@/game/garasi/store";
import type { ContextAction } from "@/game/interactions/context-action";
import { mobilityCommand } from "@/game/mobility/store";
import { warungCommand } from "@/game/warung/store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useTravelScene } from "@/ui/hud/travel-loader";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { SHOWROOM_GEAR_ANCHOR } from "./gear-display";
import { isShowroomRoom, SHOWROOM_ROOM } from "./layout";
import { SHOWROOM_EXHIBITS, type ShowroomExhibitId } from "./models";

export const useShowroomShop = create<{ selected: ShowroomExhibitId }>(() => ({
  selected: "cung-velocity",
}));

function showroomLocation() {
  const game = useGame.getState();
  const { lease, playing } = useChannels.getState();
  if (
    !playing ||
    !lease ||
    game.pendingTeleport ||
    !isShowroomRoom(game.playerPos[0], game.playerPos[2]) ||
    useTravelScene.getState().mounted?.art !== "showroom"
  )
    return null;
  return { room: lease.channel, connectionId };
}

export function openShowroomCatalog(selected: ShowroomExhibitId = "cung-velocity") {
  if (!showroomLocation()) return;
  useShowroomShop.setState({ selected });
  useHud.getState().setSheet("showroom");
}

function openShowroomGearCatalog() {
  if (showroomLocation()) useHud.getState().setSheet("showroom-gear");
}

export async function loadShowroomCatalog() {
  // Finish any older poll, then register the landed pose before asking for the server quote.
  if (!showroomLocation()) return undefined;
  await mobilityCommand("read");
  if (!showroomLocation()) return undefined;
  await mobilityCommand("read");
  const location = showroomLocation();
  return location ? garasiCommand("showroom-read", location) : undefined;
}

export async function purchaseShowroomItem(
  kind: GarasiKind | "showroom",
  itemId: string,
  requestId: string,
) {
  const location = showroomLocation();
  if (!location) return false;
  const snapshot =
    kind === "showroom"
      ? await garasiCommand("showroom-buy", { ...location, itemId, requestId })
      : await garasiCommand("buy", { kind, itemId, requestId });
  if (!snapshot?.garasi.owned.some((item) => item.kind === kind && item.itemId === itemId))
    return false;
  void warungCommand("read");
  return true;
}

export async function equipShowroomGear(kind: Exclude<GarasiKind, "car">, itemId: string) {
  if (!showroomLocation()) return false;
  return Boolean(await garasiCommand("equip", { kind, itemId }));
}

export function showroomVehicleContextActions(): ContextAction[] {
  if (!showroomLocation()) return [];
  const [x, y, z] = useGame.getState().playerPos;
  const [ox, oy, oz] = SHOWROOM_ROOM.origin;
  if (Math.abs(y - oy - 0.83) > 1.8) return [];
  const actions = SHOWROOM_EXHIBITS.map(
    ({ id, model, name, x: standX, z: standZ }): ContextAction => {
      const px = ox + standX;
      const pz = oz + standZ;
      const distance = Math.hypot(x - px, z - pz);
      return {
        id: `showroom:vehicle:${id}`,
        label: "Lihat kendaraan",
        title: name,
        priority: 4,
        distance,
        shortcut: distance <= 4.3,
        busy: false,
        anchor: () => [px, oy + VEHICLE_DEFINITIONS[model].size[1] + 0.85, pz],
        execute: () => openShowroomCatalog(id),
      };
    },
  );
  const [gearX, , gearZ] = SHOWROOM_GEAR_ANCHOR;
  const gearDistance = Math.hypot(x - gearX, z - gearZ);
  if (gearDistance <= 3.4) {
    actions.push({
      id: "showroom:gear",
      label: "Lihat perlengkapan",
      title: "Helm dan Jaket",
      priority: 4,
      distance: gearDistance,
      busy: false,
      anchor: () => [...SHOWROOM_GEAR_ANCHOR],
      execute: openShowroomGearCatalog,
    });
  }
  return actions;
}
