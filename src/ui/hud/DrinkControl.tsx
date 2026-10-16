import { useClub } from "@/game/club/store";
import { takeDrink } from "@/game/club/venue-actions";
import { atBar } from "@/game/club/venue-layout";
import { useControls } from "@/game/player/control-state";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import "./mobile-controls.css";

/** Underground bar action, at twelve o'clock relative to the jump button. */
export function DrinkControl() {
  const underground = useClub((s) => s.inside && !s.outdoor);
  const available = useGame((s) => s.overlay === "none" && !s.sitting && atBar(s.playerPos));
  const ready = useControls((s) => s.playerReady);
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);
  const sheetOpen = useHud((s) => s.sheet !== null || s.principalPanel !== null);
  const talking = useNpcConversation();

  if (!underground || !available || !ready || blocked || sheetOpen || talking) return null;

  return (
    <button
      type="button"
      className="drink-trigger"
      data-hud-control
      data-mobile-interact
      data-mobile-drink
      aria-label="Drink · Minum es jeruk"
      title="Drink · Minum es jeruk"
      onClick={takeDrink}
    >
      <svg className="drink-trigger-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="m18 15 3-11h6"
          fill="none"
          stroke="#79584d"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="m7 10 2.5 17h13L25 10Z" fill="#b8e5e7" />
        <path d="m8 15 1.8 11h12.4L24 15Z" fill="#ffad32" />
        <path
          d="m7 10 2.5 17h13L25 10Z"
          fill="none"
          stroke="#79584d"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="m12 18 .8 6" fill="none" stroke="#fff1ba" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="10" r="5.5" fill="#9dcd66" stroke="#638a42" strokeWidth="1.5" />
        <path d="M8 6.5v7M4.5 10h7" stroke="#f5f6c7" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
