import { useSummitLeaderboard } from "@/game/mountain/leaderboard";
import { toggleFlashlightItem, toggleSummitBoardItem, useMountain } from "@/game/mountain/store";
import { isMountainPosition } from "@/game/mountain/model";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";
import { useWorldEditor } from "@/game/editor/store";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { useTouchControls } from "@/hooks/use-touch";
import "./mountain-hud.css";

/** Inventory is anchored to the composer, keeping both independent of movement controls. */
export function MountainHotbar() {
  const state = useMountain();
  const boardOwned = useSummitLeaderboard((s) => s.loaded && s.ownSummits > 0);
  const inMountain = useGame((s) => isMountainPosition(s.playerPos[0], s.playerPos[2]));
  const overlay = useGame((s) => s.overlay);
  const sheet = useHud((s) => s.sheet);
  const blocked = useGameUi((s) => s.panels > 0 || s.portrait);
  const playing = useChannels((s) => s.playing);
  const editor = useWorldEditor((s) => s.mode !== "PLAYER");
  const talking = useNpcConversation();
  const touch = useTouchControls();
  if (
    !playing ||
    editor ||
    !inMountain ||
    !state.flashlightOwned ||
    state.flight ||
    state.summitOpen ||
    sheet ||
    overlay !== "none" ||
    blocked ||
    talking
  )
    return null;

  const action = state.flashlightEquipped ? "Simpan senter" : "Pakai dan nyalakan senter";
  const status = state.flashlightOn ? "Menyala" : state.flashlightEquipped ? "Mati" : "Disimpan";
  return (
    <div
      className="mountain-hotbar"
      role="group"
      aria-label="Perlengkapan pendakian"
      data-mountain-hotbar
    >
      <button
        type="button"
        className="mountain-item-slot"
        data-flashlight-slot
        data-equipped={state.flashlightEquipped}
        data-on={state.flashlightOn}
        aria-label={`${action}. ${status}.`}
        aria-pressed={state.flashlightEquipped}
        title={touch ? action : `${action} · 1: pakai/simpan · L: nyalakan/matikan`}
        onClick={toggleFlashlightItem}
      >
        {!touch && (
          <kbd className="mountain-item-key" aria-hidden="true">
            1
          </kbd>
        )}
        <span className="mountain-item-indicator" aria-hidden="true" />
        <svg className="mountain-item-art" viewBox="0 0 64 64" aria-hidden="true">
          <g transform="rotate(35 32 32)">
            <path
              className="mountain-item-rays"
              d="M25 9 22 3m10 5V1m7 8 3-6"
              fill="none"
              stroke="#ffe5a6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M25 29h14v25l-3 4h-8l-3-4Z"
              fill="#25373d"
              stroke="#8caaad"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M27 31h4v22h-4Z" fill="#526b70" />
            <path d="M25 38h14m-14 5h14m-14 5h14" stroke="#17272d" strokeWidth="2" />
            <path d="M25 51h14v4l-3 3h-8l-3-3Z" fill="#e8a03b" />
            <path
              d="m21 19 4 12h14l4-12Z"
              fill="#e8a03b"
              stroke="#ffcf79"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="m22 20 4 10h5l-2-10Z" fill="#ffc15d" />
            <rect
              x="20"
              y="13"
              width="24"
              height="9"
              rx="3"
              fill="#34474c"
              stroke="#8caaad"
              strokeWidth="1.5"
            />
            <rect x="23" y="14" width="18" height="5" rx="2" fill="#fff4cb" />
            <rect x="30" y="31" width="5" height="6" rx="1" fill="#f6eddd" />
          </g>
        </svg>
        <span className="mountain-item-name">Senter</span>
      </button>
      {boardOwned && (
        <button
          type="button"
          className="mountain-item-slot"
          data-summit-board-slot
          data-equipped={state.summitBoardEquipped}
          aria-label={state.summitBoardEquipped ? "Simpan papan summit" : "Pakai papan summit"}
          aria-pressed={state.summitBoardEquipped}
          title={touch ? "Papan summit" : "Papan summit · 2: pakai/simpan"}
          onClick={toggleSummitBoardItem}
        >
          {!touch && (
            <kbd className="mountain-item-key" aria-hidden="true">
              2
            </kbd>
          )}
          <span className="mountain-item-indicator" aria-hidden="true" />
          <svg className="mountain-item-art" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M30 41h5v20h-5Z" fill="#967147" />
            <path d="M5 10h54v34H5Z" fill="#25433f" stroke="#b59867" strokeWidth="3" />
            <path d="M15 22h34m-29 9h24" stroke="#f5ebcb" strokeWidth="4" />
          </svg>
          <span className="mountain-item-name">Summit</span>
        </button>
      )}
    </div>
  );
}
