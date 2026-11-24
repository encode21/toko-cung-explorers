import { GangRuntime } from "@/game/gang/GangRuntime";
import { MountainRuntime } from "@/game/mountain/MountainRuntime";
import { MountainHud } from "./MountainHud";
import { TravelLoader } from "./TravelLoader";
import { MinigamesHud } from "./MinigamesHud";
import { OjekBidCard } from "./OjekBidCard";
import { NotifyCard } from "./NotifyCard";
import { VehicleHud } from "./VehicleHud";
import { TruckHud } from "./TruckHud";
import { MissionNotifications } from "./MissionNotifications";
import { ContextActionButton } from "./ContextActionButton";
import { MobilityHud } from "./MobilityHud";
import { FishingHud } from "./FishingHud";
import { EasyJobsHud } from "./EasyJobsHud";
import { StaffRuntime } from "@/game/staff/StaffRuntime";
import { PrologRuntime } from "@/game/prolog/PrologRuntime";
import { StoryRuntime } from "@/game/story/StoryRuntime";
import { StoryTracker } from "./StoryBook";
import { DailyRuntime } from "@/game/daily/DailyRuntime";
import { GameToast } from "@/ui/game-ui/GamePrimitives";
import { PerformanceDiagnostics } from "./PerformanceDiagnostics";
import { ClubHud } from "./ClubHud";
import { WarungHud } from "./WarungHud";
import { useWarung } from "@/game/warung/store";
import { UsahaHud } from "./UsahaHud";
import { WarungSfx } from "@/game/warung/WarungSfx";
import { ClubMusicControls } from "./ClubMusicControls";
import { useDungeon } from "@/game/dungeon/store";
import { useEffect } from "react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useProfile } from "@/identity/profile-store";
import { mapAnnouncementSeen } from "./announcements";
import { useNet } from "@/net/net-store";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { AmbientMusic } from "@/game/audio/AmbientMusic";
import { EnergyRuntime } from "@/game/energy/EnergyRuntime";
import { PlayerStatus } from "./PlayerStatus";
import { UtilityBar } from "@/ui/hud/UtilityBar";
import { ActionDock } from "@/ui/hud/ActionDock";
import { useFeedSources } from "@/ui/hud/EventFeed";
import { HudSheetHost } from "@/ui/hud/HudSheet";
import { ChatPreview } from "./ChatPreview";
import { Minimap } from "@/ui/minimap/Minimap";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { DungeonHud } from "./DungeonHud";
import { ClipRecorder, RekamButton } from "./Rekam";
import { watchViral } from "@/game/sosmed/store";

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
  const inWarung = useWarung((s) => !!s.inside);
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const { touch } = useMobileHudLayout();
  const overlay = useGame((s) => s.overlay);
  const talking = useNpcConversation();
  const sheet = useHud((s) => s.sheet);
  // Re-read on every sheet change: opening the world map marks it seen.
  const newMap = !mapAnnouncementSeen(useProfile((s) => s.profile?.id));
  const setSheet = useHud((s) => s.setSheet);
  const setChatOpen = useNet((s) => s.setChatOpen);
  useFeedSources();
  useEffect(watchViral, []);

  useEffect(() => setChatOpen(sheet === "chat"), [sheet, setChatOpen]);
  useEffect(() => {
    if (overlay !== "none" || talking) setSheet(null);
  }, [overlay, talking, setSheet]);

  const playing = overlay === "none" && !talking;

  return (
    <>
      {/* Keep dungeon transitions and completion effects mounted independently of detail panels. */}
      <DungeonHud />
      <MountainRuntime />
      <div
        className="mmo-hud pointer-events-none absolute inset-0 z-20 select-none"
        data-touch={touch}
        data-dungeon={dungeon || undefined}
      >
        <AmbientMusic />
        <PrologRuntime />
        <DailyRuntime />
        <StoryRuntime />
        <StaffRuntime />
        <GangRuntime />
        <EnergyRuntime />
        <MissionNotifications />
        <ClubHud />
        <WarungHud />
        <UsahaHud />
        <WarungSfx />
        <div
          className="mmo-topbar"
          style={{ display: sheet === "camera" || inWarung ? "none" : undefined }}
        >
          <div className="mmo-player-cluster">
            <PlayerStatus />
            <UtilityBar />
            {playing && !sheet && !dungeon && !inWarung && <StoryTracker />}
          </div>
          <div className="mmo-utilities">
            {playing && !sheet && (
              <>
                {!dungeon && <ClubMusicControls />}
                <span className="relative shrink-0">
                  <button
                    type="button"
                    data-hud-control
                    onClick={() => setSheet("map")}
                    aria-label="Perbesar peta"
                    className="mmo-minimap pointer-events-auto shrink-0"
                  >
                    <Minimap size={72} range={64} round />
                  </button>
                  {newMap && (
                    <span className="mmo-new-badge" aria-hidden="true">
                      Baru
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Keep activity effects mounted, but the warung owns its interior HUD. */}
        <div
          data-world-activity-hud
          style={{ display: inWarung ? "none" : "contents" }}
          inert={inWarung}
          aria-hidden={inWarung || undefined}
        >
          <MountainHud />
          <FishingHud />
          <EasyJobsHud />
          <TruckHud />
        </div>
        <TravelLoader />
        {playing && !sheet && !inWarung && <ChatPreview />}
        {playing && !sheet && !dungeon && !inWarung && (
          <>
            <MobilityHud />
            <VehicleHud />
            <OjekBidCard floating />
            <MinigamesHud />
            <RekamButton />
          </>
        )}

        {playing && sheet !== "camera" && !dungeon && !inWarung && <NotifyCard />}
        {!inWarung && <ContextActionButton />}
        {!sheet && <ClipRecorder />}
        {sheet !== "camera" && <Toast />}
        {sheet !== "camera" && <PerformanceDiagnostics />}
        {playing && <HudSheetHost />}
        {playing && sheet !== "camera" && !inWarung && <ActionDock />}
      </div>
    </>
  );
}
