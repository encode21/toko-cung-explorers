import { useEffect, useId } from "react";
import { ChevronRight } from "lucide-react";
import { useGang } from "@/game/gang/store";
import {
  cancelWarungEntry,
  finishWarungEntranceChoice,
  useWarungEntranceChoice,
} from "@/game/warung/entrance";
import { useWarung } from "@/game/warung/store";
import { useChannels } from "@/net/channel-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import "./warung-entrance-choice.css";

export function WarungEntranceChoice() {
  const descriptionId = useId();
  const target = useWarungEntranceChoice((s) => s.target);
  const playing = useChannels((s) => s.playing);
  const homeAvailable = useGang(() => target?.home?.accessible() ?? false);
  const shopStatus = useGang(() => target?.home?.warungUnavailable() ?? null);
  const busy = useWarung((s) => s.busy);
  useEffect(() => {
    if (!playing) cancelWarungEntry();
    else if (target && !homeAvailable) finishWarungEntranceChoice("cancel");
  }, [playing, target, homeAvailable]);
  if (!target || !playing || !homeAvailable) return null;

  return (
    <GameModal
      title="Pilih tujuan"
      className="game-light warung-entrance-modal"
      bodyClassName="warung-entrance-options"
      onClose={() => finishWarungEntranceChoice("cancel")}
    >
      <div className="game-light-grid">
        <button
          type="button"
          className="game-light-card"
          aria-label="Warung"
          aria-describedby={`${descriptionId}-warung`}
          disabled={busy || !!shopStatus}
          onClick={() => finishWarungEntranceChoice("warung")}
        >
          <span className="game-light-icon">
            <PhoneAppArtwork kind="warung" />
          </span>
          <span>
            <strong>Warung</strong>
            <small id={`${descriptionId}-warung`}>
              {shopStatus ?? "Layani pembeli dan kelola stok"}
            </small>
          </span>
          <ChevronRight className="warung-entrance-chevron" aria-hidden />
        </button>
        <button
          type="button"
          className="game-light-card"
          aria-label="Rumah"
          aria-describedby={`${descriptionId}-home`}
          onClick={() => finishWarungEntranceChoice("home")}
        >
          <span className="game-light-icon">
            <HudMenuArtwork kind="spawn" />
          </span>
          <span>
            <strong>Rumah</strong>
            <small id={`${descriptionId}-home`}>Istirahat di rumahmu</small>
          </span>
          <ChevronRight className="warung-entrance-chevron" aria-hidden />
        </button>
      </div>
    </GameModal>
  );
}
