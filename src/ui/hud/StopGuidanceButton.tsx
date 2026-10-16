import { useEffect, useRef } from "react";
import { useDaily } from "@/game/daily/store";
import { useDungeon } from "@/game/dungeon/store";
import { useGuidanceActive } from "@/game/core/use-world-guidance";
import { useGame } from "@/state/game-store";
import { HudMenuArtwork } from "./HudMenuArtwork";

/** Side shortcut below Quest — hides ground arrows / Jelajah pin without abandoning the quest. */
export function StopGuidanceButton() {
  const setWaypoint = useGame((s) => s.setWaypoint);
  const setGuidanceMuted = useGame((s) => s.setGuidanceMuted);
  const { active, identity } = useGuidanceActive();
  const previousIdentity = useRef<string | null>(null);

  useEffect(() => {
    if (identity && identity !== previousIdentity.current) {
      setGuidanceMuted(false);
    }
    previousIdentity.current = identity;
  }, [identity, setGuidanceMuted]);

  if (!active) return null;

  return (
    <button
      type="button"
      className="mmo-side-button"
      data-hud-control
      data-stop-guidance
      onClick={() => {
        setWaypoint(null);
        useDaily.setState({ tracked: null });
        useDungeon.setState({ tracked: false });
        setGuidanceMuted(true);
      }}
      aria-label="Hentikan petunjuk"
    >
      <HudMenuArtwork kind="stop-guidance" />
      <span className="mmo-side-label">
        Hentikan
        <br />
        Petunjuk
      </span>
    </button>
  );
}
