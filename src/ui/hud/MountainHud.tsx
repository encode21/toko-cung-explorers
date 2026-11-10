import { MOUNTAIN_CHECKPOINT_COUNT } from "@/game/mountain/model";
import { MountainCompletion } from "./MountainCompletion";
import { nearMountainOutfits } from "@/game/mountain/outfits";
import { Flag, Shirt } from "lucide-react";
import { useMountain } from "@/game/mountain/store";
import { isMountainPosition } from "@/game/mountain/model";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";
import { useChannels } from "@/net/channel-store";
import { useWorldEditor } from "@/game/editor/store";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import "./mountain-hud.css";

/** Trail progress stays near movement controls; equipment lives above chat. */
export function MountainHud() {
  const state = useMountain();
  const position = useGame((s) => s.playerPos);
  const overlay = useGame((s) => s.overlay);
  const sheet = useHud((s) => s.sheet);
  const blocked = useGameUi((s) => s.panels > 0 || s.portrait);
  const playing = useChannels((s) => s.playing);
  const editor = useWorldEditor((s) => s.mode !== "PLAYER");
  const talking = useNpcConversation();
  if (!playing || editor) return null;
  if (state.flight)
    return (
      <div className="mountain-flight" data-helicopter-flight role="status" aria-live="polite">
        <div className="mountain-flight-card">
          <svg viewBox="0 0 120 65" aria-hidden="true">
            <path
              d="M26 9h64M60 9v9M29 52h60M38 43v9M78 43v9"
              fill="none"
              stroke="#516456"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path d="M29 20h44c22 0 32 18 12 23H34Z" fill="#c65d4d" />
            <path d="M32 23 7 15v14l25 7" fill="#e1d8c1" />
            <path d="M66 21h10c12 0 18 8 18 13H66Z" fill="#b9e3e7" />
          </svg>
          <strong>Terbang ke {state.flight.to === "mountain" ? "Pegunungan" : "Pusat Kota"}</strong>
          <span>
            {state.flight.to === "mountain"
              ? "Mendarat di basecamp pendakian"
              : "Kembali ke helipad kota"}
          </span>
        </div>
      </div>
    );
  if (
    state.summitOpen &&
    !sheet &&
    !talking &&
    overlay === "none" &&
    isMountainPosition(position[0], position[2])
  )
    return <MountainCompletion />;
  if (
    sheet ||
    overlay !== "none" ||
    blocked ||
    talking ||
    !isMountainPosition(position[0], position[2])
  )
    return null;
  return (
    <div className="mountain-hud" data-mountain-hud data-hud-control>
      <div className="mountain-hud-status" role="status">
        <Flag aria-hidden size={15} />
        <span>
          {state.completed
            ? "Puncak tercapai!"
            : `Pendakian · CP ${state.checkpoint}/${MOUNTAIN_CHECKPOINT_COUNT}`}
        </span>
      </div>
      {nearMountainOutfits(position) && (
        <div className="mountain-hud-tools">
          <button
            data-mountain-outfits
            onClick={() => useHud.getState().setSheet("mountain-outfits")}
          >
            <Shirt size={16} aria-hidden />
            Outfit pendaki
          </button>
        </div>
      )}
      {state.completed && (
        <div className="mountain-hud-tools">
          <button onClick={state.returnToBasecamp}>Kembali ke basecamp</button>
        </div>
      )}
    </div>
  );
}
