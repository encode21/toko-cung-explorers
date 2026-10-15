import { Bell, House, Mail, Settings, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { useDungeon } from "@/game/dungeon/store";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { PhoneAppArtwork, type PhoneAppKind } from "./PhoneAppArtwork";
import "./phone-panel.css";

const APPS = [
  { id: "map", label: "Peta", accessible: "Peta", color: "#69bfdc" },
  { id: "quest", label: "Quest", accessible: "Quest", color: "#ffc94c" },
  {
    id: "daily-missions",
    label: "Misi Harian",
    accessible: "Misi Harian",
    color: "#ff986b",
  },
  { id: "shop", label: "Toko", accessible: "Toko", color: "#fb89af" },
  {
    id: "profile",
    label: "Karakter",
    accessible: "Karakter & Point",
    color: "#ff99bc",
  },
  {
    id: "daily-login",
    label: "Login Harian",
    accessible: "Login Harian",
    color: "#a78add",
  },
  { id: "explore", label: "Jelajah", accessible: "Jelajah", color: "#64cec4" },
  {
    id: "archive",
    label: "Arsip",
    accessible: "Arsip rahasia",
    color: "#c09add",
  },
  {
    id: "help",
    label: "Panduan",
    accessible: "Panduan kontrol",
    color: "#eda86e",
  },
] as const;
const WORLD_APPS = new Set<string>(["map", "quest", "daily-missions", "shop", "explore"]);
const SHORTCUTS = [
  { id: "feed", label: "Aktivitas", accessible: "Aktivitas dunia", Icon: Mail },
  { id: "profile", label: "Infoku", accessible: "Infoku", Icon: UserRound },
  { id: "settings", label: "Pengaturan", accessible: "Buka pengaturan", Icon: Settings },
] as const;

/** Phone applications route to the existing game panels. */
export function PhonePanel() {
  const setSheet = useHud((state) => state.setSheet);
  const unseen = useHud((state) => state.unseen);
  const time = useSceneTime((state) => state.currentTime);
  const openKiosk = useGame((state) => state.openKiosk);
  const dungeon = useDungeon((state) => !!state.data?.instance);

  const openApp = (id: PhoneAppKind) => {
    if (useDungeon.getState().data?.instance && WORLD_APPS.has(id)) return;
    if (id === "quest") {
      setSheet(null);
      openKiosk();
      return;
    }
    setSheet(id);
  };

  return (
    <div className="phone-panel" data-phone-panel>
      <div className="phone-status">
        <button
          type="button"
          className="phone-notification"
          aria-label="Notifikasi handphone"
          onClick={() => openApp("feed")}
        >
          <Bell aria-hidden />
          {unseen > 0 && <span className="phone-notification-dot" aria-hidden />}
        </button>
        <span className="phone-clock">
          <time dateTime={time} aria-label={`Waktu dunia ${time}`}>
            {time}
          </time>
        </span>
        <span className="phone-status-spacer" aria-hidden />
      </div>
      <div className="phone-content">
        <nav className="phone-app-grid" aria-label="Aplikasi handphone">
          {APPS.filter(({ id }) => !dungeon || !WORLD_APPS.has(id)).map(
            ({ id, label, accessible, color }) => (
              <button
                key={id}
                type="button"
                className="phone-app"
                data-phone-app={id}
                aria-label={accessible}
                onClick={() => openApp(id)}
                style={{ "--phone-app-color": color } as CSSProperties}
              >
                <span className="phone-app-icon" aria-hidden>
                  <PhoneAppArtwork kind={id} />
                </span>
                <span className="phone-app-label">{label}</span>
              </button>
            ),
          )}
        </nav>
      </div>
      <nav className="phone-footer" data-phone-footer aria-label="Menu handphone">
        {SHORTCUTS.map(({ id, label, accessible, Icon }) => (
          <button
            key={id}
            type="button"
            className="phone-footer-button"
            data-phone-shortcut={id}
            aria-label={accessible}
            onClick={() => openApp(id)}
          >
            <span className="phone-footer-icon" aria-hidden>
              <Icon />
            </span>
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className="phone-footer-button"
          data-phone-shortcut="world"
          aria-label="Kembali ke dunia"
          onClick={() => setSheet(null)}
        >
          <span className="phone-footer-icon" aria-hidden>
            <House />
          </span>
          <span>Dunia</span>
        </button>
      </nav>
    </div>
  );
}
