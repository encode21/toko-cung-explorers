import { Bell, House, Mail, Settings, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { useDungeon } from "@/game/dungeon/store";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { PhoneAppArtwork, type PhoneAppKind } from "./PhoneAppArtwork";
import { PHONE_PERIODS, phoneSky, type PhoneSky } from "./phone-time";
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
    id: "appearance",
    label: "Pakaian",
    accessible: "Pakaian",
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

function PeriodIcon({ kind }: { kind: PhoneSky }) {
  if (kind === "late") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 5a7 7 0 1 0 7 12A6 6 0 0 1 11 5Z" fill="currentColor" />
        <path
          d="M16 4h4l-4 5h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "dawn" || kind === "dusk") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 17.5h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M6 15a6 6 0 0 1 12 0Z" fill="currentColor" />
        <path
          d={kind === "dawn" ? "M12 6V3M7 8 5 6M17 8l2-2" : "M12 3v4m-2-2 2 2 2-2"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "day") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.4" fill="currentColor" />
        <path
          d="M12 3.8v2.2M12 18v2.2M3.8 12h2.2M18 12h2.2M6.4 6.4l1.5 1.5M16.1 16.1l1.5 1.5M17.6 6.4l-1.5 1.5M7.9 16.1l-1.5 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.2 5.2A6.4 6.4 0 1 0 18.8 14 5.6 5.6 0 0 1 14.2 5.2Z" fill="currentColor" />
      <path
        d="m17.6 6.2 1.1-1.9 1.1 1.9 2 .4-1.4 1.5.3 2-1.9-.9-1.9.9.3-2-1.4-1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function SkyDecoration({ sky }: { sky: PhoneSky }) {
  if (sky === "day") {
    return (
      <svg className="phone-sky-deco" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="40" cy="34" r="16" fill="#ffe27a" />
        <path
          d="M40 8v6M40 54v6M12 34h6M62 34h6M20 16l4 4M56 48l4 4M56 16l-4 4M20 48l-4 4"
          fill="none"
          stroke="#ffe27a"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (sky === "dawn" || sky === "dusk") {
    return (
      <svg className="phone-sky-deco" viewBox="0 0 72 72" aria-hidden="true">
        <path d="M18 47a18 18 0 0 1 36 0Z" fill={sky === "dusk" ? "#ffcf70" : "#ffe6a0"} />
        <path d="M10 49h52M20 56h32" stroke="#fff6e0" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M36 17v5M16 27l4 3M56 27l-4 3"
          fill="none"
          stroke="#ffe2a8"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className="phone-sky-deco" viewBox="0 0 72 72" aria-hidden="true">
      <path d="M42 14a20 20 0 1 0 14 34 16 16 0 0 1-14-34Z" fill="#ffe27a" />
      <path d="m52 18 2.2-3.8 2.2 3.8 4 .8-2.8 3 .6 4-3.8-1.8-3.8 1.8.6-4-2.8-3z" fill="#fff4b8" />
      <path
        d="m58 34 1.4-2.4 1.4 2.4 2.5.5-1.8 1.8.4 2.5-2.4-1.1-2.4 1.1.4-2.5-1.8-1.8z"
        fill="#fff4b8"
      />
    </svg>
  );
}

/** Phone applications route to the existing game panels. */
export function PhonePanel() {
  const setSheet = useHud((state) => state.setSheet);
  const unseen = useHud((state) => state.unseen);
  const time = useSceneTime((state) => state.currentTime);
  const timeOfDay = useSceneTime((state) => state.timeOfDay);
  const minutes = useSceneTime((state) => state.minutes);
  const openKiosk = useGame((state) => state.openKiosk);
  const dungeon = useDungeon((state) => !!state.data?.instance);
  const sky = phoneSky(timeOfDay, minutes);

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
    <div className="phone-panel" data-phone-panel data-phone-sky={sky}>
      <header className="phone-status" data-phone-status>
        <button
          type="button"
          className="phone-notification"
          aria-label="Aktivitas dunia"
          onClick={() => openApp("feed")}
        >
          <Bell aria-hidden />
          {unseen > 0 && <span className="phone-notification-dot" aria-hidden />}
        </button>
        <div className="phone-status-center">
          <time className="phone-clock" dateTime={time} aria-label={`Waktu dunia ${time}`}>
            {time}
          </time>
          <div className="phone-period-row" role="list" aria-label="Periode hari">
            {PHONE_PERIODS.map(({ id: period, label }) => (
              <span
                key={period}
                role="listitem"
                className={`phone-period${sky === period ? " is-active" : ""}`}
                aria-current={sky === period ? "true" : undefined}
                aria-label={label}
                title={label}
              >
                <PeriodIcon kind={period} />
              </span>
            ))}
          </div>
        </div>
        <span className="phone-status-art" aria-hidden="true">
          <SkyDecoration sky={sky} />
        </span>
      </header>
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
