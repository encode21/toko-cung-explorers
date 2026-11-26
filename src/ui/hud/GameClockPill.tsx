import { Moon, Sun } from "lucide-react";
import { gameDateLabel, gameMoment } from "@/game/time/calendar";
import { useSceneTime } from "@/game/time/scene-time";
import { useHud } from "@/state/hud-store";

export function GameClockPill() {
  const time = useSceneTime((s) => s.currentTime);
  const night = useSceneTime((s) => s.timeOfDay === "NIGHT");
  const setSheet = useHud((s) => s.setSheet);
  const now = Date.now();
  const Icon = night ? Moon : Sun;

  return (
    <button
      type="button"
      data-hud-control
      className="mmo-clock-pill"
      aria-label={`Jam ${time}, ${gameDateLabel(now)}. Buka kalender`}
      onClick={() => setSheet("calendar")}
    >
      <span className="mmo-clock-time">
        <Icon size={14} aria-hidden="true" />
        {time.replace(":", ".")}
      </span>
      <span className="mmo-clock-date">{gameMoment(now).split(" · ")[0]}</span>
    </button>
  );
}
