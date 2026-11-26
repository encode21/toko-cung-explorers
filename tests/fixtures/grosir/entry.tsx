import "../hud/entry";
import { resetTransport, requests } from "../warung/client";
import { openKiosk, useWarung } from "@/game/warung/store";
import { useKioskQueue } from "@/game/warung/kiosk-queue";
import { KIOSK } from "@/game/interactions/kiosk";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";
import { useNet } from "@/net/net-store";

function resetGrosir(state = "empty") {
  const { snapshot } = resetTransport(state);
  useHud.getState().setSheet(null);
  useWarung.setState({
    data: snapshot,
    inside: null,
    serviceView: false,
    customers: [],
    customer: null,
    order: null,
    recommendedRestock: null,
    basket: [],
    shelfFilter: null,
    panelTab: null,
    busy: false,
    error: "",
    payChoice: false,
  });
  useGame.setState({
    overlay: "none",
    inside: true,
    playerPos: [...KIOSK.position],
    toast: null,
    nearby: null,
  });
  useNet.setState({ roster: [] });
  useKioskQueue.setState({ since: null });
}
Object.assign(window, {
  openGrosir: openKiosk,
  resetGrosir,
  kioskQueue: useKioskQueue,
  gameUi: useGameUi,
  grosirRequests: requests,
});
resetGrosir();
