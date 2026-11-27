import { useEffect, useState } from "react";
import { useMountainLocation } from "@/game/engine/location";
import { isGangPosition } from "@/game/gang/store";
import { useHome } from "@/game/home/store";
import { useSceneTime } from "@/game/time/scene-time";
import { FLOOD_VISIBLE_AT } from "@/game/weather/flood-surface";
import { currentWeather } from "@/game/weather/store";
import type { WeatherCondition } from "@/game/weather/timeline";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { WeatherShortcutArtwork } from "./WeatherShortcutArtwork";

function shortcutCondition(inKampung: boolean, inMountain: boolean): WeatherCondition {
  const { rain, flood } = currentWeather();
  if (inKampung && flood > FLOOD_VISIBLE_AT) return "flood";
  return !inMountain && rain > 0 ? "rain" : "clear";
}

export function WeatherShortcut() {
  const night = useSceneTime((s) => s.timeOfDay === "NIGHT");
  const inHome = useHome((s) => s.inside);
  const inKampung = useGame((s) => {
    const [x, , z] = s.pendingTeleport ?? s.playerPos;
    return isGangPosition(x, z);
  });
  const inMountain = useMountainLocation();
  const showKampung = inHome || inKampung;
  const [weather, setWeather] = useState(() => shortcutCondition(showKampung, inMountain));
  useEffect(() => {
    const refresh = () => setWeather(shortcutCondition(showKampung, inMountain));
    refresh();
    const timer = window.setInterval(refresh, 1_000);
    return () => window.clearInterval(timer);
  }, [showKampung, inMountain]);

  return (
    <button
      type="button"
      data-hud-control
      data-weather-shortcut
      data-weather={weather}
      className="mmo-weather-button"
      aria-label="Cek cuaca"
      aria-haspopup="dialog"
      onClick={() => useHud.getState().setSheet("weather")}
    >
      <WeatherShortcutArtwork condition={weather === "clear" && night ? "night" : weather} />
    </button>
  );
}
