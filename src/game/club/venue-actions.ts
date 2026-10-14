import { useClub, clubCommand, stopDanceOnMove } from "./store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { connectionId } from "@/net/channel-store";
import { setLocalSocialAnim } from "@/game/social/social-actions";
import { atBar, CONCERT_CENTER } from "./venue-layout";
import { spawnPreference } from "@/game/player/spawn";

export async function visitVenue(venue: "club" | "concert") {
  if (!useClub.getState().inside) await clubCommand("enter");
  if (!useClub.getState().inside) return;
  stopDanceOnMove();
  useGame.getState().setSitting(false);
  const slot = spawnPreference(connectionId, 9);
  useGame.setState({
    pendingTeleport: [
      (venue === "concert" ? CONCERT_CENTER : 0) + ((slot % 3) - 1) * 1.2,
      -13.17,
      6 + (Math.floor(slot / 3) - 1) * 1.2,
    ],
    toast:
      venue === "concert"
        ? "Cung Live · Musik & event tersambung dengan DJ Underground"
        : "Cung Underground · Selamat datang",
  });
  useHud.getState().setSheet(null);
}
export function takeDrink() {
  if (!useClub.getState().inside || !atBar(useGame.getState().playerPos)) return;
  if (useGame.getState().sitting) return;
  stopDanceOnMove();
  setLocalSocialAnim("Drink", 3200);
  useGame.getState().setToast("Es jeruk Cung · Selamat menikmati!");
}
