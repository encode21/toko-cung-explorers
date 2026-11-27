import { loadMissions, missionsReady, useWorldMissions } from "@/game/world-missions/store";
import { MissionDot } from "./MissionNotifications";
import { usePhoneNotices } from "./use-phone-notices";
import { ArrowLeft, Bell, House } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { useDungeon } from "@/game/dungeon/store";
import { useSceneTime } from "@/game/time/scene-time";
import { useHud } from "@/state/hud-store";
import { PhoneAppArtwork, type PhoneAppKind } from "./PhoneAppArtwork";
import { PHONE_PERIODS, phoneSky, type PhoneSky } from "./phone-time";
import { OjekBidCard } from "./OjekBidCard";
import { PhoneDockLens } from "./PhoneDockLens";
import "./phone-panel.css";

const APPS = [
  // Business first (warung, grosir, ojek, usaha and their money/chat/calendar), then play and extras.
  { id: "warung", label: "Warungku", accessible: "Warungku, warung simulasi", color: "#ffce8a" },
  {
    id: "tokocung",
    label: "Toko Grosir",
    accessible: "Toko Grosir: belanja grosir online, diantar truk",
    color: "#f5b2ac",
  },
  { id: "ojek", label: "Ojek", accessible: "Ojek, narik penumpang", color: "#a8d9be" },
  { id: "usaha", label: "Usaha", accessible: "Usaha: warung, warteg, kos, ojek", color: "#f8d887" },
  {
    id: "cngbank",
    label: "CNG Bank",
    accessible: "CNG Bank: saldo Kas, mutasi, bayar sewa",
    color: "#afcce9",
  },
  {
    id: "cungchat",
    label: "Chat",
    accessible: "Chat: Koko Cung & pelanggan",
    color: "#a6dfbe",
  },
  {
    id: "calendar",
    label: "Kalender",
    accessible: "Kalender dunia: tanggal, hujan, jatuh tempo utang",
    color: "#cfe8f5",
  },
  {
    id: "notes",
    label: "Notes",
    accessible: "Notes: catatan utang & pengeluaran",
    color: "#ffe095",
  },
  {
    id: "garasi",
    label: "Garasi",
    accessible: "Garasi, panggil atau parkir kendaraanmu",
    color: "#abd4ee",
  },
  {
    id: "daily-missions",
    label: "Misi Harian",
    accessible: "Misi Harian",
    color: "#ff986b",
  },
  { id: "quest", label: "Kerja Sambilan", accessible: "Kerja Sambilan", color: "#ffc94c" },
  { id: "map", label: "Peta", accessible: "Peta", color: "#69bfdc" },
  { id: "inventory", label: "Inventory", accessible: "Inventory ikan", color: "#64cec4" },
  { id: "camera", label: "Kamera", accessible: "Kamera selfie dan belakang", color: "#69bfdc" },
  {
    id: "sosmed",
    label: "CungGram",
    accessible: "CungGram: update status & upload klip",
    color: "#a7d8c6",
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
const WORLD_APPS = new Set<string>([
  "map",
  "daily-missions",
  "shop",
  "explore",
  "warung",
  "usaha",
  "ojek",
  "garasi",
  "tokocung",
  "cungchat",
  "notes",
  "calendar",
  "cngbank",
]);
// Solid dock glyphs keep their silhouettes legible at phone scale.
const SHORTCUTS = [
  {
    id: "world",
    label: "Home",
    accessible: "Home, kembali ke dunia",
    glyph:
      "M2.5 10.2a2.3 2.3 0 0 1 .9-1.8l7.2-5.7a2.3 2.3 0 0 1 2.8 0l7.2 5.7a2.3 2.3 0 0 1 .9 1.8V20a1.8 1.8 0 0 1-1.8 1.8h-4.5a.8.8 0 0 1-.8-.8v-5.8h-4.8V21a.8.8 0 0 1-.8.8H4.3A1.8 1.8 0 0 1 2.5 20Z",
  },
  {
    id: "feed",
    label: "Aktivitas",
    accessible: "Aktivitas dunia",
    glyph:
      "M5 4h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm-.8 3.4 6.5 5.2a2 2 0 0 0 2.6 0l6.5-5.2-1.1-1.3-6.7 5.3-6.7-5.3Z",
  },
  {
    id: "profile",
    label: "Infoku",
    accessible: "Infoku",
    glyph:
      "M12 2a5.1 5.1 0 1 1 0 10.2A5.1 5.1 0 0 1 12 2Zm0 11.7c5.1 0 9 2.6 9 5.5 0 1.8-3.9 3.3-9 3.3s-9-1.5-9-3.3c0-2.9 3.9-5.5 9-5.5Z",
  },
  {
    id: "settings",
    label: "Pengaturan",
    accessible: "Buka pengaturan",
    glyph:
      "m10 2-.7 2.4-2 .9-2.3-1-2 3.4 1.7 1.8-.2 2.4L2.4 13l1 3.8 2.5.1 1.7 1.7.1 2.4 3.8 1 1.2-2.2 2.3-.2 1.8 1.7 3.4-2-1-2.3.9-2 2.4-.7v-4l-2.4-.7-.9-2 1-2.3-3.4-2-1.8 1.7-2.1-.7L14 2Zm2 6.3a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Z",
  },
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
  const content = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  const setSheet = useHud((state) => state.setSheet);
  const unseen = useHud((state) => state.unseen);
  const openFeed = useHud((state) => state.openFeed);
  const { unreadKeys } = usePhoneNotices();
  const time = useSceneTime((state) => state.currentTime);
  const timeOfDay = useSceneTime((state) => state.timeOfDay);
  const minutes = useSceneTime((state) => state.minutes);
  const dungeon = useDungeon((state) => !!state.data?.instance);
  const sky = phoneSky(timeOfDay, minutes);
  const missionsDot = useWorldMissions((s) => missionsReady(s.board));
  useEffect(() => void loadMissions(), []);

  const openApp = (id: PhoneAppKind) => {
    if (useDungeon.getState().data?.instance && WORLD_APPS.has(id)) return;
    if (id === "quest") {
      setSheet("quests");
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
          aria-label="Notifikasi"
          onClick={() => openFeed("inbox")}
        >
          <Bell aria-hidden />
          {unreadKeys.length > 0 && <span className="phone-notification-dot" aria-hidden />}
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
      <OjekBidCard />
      <div ref={content} className="phone-content">
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
                <span className="phone-app-icon">
                  <PhoneAppArtwork kind={id} />
                  {id === "inventory" && <MissionDot scope="inventory" />}
                  {(id === "quest" || id === "daily-missions") && missionsDot && (
                    <span
                      className="quest-notification-dot"
                      role="img"
                      aria-label="Ada hadiah misi"
                    />
                  )}
                </span>
                <span className="phone-app-label">{label}</span>
              </button>
            ),
          )}
        </nav>
      </div>
      <PhoneDockLens content={content} dock={dock} />
      <nav ref={dock} className="phone-footer" data-phone-footer aria-label="Menu handphone">
        {SHORTCUTS.map(({ id, label, accessible, glyph }) => (
          <button
            key={id}
            type="button"
            className="phone-footer-button"
            data-phone-shortcut={id}
            aria-label={accessible}
            onClick={() => {
              if (id === "world") setSheet(null);
              else if (id === "feed") openFeed("activity");
              else openApp(id);
            }}
          >
            <span className="phone-footer-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor" focusable="false">
                <path d={glyph} fillRule="evenodd" />
              </svg>
              {id === "feed" && unseen > 0 && <span className="phone-notification-dot" />}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Apps share the launcher's phone frame; their content owns the vertical scroll. */
export function PhoneAppScreen({
  app,
  title,
  headerAction,
  children,
  backAction,
}: {
  app: "ojek" | "cngbank" | "notes" | "calendar" | "cungchat" | "tokocung" | "sosmed";
  title: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  backAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    buttonRef?: Ref<HTMLButtonElement>;
  } | null;
}) {
  const time = useSceneTime((s) => s.currentTime);
  const home = () => useHud.getState().setSheet("phone");
  const focusedApp =
    app === "ojek" ||
    app === "cungchat" ||
    app === "notes" ||
    app === "cngbank" ||
    app === "sosmed";
  const compactHeader = app === "tokocung" || focusedApp;
  const back =
    backAction === undefined && !focusedApp
      ? { label: "Kembali ke handphone", onClick: home }
      : backAction;
  return (
    <div
      className="phone-panel phone-app-screen"
      data-phone-screen={app}
      data-phone-header={compactHeader ? "compact" : undefined}
    >
      <div className="phone-app-status">
        {!compactHeader && <span>cung</span>}
        <time>{time}</time>
        <span>● ● ●</span>
      </div>
      <header className="phone-app-header">
        {back && (
          <button
            type="button"
            className="phone-app-back"
            ref={backAction?.buttonRef}
            aria-label={back.label}
            onClick={back.onClick}
          >
            {backAction?.icon ?? <ArrowLeft aria-hidden />}
          </button>
        )}
        <h2>{title}</h2>
        {headerAction}
        {!compactHeader && <PhoneAppArtwork kind={app} />}
      </header>
      {app !== "ojek" && <OjekBidCard />}
      <div className="phone-app-body">{children}</div>
      {app === "calendar" && (
        <nav className="phone-app-home" aria-label="Navigasi handphone">
          <button type="button" onClick={home} aria-label="Home handphone">
            <House aria-hidden />
            <span>Home</span>
          </button>
        </nav>
      )}
    </div>
  );
}
