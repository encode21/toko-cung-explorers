import { TruckHud } from "./TruckHud";
import { MissionNotifications } from "./MissionNotifications";
import { ContextActionButton } from "./ContextActionButton";
import { MobilityHud } from "./MobilityHud";
import { FishingHud } from "./FishingHud";
import { DailyRuntime } from "@/game/daily/DailyRuntime";
import { GameToast } from "@/ui/game-ui/GamePrimitives";
import { PerformanceDiagnostics } from "./PerformanceDiagnostics";
import { ClubHud } from "./ClubHud";
import { ClubMusicControls } from "./ClubMusicControls";
import { useDungeon } from "@/game/dungeon/store";
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
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { DungeonHud } from "./DungeonHud";
import { QuestInteraction } from "./QuestInteraction";

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

  return (
    <>
      {/* Keep dungeon transitions and completion effects mounted independently of detail panels. */}
      <DungeonHud />
      <div
        className="mmo-hud pointer-events-none absolute inset-0 z-20 select-none"
        data-touch={touch}
        data-dungeon={dungeon || undefined}
      >
        <AmbientMusic />
        <DailyRuntime />
        <MissionNotifications />
        <ClubHud />
        <div className="mmo-topbar" style={{ display: sheet === "camera" ? "none" : undefined }}>
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
        <FishingHud />
        <TruckHud />
        {playing && !sheet && <ChatPreview />}
        {playing && !sheet && !dungeon && <MobilityHud />}

        {playing && !sheet && !dungeon && <ContextPanel />}
        <ContextActionButton />
        {sheet !== "camera" && <QuestInteraction />}
        {sheet !== "camera" && <Toast />}
        {sheet !== "camera" && <PerformanceDiagnostics />}
        {playing && <HudSheetHost />}
        {playing && sheet !== "camera" && <ActionDock />}
      </div>
    </>
  );
}
