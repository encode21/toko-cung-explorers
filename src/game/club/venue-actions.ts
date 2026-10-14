import { useWorldEditor } from "@/game/editor/store";
import { useClub, clubCommand, stopDanceOnMove } from "./store";
import { useGame } from "@/state/game-store";
import { setLocalSocialAnim } from "@/game/social/social-actions";
import { atBar } from "./venue-layout";
export function takeDrink() {
  if (!useClub.getState().inside || !atBar(useGame.getState().playerPos)) return;
  if (useGame.getState().sitting) return;
  stopDanceOnMove();
  setLocalSocialAnim("Drink", 3200);
  useGame.getState().setToast("Es jeruk Cung · Selamat menikmati!");
}

export function interactClubDoor(id: string) {
  const t = useWorldEditor
    .getState()
    .targets.find((t) => t.id === id && t.active && t.type === "CLUB_ENTRANCE");
  if (!t || useClub.getState().busy || useWorldEditor.getState().mode !== "PLAYER") return;
  const p = useGame.getState().playerPos;
  if (Math.hypot(p[0] - t.position.x, p[1] - 0.83 - t.position.y, p[2] - t.position.z) > 3) return;
  useGame.getState().setSitting(false);
  void clubCommand(t.tags.includes("club-exit") ? "exit" : "enter");
}
