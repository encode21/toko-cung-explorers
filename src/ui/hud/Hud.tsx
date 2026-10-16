import { MobilityHud } from "./MobilityHud";
import { FishingHud } from "./FishingHud";
import { DailyRuntime } from "@/game/daily/DailyRuntime";
import { DailyMissionTracker } from "./DailyMissionTracker";
import { QuestInteraction } from "./QuestInteraction";
import { GameToast } from "@/ui/game-ui/GamePrimitives";
import { PerformanceDiagnostics } from "./PerformanceDiagnostics";
import { useGameSettings } from "@/state/game-settings";
import { ClubHud } from "./ClubHud";
import { ClubMusicControls } from "./ClubMusicControls";
import { useDungeon } from "@/game/dungeon/store";
import { QuestTracker } from "./QuestTracker";
import { MissionTracker } from "@/ui/hud/MissionTracker";
import { useEffect, useState } from "react";
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
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { DungeonHud } from "./DungeonHud";
import { ObbyTracker } from "./ObbyTracker";

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
  const [trackerHost, setTrackerHost] = useState<HTMLDivElement | null>(null);
  const showQuest = useGameSettings((s) => s.showQuest);
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const { touch } = useMobileHudLayout();
  const overlay = useGame((s) => s.overlay);
  const talking = useNpcConversation();
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  const setChatOpen = useNet((s) => s.setChatOpen);
  useFeedSources();

  useEffect(() => setChatOpen(sheet === "chat"), [sheet, setChatOpen]);
  useEffect(() => {
    if (overlay !== "none" || talking) setSheet(null);
  }, [overlay, talking, setSheet]);

  const playing = overlay === "none" && !talking;
  const showLeftStack = playing && !sheet;

  return (
    <>
      {/* Keep dungeon actions and transitions outside the scrollable tracker stack. */}
      <DungeonHud trackerHost={trackerHost} />
      <div
        className="mmo-hud pointer-events-none absolute inset-0 z-20 select-none"
        data-touch={touch}
        data-dungeon={dungeon || undefined}
      >
        <AmbientMusic />
        <DailyRuntime />
        <ClubHud />
        <div className="mmo-topbar">
          <div className="mmo-player-cluster">
            <PlayerStatus />
            <UtilityBar />
          </div>
          <div className="mmo-utilities">
            {playing && !sheet && (
              <>
                {!dungeon && <ClubMusicControls />}
                <button
                  type="button"
                  data-hud-control
                  onClick={() => setSheet("map")}
                  aria-label="Perbesar peta"
                  className="mmo-minimap pointer-events-auto shrink-0"
                >
                  <Minimap size={72} range={64} round />
                </button>
              </>
            )}
          </div>
        </div>
        {/* Keep the portal host mounted when sheets or dialogue hide the HUD. */}
        <div
          ref={setTrackerHost}
          className="mmo-trackers hud-scroll"
          data-hud-trackers
          style={{ display: showLeftStack ? undefined : "none" }}
        >
          {!dungeon && (
            <>
              {/* Tip sits first so it lines up with the Daily Mission side shortcut. */}
              {showQuest && <DailyMissionTracker />}
              <FishingHud />
              <ObbyTracker />
              {showQuest && <QuestTracker />}
              <MissionTracker />
            </>
          )}
        </div>
        {playing && !sheet && <ChatPreview />}
        {playing && !sheet && !dungeon && <MobilityHud />}

        {playing && !sheet && !dungeon && <ContextPanel touch={touch} />}
        <QuestInteraction />
        <Toast />
        <PerformanceDiagnostics />
        {playing && <HudSheetHost />}
        {playing && <ActionDock />}
      </div>
    </>
  );
}
