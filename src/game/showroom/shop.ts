import { create } from "zustand";
import { garasiCommand } from "@/game/garasi/store";
import type { ContextAction } from "@/game/interactions/context-action";
import { mobilityCommand } from "@/game/mobility/store";
import { warungCommand } from "@/game/warung/store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useTravelScene } from "@/ui/hud/travel-loader";
import { isShowroomRoom, SHOWROOM_ROOM } from "./layout";
import { PREMIUM_EXHIBITS, SHOWROOM_MODELS, type ShowroomModel } from "./models";

export const useShowroomShop = create<{ selected: ShowroomModel }>(() => ({
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

export function openShowroomCatalog(selected: ShowroomModel = "cung-velocity") {
  if (!showroomLocation()) return;
  useShowroomShop.setState({ selected });
  useHud.getState().setSheet("showroom");
}

export async function loadShowroomCatalog() {
  // Register the last landed pose before asking the dealer for its server quote.
  if (!showroomLocation()) return undefined;
  await mobilityCommand("read");
  const location = showroomLocation();
  return location ? garasiCommand("showroom-read", location) : undefined;
}

export async function purchaseShowroomVehicle(itemId: ShowroomModel, requestId: string) {
  const location = showroomLocation();
  if (!location) return;
  const snapshot = await garasiCommand("showroom-buy", { ...location, itemId, requestId });
  if (snapshot?.garasi.owned.some((item) => item.kind === "showroom" && item.itemId === itemId)) {
    void warungCommand("read");
    return true;
  }
  return false;
}

export function showroomVehicleContextActions(): ContextAction[] {
  if (!showroomLocation()) return [];
  const [x, y, z] = useGame.getState().playerPos;
  const [ox, oy, oz] = SHOWROOM_ROOM.origin;
  return PREMIUM_EXHIBITS.flatMap((exhibit): ContextAction[] => {
    const px = ox + exhibit.x;
    const pz = oz + exhibit.z;
    const distance = Math.hypot(x - px, z - pz);
    if (distance > 4.3 || Math.abs(y - oy - 0.83) > 1.8) return [];
    return [
      {
        id: `showroom:vehicle:${exhibit.kind}`,
        label: "Lihat kendaraan",
        title: SHOWROOM_MODELS[exhibit.kind].name,
        priority: 4,
        distance,
        busy: false,
        anchor: () => [px, oy + (exhibit.kind === "cung-eclipse" ? 2.38 : 2.55), pz],
        execute: () => openShowroomCatalog(exhibit.kind),
      },
    ];
  });
}
