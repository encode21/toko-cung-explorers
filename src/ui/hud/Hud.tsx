import { GangRuntime } from "@/game/gang/GangRuntime";
import { IncidentRuntime } from "@/game/incidents/IncidentRuntime";
import { MountainRuntime } from "@/game/mountain/MountainRuntime";
import { MountainHud } from "./MountainHud";
import { BusRideCaption } from "./BusRideCaption";
import { MinigamesHud } from "./MinigamesHud";
import { OjekBidCard } from "./OjekBidCard";
import { PhoneWorldNotices } from "./PhoneWorldNotices";
import { VehicleHud } from "./VehicleHud";
import { TruckHud } from "./TruckHud";
import { MissionNotifications } from "./MissionNotifications";
import { ContextActionButton } from "./ContextActionButton";
import { MobilityHud } from "./MobilityHud";
import { FishingHud } from "./FishingHud";
import { EasyJobsHud } from "./EasyJobsHud";
import { PasarHud } from "./PasarHud";
import { StaffRuntime } from "@/game/staff/StaffRuntime";
import { DisasterAlert } from "./DisasterAlert";
import { PrologRuntime } from "@/game/prolog/PrologRuntime";
import { StoryRuntime } from "@/game/story/StoryRuntime";
import { DailyRuntime } from "@/game/daily/DailyRuntime";
import { GameToast } from "@/ui/game-ui/GamePrimitives";
import { PerformanceDiagnostics } from "./PerformanceDiagnostics";
import { ClubHud } from "./ClubHud";
import { WarungHud } from "./WarungHud";
import { DeliveryTracking } from "./DeliveryTracking";
import { NiagaDealerPanel } from "./NiagaDealerPanel";
import { useWarung } from "@/game/warung/store";
import { useHome } from "@/game/home/store";
import { isShowroomRoom } from "@/game/showroom/layout";
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
import { WeatherShortcut } from "./WeatherShortcut";
import { ActionDock } from "@/ui/hud/ActionDock";
import { useFeedSources } from "@/ui/hud/EventFeed";
import { HudSheetHost } from "@/ui/hud/HudSheet";
import { ChatPreview } from "./ChatPreview";
import { Minimap } from "@/ui/minimap/Minimap";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { DungeonHud } from "./DungeonHud";
import { ClipRecorder, RekamButton } from "./Rekam";

function Toast() {
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);
  useEffect(() => {
    if (!toast) return;
    // Long enough to read a sentence; anything that must not be missed goes to the phone inbox.
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  return <GameToast>{toast}</GameToast>;
}

/** HUD kota virtual: header lokasi, utilitas, peta, feed, konteks, dock, sheet. */
export function Hud() {
  const inWarung = useWarung((s) => !!s.inside);
  const inHome = useHome((s) => s.inside);
  const inShowroom = useGame((s) => isShowroomRoom(s.playerPos[0], s.playerPos[2]));
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
      <IncidentRuntime />
      <PhoneWorldNotices />
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
        <DeliveryTracking />
        <NiagaDealerPanel />
        <UsahaHud />
        <WarungSfx />
        <DisasterAlert />
        <div
          className="mmo-topbar"
          style={{ display: sheet === "camera" || inWarung ? "none" : undefined }}
        >
          <div className="mmo-player-cluster">
            <PlayerStatus />
            <UtilityBar />
          </div>
          <div className="mmo-utilities">
            {playing && !sheet && !inWarung && (
              <>
                {!dungeon && <ClubMusicControls />}
                <div className="mmo-map-controls">
                  <WeatherShortcut />
                  {!inHome && !inShowroom && (
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
                  )}
                </div>
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
          <PasarHud />
          <TruckHud />
        </div>
        <BusRideCaption />
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

        {!inWarung && <ContextActionButton />}
        {!sheet && <ClipRecorder />}
        {sheet !== "camera" && (
          <div className="hud-notifications">
            <Toast />
          </div>
        )}
        {sheet !== "camera" && <PerformanceDiagnostics />}
        {playing && <HudSheetHost />}
        {playing && sheet !== "camera" && !inWarung && <ActionDock inHome={inHome} />}
      </div>
    </>
  );
}
