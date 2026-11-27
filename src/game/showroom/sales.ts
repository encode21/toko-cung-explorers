import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/identity/avatar";
import { useGame } from "@/state/game-store";
import { useTravelScene } from "@/ui/hud/travel-loader";
import { isShowroomRoom, SHOWROOM_ROOM } from "./layout";

export const SHOWROOM_SALES_NAME = "Nadia";
export const SHOWROOM_SALES_ROLE = "Sales Cung Motor";
export const SHOWROOM_SALES_LOCAL: [number, number, number] = [-10.25, 0, 10.55];

const [roomX, roomY, roomZ] = SHOWROOM_ROOM.origin;
export const SHOWROOM_SALES_POSITION = [
  roomX + SHOWROOM_SALES_LOCAL[0],
  roomY + SHOWROOM_SALES_LOCAL[1],
  roomZ + SHOWROOM_SALES_LOCAL[2],
] as const;

export const SHOWROOM_SALES_AVATAR: AvatarConfig = {
  ...DEFAULT_AVATAR,
  hair: "bob",
  hairColor: "#31211e",
  skin: "#d9a47a",
  outfit: "smart",
  outfitColor: "#c64e48",
  pantsColor: "#26333b",
  shoesColor: "#22232a",
};

export const useShowroomSales = create<{ open: boolean }>()(() => ({ open: false }));
export const closeShowroomSales = () => useShowroomSales.setState({ open: false });

const REACH = 3.3;
const SALES_ACTION = "showroom:sales";

export function showroomSalesContextActions(): ContextAction[] {
  const { playerPos, pendingTeleport } = useGame.getState();
  const [x, y, z] = playerPos;
  const [salesX, salesY, salesZ] = SHOWROOM_SALES_POSITION;
  if (
    pendingTeleport ||
    useShowroomSales.getState().open ||
    useTravelScene.getState().mounted?.art !== "showroom" ||
    !isShowroomRoom(x, z) ||
    Math.abs(y - salesY - 0.83) > 1.5
  )
    return [];
  const distance = Math.hypot(x - salesX, z - salesZ);
  if (distance >= REACH) return [];

  return [
    {
      id: SALES_ACTION,
      label: "Bicara",
      title: SHOWROOM_SALES_NAME,
      priority: 2,
      distance,
      busy: false,
      anchor: () => [salesX, salesY + 2.4, salesZ],
      execute: () => useShowroomSales.setState({ open: true }),
    },
  ];
}
