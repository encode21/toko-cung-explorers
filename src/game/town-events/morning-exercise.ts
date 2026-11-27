import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useGang } from "@/game/gang/store";
import { clubCommand, clubNow, danceFor, useClub } from "@/game/club/store";
import { ownVehicle } from "@/game/vehicles/runtime";
import { useSceneTime } from "@/game/time/scene-time";
import { eventOpen } from "./model";
import { progressTownEvent, townEvent, type TownHost } from "./store";

let exercising = false;
export const isMorningExercise = () => exercising;

/** Use the shared dance session so other players see the exercise too; walking cancels it. */
export async function startMorningExercise(host: TownHost, point: number) {
  if (exercising) return;
  if (ownVehicle()) {
    useGame.getState().setToast("Turun dari kendaraan dulu untuk ikut senam.");
    return;
  }
  exercising = true;
  let startedAt: number | undefined;
  try {
    if (!useClub.getState().inside) await clubCommand("enter", { outdoor: true });
    await clubCommand("dance", { danceId: "step" });
    const dance = danceFor(connectionId);
    if (useClub.getState().error || !dance || dance.id !== "step") {
      useGame.getState().setToast(useClub.getState().error || "Senam belum tersambung. Coba lagi.");
      return;
    }
    startedAt = dance.startedAt;
    useGame.getState().setToast("Ikuti senam selama 8 detik. Bergerak untuk batal.");
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const game = useGame.getState();
      const event = townEvent(host);
      const target = event?.event.points[point];
      const current = danceFor(connectionId);
      if (
        document.hidden ||
        game.pendingTeleport ||
        useGang.getState().inside ||
        ownVehicle() ||
        !target ||
        event?.status !== "active" ||
        event.event.key !== "senam_pagi" ||
        !eventOpen(event.event.hours, useSceneTime.getState().hour) ||
        Math.hypot(game.playerPos[0] - target[0], game.playerPos[2] - target[1]) > 2.6 ||
        game.playerPos[1] > 4 ||
        current?.startedAt !== startedAt ||
        current.id !== "step"
      )
        break;
      // A small margin avoids submitting early when the network clock offset is approximate.
      if (clubNow() - startedAt >= 8_400) {
        await progressTownEvent(host, point);
        return;
      }
    }
    useGame.getState().setToast("Senam terhenti. Kembali ke tengah arena untuk mengulang.");
  } finally {
    if (startedAt !== undefined && danceFor(connectionId)?.startedAt === startedAt)
      await clubCommand("stop-dance", { expectedStartAt: startedAt });
    exercising = false;
  }
}
