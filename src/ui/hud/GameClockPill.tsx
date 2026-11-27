import { Moon, Sun } from "lucide-react";
import { gameDateLabel } from "@/game/time/calendar";
import { useSceneTime } from "@/game/time/scene-time";
import { useHud } from "@/state/hud-store";

export function GameClockPill() {
  const time = useSceneTime((s) => s.currentTime);
  const night = useSceneTime((s) => s.timeOfDay === "NIGHT");
  const date = gameDateLabel(Date.now());
  const Icon = night ? Moon : Sun;

  return (
    <button
      type="button"
      data-hud-control
      className="mmo-clock-pill"
      aria-label={`Jam ${time}, ${date}. Buka kalender`}
      aria-haspopup="dialog"
      onClick={() => useHud.getState().setSheet("calendar")}
    >
      <span className="mmo-clock-time">
        <Icon size={14} aria-hidden="true" />
        {time.replace(":", ".")}
      </span>
      <span className="mmo-clock-date">{date}</span>
    </button>
  );
}
