import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useTravelScene } from "@/ui/hud/travel-loader";
import { SHOWROOM_NAME, SHOWROOM_WAYPOINT } from "./layout";
import { openShowroomCatalog } from "./shop";

/** Garasi points to the showroom entrance or opens its catalog when already inside. */
export function openShowroomDirections() {
  const area = useTravelScene.getState().mounted?.art;
  if (area === "showroom") {
    openShowroomCatalog();
    return;
  }

  const game = useGame.getState();
  game.setWaypoint(SHOWROOM_WAYPOINT);
  game.setToast(
    area === "gunung"
      ? `Naik helikopter di basecamp untuk menuju ${SHOWROOM_NAME}.`
      : area === "gang"
        ? `Kembali ke Pusat Kota lewat halte, lalu ikuti panah ke ${SHOWROOM_NAME}.`
        : area && area !== "kota"
          ? `Keluar dulu, lalu ikuti petunjuk menuju ${SHOWROOM_NAME}.`
          : `Ikuti panah ke ${SHOWROOM_NAME}, di samping Cung Underground.`,
  );
  useHud.getState().setSheet(null);
}
