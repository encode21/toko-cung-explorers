import { DeliveryDetailsPanel } from "./DeliveryDetailsPanel";
import { BeginnerGuidePanel } from "./BeginnerGuidePanel";
import { KulakanBook } from "./KulakanBook";
import { WarungKasBalance } from "./WarungKasBalance";
import { House } from "lucide-react";
import { MountainOutfitPanel } from "./MountainOutfitPanel";
import { FishingSettings } from "./FishingHud";
import { FishInventory } from "./FishInventory";
import { PhotoCameraPanel } from "./PhotoCameraPanel";
import { GameSettingsPanel } from "@/ui/game-ui/GameSettingsPanel";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { ChatPanel } from "@/ui/chat/WorldChat";
import { WorldMap } from "@/ui/minimap/WorldMap";
import { ProfilePage } from "@/ui/profile/ProfilePage";
import { DailyLoginPanel } from "./DailyLoginPanel";
import { PahlawanEventPanel } from "./PahlawanEventPanel";
import { ShopPage } from "./ShopPage";
import { AppearancePage } from "./AppearancePage";
import { ActivityFeedPanel } from "./ActivityFeedPanel";
import { ExplorePanel } from "./ExplorePanel";
import { HelpPanel } from "./HelpPanel";
import { PhoneAppScreen, PhonePanel } from "./PhonePanel";
import { MissionsPanel } from "./MissionsPanel";
import { CalendarApp } from "./CalendarApp";
import { WeatherForecastPanel } from "./WeatherForecastPanel";
import { OjekPanel } from "./OjekPanel";
import { GarasiPanel } from "./GarasiPanel";
import { ShowroomPanel } from "./ShowroomPanel";
import { CngBankApp, NotesApp } from "./PhoneMoneyApps";
import { CungChatApp } from "./CungChatApp";
import { SosmedApp } from "./SosmedApp";
import { TokoCungApp } from "./TokoCungApp";
import { UsahaListPanel } from "./UsahaListPanel";
import { WarungPanel } from "./WarungPanel";
import { GrosirDrawer } from "./GrosirDrawer";
import { WarungCommunityPanel } from "./WarungCommunityPanel";
import { WarungDecorPanel } from "./WarungDecorPanel";
import "./daily-panels.css";

import { SecretArchivePanel } from "@/ui/secret/SecretArchivePanel";

const TITLES = {
  settings: "Pengaturan Game",
  map: "Peta Dunia",
  explore: "Jelajah",
  chat: "Obrolan",
  help: "Panduan",
  archive: "Arsip Rahasia",
} as const;

function restoreHudFocus(event: Event, shortcut: string, fallback = '[data-side-action="phone"]') {
  event.preventDefault();
  // A phone app can replace this modal with another panel during the same render.
  requestAnimationFrame(() => {
    const panels = document.querySelectorAll<HTMLElement>("[data-game-panel]");
    const panel = panels[panels.length - 1];
    if (panel) {
      (
        panel.querySelector<HTMLElement>(shortcut) ??
        panel.querySelector<HTMLElement>("[data-game-close]")
      )?.focus();
      return;
    }
    (
      document.querySelector<HTMLElement>(shortcut) ?? document.querySelector<HTMLElement>(fallback)
    )?.focus();
  });
}

/** Bottom sheet di ponsel, panel mengambang di desktop. */
export function HudSheetHost() {
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  if (!sheet || sheet === "club" || sheet === "dance") return null;
  if (sheet === "grosir") return <GrosirDrawer />;
  if (sheet === "delivery")
    return (
      <DeliveryDetailsPanel
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[data-side-action="delivery"]')}
      />
    );
  if (sheet === "mountain-outfits") return <MountainOutfitPanel />;
  if (sheet === "pahlawan-event") return <PahlawanEventPanel />;
  if (sheet === "beginner-guide") return <BeginnerGuidePanel />;
  if (sheet === "weather")
    return (
      <WeatherForecastPanel
        onCloseAutoFocus={(event) =>
          restoreHudFocus(event, "[data-weather-shortcut]", ".mmo-clock-pill")
        }
      />
    );
  if (sheet === "kulakan-book") return <KulakanBook />;
  if (sheet === "camera") return <PhotoCameraPanel />;
  if (sheet === "quests" || sheet === "fishing-settings")
    return (
      <GameModal
        title={sheet === "quests" ? "Kerja Sambilan" : "Memancing"}
        className={sheet === "quests" ? "game-quest-journal-sheet" : "game-fishing-sheet"}
        bodyClassName={sheet === "quests" ? "game-scroll-flush activity-journal-body" : ""}
        onClose={() => setSheet(null)}
      >
        <>{sheet === "quests" ? <MissionsPanel tab="story" /> : <FishingSettings />}</>
      </GameModal>
    );
  if (sheet === "inventory")
    return (
      <GameModal
        title="Inventory · Koleksi ikan"
        subtitle="Tangkapan tersimpan di akun Toko Cung."
        className="fishing-collection"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[data-phone-app="inventory"]')}
      >
        <FishInventory />
      </GameModal>
    );
  if (sheet === "feed")
    return (
      <ActivityFeedPanel
        onCloseAutoFocus={(event, opener) =>
          restoreHudFocus(
            event,
            opener === "activity" ? '[data-phone-shortcut="feed"]' : ".phone-notification",
          )
        }
      />
    );
  if (sheet === "warung-decor") return <WarungDecorPanel />;
  if (sheet === "warung-community") return <WarungCommunityPanel />;
  if (sheet === "warung")
    return (
      <GameModal
        key="warung"
        title="Warungku"
        className="game-warung-sheet warung-management-sheet"
        headerAccessory={<WarungKasBalance />}
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[data-phone-app="warung"]')}
      >
        <WarungPanel />
      </GameModal>
    );
  if (sheet === "showroom") return <ShowroomPanel />;
  if (sheet === "garasi")
    return (
      <GameModal
        key="garasi"
        title="Garasi"
        className="game-warung-sheet game-ojek-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[data-phone-app="garasi"]')}
      >
        <GarasiPanel />
      </GameModal>
    );
  if (
    sheet === "ojek" ||
    sheet === "cungchat" ||
    sheet === "notes" ||
    sheet === "calendar" ||
    sheet === "cngbank" ||
    sheet === "sosmed" ||
    sheet === "tokocung"
  ) {
    const app = {
      ojek: ["Ojek", <OjekPanel key="o" />],
      cungchat: ["Chat", <CungChatApp key="c" />],
      notes: ["Notes", <NotesApp key="n" />],
      calendar: ["Kalender", <CalendarApp key="k" />],
      cngbank: ["CNG Bank", <CngBankApp key="b" />],
      sosmed: ["CungGram", <SosmedApp key="s" />],
      tokocung: ["Toko Grosir", <TokoCungApp key="t" />],
    }[sheet];
    return (
      <GameModal
        key={sheet}
        title={app[0] as string}
        className="game-phone-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet("phone")}
        closeLabel="Home handphone"
        closeIcon={<House aria-hidden />}
        onCloseAutoFocus={(event) => restoreHudFocus(event, `[data-phone-app="${sheet}"]`)}
      >
        {sheet === "tokocung" || sheet === "cngbank" || sheet === "sosmed" ? (
          app[1]
        ) : (
          <PhoneAppScreen app={sheet} title={app[0] as string}>
            {app[1]}
          </PhoneAppScreen>
        )}
      </GameModal>
    );
  }
  if (sheet === "usaha")
    return (
      <GameModal
        key="usaha"
        title="Usaha"
        className="game-warung-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[data-phone-app="usaha"]')}
      >
        <UsahaListPanel />
      </GameModal>
    );
  if (sheet === "profile") {
    return <ProfilePage onClose={() => setSheet(null)} />;
  }
  if (sheet === "shop") {
    return <ShopPage onClose={() => setSheet(null)} />;
  }
  if (sheet === "appearance") {
    return <AppearancePage onClose={() => setSheet(null)} />;
  }
  if (sheet === "explore") {
    return (
      <GameModal
        key="explore"
        title={TITLES.explore}
        className="game-explore-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) =>
          restoreHudFocus(event, '[data-side-action="explore"]', '[data-phone-shortcut="explore"]')
        }
      >
        <ExplorePanel />
      </GameModal>
    );
  }
  if (sheet === "help") {
    return (
      <GameModal
        key="help"
        title={TITLES.help}
        className="game-help-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) =>
          restoreHudFocus(event, '[data-phone-shortcut="help"]', '[data-side-action="phone"]')
        }
      >
        <HelpPanel />
      </GameModal>
    );
  }
  if (sheet === "archive") {
    return (
      <GameModal
        key="archive"
        title={TITLES.archive}
        className="game-archive-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) =>
          restoreHudFocus(event, '[data-phone-shortcut="archive"]', '[data-side-action="phone"]')
        }
      >
        <SecretArchivePanel />
      </GameModal>
    );
  }
  if (sheet === "settings") {
    return (
      <GameModal
        key="settings"
        title={TITLES.settings}
        className="game-settings-modal"
        bodyClassName="game-settings-body"
        wide
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[data-side-action="phone"]')}
      >
        <GameSettingsPanel />
      </GameModal>
    );
  }
  if (sheet === "daily-missions" || sheet === "daily-login" || sheet === "phone") {
    const close = () => setSheet(null);
    const titles = {
      "daily-missions": "Misi",
      "daily-login": "Login Harian",
      phone: "Handphone",
    };
    const classes = {
      "daily-missions": "game-daily-mission-sheet",
      "daily-login": "game-daily-login-sheet",
      phone: "game-phone-sheet",
    };
    return (
      <GameModal
        key={sheet}
        title={titles[sheet]}
        className={classes[sheet]}
        wide={sheet === "daily-login"}
        bodyClassName="game-scroll-flush"
        onClose={close}
        onCloseAutoFocus={(event) => restoreHudFocus(event, `[data-side-action="${sheet}"]`)}
      >
        {sheet === "daily-missions" && <MissionsPanel tab="daily" />}
        {sheet === "daily-login" && <DailyLoginPanel />}
        {sheet === "phone" && <PhonePanel />}
      </GameModal>
    );
  }
  if (sheet === "map") {
    return (
      <GameModal
        key="map"
        title={TITLES.map}
        className="game-map-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => restoreHudFocus(event, '[aria-label="Perbesar peta"]')}
      >
        <WorldMap />
      </GameModal>
    );
  }
  if (sheet === "chat") {
    return (
      <GameModal
        key="chat"
        title={TITLES.chat}
        className="game-chat-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) =>
          restoreHudFocus(event, "[data-chat-preview]", "[data-chat-quick-toggle]")
        }
      >
        <ChatPanel />
      </GameModal>
    );
  }
  return null;
}
