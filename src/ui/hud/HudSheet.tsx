import { GameSettingsPanel } from "@/ui/game-ui/GameSettingsPanel";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { ChatPanel } from "@/ui/chat/WorldChat";
import { WorldMap } from "@/ui/minimap/WorldMap";
import { ProfilePage } from "@/ui/profile/ProfilePage";
import { DailyMissionPanel } from "./DailyMissionPanel";
import { DailyLoginPanel } from "./DailyLoginPanel";
import { ShopPage } from "./ShopPage";
import { AppearancePage } from "./AppearancePage";
import { ActivityFeedPanel } from "./ActivityFeedPanel";
import { ExplorePanel } from "./ExplorePanel";
import { HelpPanel } from "./HelpPanel";
import { PhonePanel } from "./PhonePanel";
import "./daily-panels.css";

import { SecretArchivePanel } from "@/ui/secret/SecretArchivePanel";

const TITLES = {
  settings: "Pengaturan Game",
  map: "Peta Dunia",
  explore: "Jelajah",
  chat: "Obrolan",
  feed: "Aktivitas Dunia",
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
      panel.querySelector<HTMLElement>("[data-game-close]")?.focus();
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
  if (sheet === "profile") {
    return <ProfilePage onClose={() => setSheet(null)} />;
  }
  if (sheet === "shop") {
    return <ShopPage onClose={() => setSheet(null)} />;
  }
  if (sheet === "appearance") {
    return <AppearancePage onClose={() => setSheet(null)} />;
  }
  if (sheet === "feed") {
    return (
      <GameModal
        key="feed"
        title={TITLES.feed}
        className="game-feed-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) =>
          restoreHudFocus(event, '[data-phone-shortcut="feed"]', '[data-side-action="phone"]')
        }
      >
        <ActivityFeedPanel />
      </GameModal>
    );
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
      "daily-missions": "Daily Mission",
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
        {sheet === "daily-missions" && <DailyMissionPanel />}
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
