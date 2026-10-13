import { QuestInteraction } from "./QuestInteraction";
import { GameToast } from "@/ui/game-ui/GamePrimitives";
import { PerformanceDiagnostics } from "./PerformanceDiagnostics";
import { useGameSettings } from "@/state/game-settings";
import { ClubHud } from "./ClubHud";
import { useDungeon } from "@/game/dungeon/store";
import { QuestTracker } from "./QuestTracker";
import { MissionTracker } from "@/ui/hud/MissionTracker";
import { useEffect } from "react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { AmbientMusic } from "@/game/audio/AmbientMusic";
import { PlayerStatus } from "./PlayerStatus";
import { UtilityBar } from "@/ui/hud/UtilityBar";
import { ContextPanel } from "@/ui/hud/ContextPanel";
import { ActionDock } from "@/ui/hud/ActionDock";
import { useFeedSources } from "@/ui/hud/EventFeed";
import { HudSheetHost } from "@/ui/hud/HudSheet";
import { ChatPreview } from "./ChatPreview";
import { Minimap } from "@/ui/minimap/Minimap";

function Toast() {
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  return <GameToast>{toast}</GameToast>;
}

/** HUD kota virtual: header lokasi, utilitas, peta, feed, konteks, dock, sheet. */
export function Hud() {
  const showQuest = useGameSettings((s) => s.showQuest);
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const { touch } = useMobileHudLayout();
  const overlay = useGame((s) => s.overlay);
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  const setChatOpen = useNet((s) => s.setChatOpen);
  useFeedSources();

  useEffect(() => setChatOpen(sheet === "chat"), [sheet, setChatOpen]);
  useEffect(() => {
    if (overlay !== "none") setSheet(null);
  }, [overlay, setSheet]);

  const playing = overlay === "none";
  const showLeftStack = playing && !sheet;

  return (
    <div
      className="mmo-hud pointer-events-none absolute inset-0 z-20 select-none"
      data-touch={touch}
    >
      <AmbientMusic />
      <ClubHud />
      <div className="mmo-topbar">
        <div className="mmo-player-cluster">
          <PlayerStatus />
        </div>
        <div className="mmo-utilities">
          <UtilityBar />
          {!dungeon && playing && !sheet && (
            <button
              type="button"
              data-hud-control
              onClick={() => setSheet("map")}
              aria-label="Perbesar peta"
              className="mmo-minimap pointer-events-auto shrink-0"
            >
              <Minimap size={72} range={64} round />
            </button>
          )}
        </div>
      </div>
      {showLeftStack && !dungeon && (
        <div className="mmo-trackers hud-scroll" data-hud-trackers>
          {showQuest && <QuestTracker />}
          <MissionTracker />
        </div>
      )}
      {playing && !sheet && <ChatPreview />}

      {playing && !sheet && !dungeon && <ContextPanel touch={touch} />}
      <QuestInteraction />
      <Toast />
      <PerformanceDiagnostics />
      {playing && <HudSheetHost />}
      {playing && <ActionDock />}
    </div>
  );
}
