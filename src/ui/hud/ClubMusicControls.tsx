import { useClub } from "@/game/club/store";
import { toggleClubMusicMute, useClubYoutubeUi } from "@/game/club/youtube-host";
import { useWorldEditor } from "@/game/editor/store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { GameIconButton } from "@/ui/game-ui/GamePanel";
import { ClubMusicIcon } from "./ClubMusicIcon";
import "./club-music-controls.css";

/** Local music shortcuts beside the Underground minimap. Visibility follows its HUD host. */
export function ClubMusicControls() {
  const underground = useClub((s) => s.inside && !s.outdoor);
  const editing = useWorldEditor((s) => s.mode !== "PLAYER");
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);
  const principalPanel = useHud((s) => s.principalPanel);
  const muted = useClubYoutubeUi((s) => s.muted);
  const setSheet = useHud((s) => s.setSheet);

  if (!underground || editing || blocked || principalPanel) return null;

  return (
    <div
      className="club-music-controls"
      data-club-music-controls
      role="group"
      aria-label="Musik Underground"
    >
      <GameIconButton
        label={muted ? "Nyalakan musik Underground" : "Matikan musik Underground"}
        className="club-music-button club-music-mute"
        data-hud-control
        data-club-mute
        aria-pressed={muted}
        onClick={toggleClubMusicMute}
      >
        <ClubMusicIcon name={muted ? "muted" : "volume"} />
      </GameIconButton>
      <GameIconButton
        label="Request musik"
        className="club-music-button club-music-request"
        data-hud-control
        data-club-request
        aria-haspopup="dialog"
        onClick={() => setSheet("club")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4v12.3A4.5 3.4 0 1 0 11 19V8l10-2V1Z" fill="currentColor" />
          <path
            d="M19 12v8m-4-4h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </GameIconButton>
    </div>
  );
}
