import { Hand } from "lucide-react";
import { setLocalSocialAnim } from "@/game/social/social-actions";
import { Music, Sparkles, CupSoda, Volume2 } from "lucide-react";
import { useClub } from "@/game/club/store";
import { atBar } from "@/game/club/venue-layout";
import { takeDrink } from "@/game/club/venue-actions";
import { useClubYoutubeUi } from "@/game/club/youtube-host";
import { Compass, Map, Flag } from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { GameMenu } from "./GameMenu";
import { useDungeon } from "@/game/dungeon/store";

const ITEMS: {
  id: "map" | "explore" | "quests";
  label: string;
  Icon: typeof Map;
}[] = [
  { id: "map", label: "Peta", Icon: Map },
  { id: "explore", label: "Jelajah", Icon: Compass },
  { id: "quests", label: "Quest", Icon: Flag },
];

/** Compact navigation; chat has its own preview above the dock. */
export function ActionDock() {
  const club = useClub((s) => s.inside);
  const bar = useGame((s) => atBar(s.playerPos));
  const resume = useClubYoutubeUi((s) => s.resume);
  const blocked = useClubYoutubeUi((s) => s.status === "autoplay-blocked");
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const sheet = useHud((s) => s.sheet);
  const toggle = useHud((s) => s.toggleSheet);
  const setSheet = useHud((s) => s.setSheet);
  const openKiosk = useGame((s) => s.openKiosk);

  const press = (id: (typeof ITEMS)[number]["id"]) => {
    if (id === "quests") {
      setSheet(null);
      openKiosk();
    } else toggle(id);
  };

  return (
    <nav
      aria-label="Dock aksi"
      data-world-dock
      data-venue={club}
      data-hud-control
      className="mmo-actionbar"
    >
      {!dungeon &&
        ITEMS.map(({ id, label, Icon }) => {
          const active = sheet === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => press(id)}
              aria-label={label}
              aria-pressed={active}
              className={`mmo-actionbar-button ${active ? "is-active" : ""}`}
            >
              <Icon aria-hidden />
              <span className="mmo-actionbar-label">{label}</span>
            </button>
          );
        })}
      {club && (
        <>
          <button
            type="button"
            className="mmo-actionbar-button"
            aria-label="Dance"
            onClick={() => {
              useGame.getState().setSitting(false);
              toggle("dance");
            }}
          >
            <Sparkles aria-hidden />
            <span className="mmo-actionbar-label">Dance</span>
          </button>
          <button
            type="button"
            className="mmo-actionbar-button"
            aria-label="Musik"
            onClick={() => toggle("club")}
          >
            <Music aria-hidden />
            <span className="mmo-actionbar-label">Musik</span>
          </button>
          {bar && (
            <button
              type="button"
              className="mmo-actionbar-button"
              aria-label="Minum es jeruk"
              onClick={takeDrink}
            >
              <CupSoda aria-hidden />
            </button>
          )}
          {blocked && (
            <button
              type="button"
              className="mmo-actionbar-button"
              aria-label="Aktifkan audio"
              onClick={() => resume?.()}
            >
              <Volume2 aria-hidden />
            </button>
          )}
        </>
      )}
      {club && (
        <button
          type="button"
          className="mmo-actionbar-button"
          aria-label="Sapa"
          onClick={() => {
            useGame.getState().setSitting(false);
            setLocalSocialAnim("Wave", 2400);
          }}
        >
          <Hand aria-hidden />
        </button>
      )}
      <GameMenu />
    </nav>
  );
}
