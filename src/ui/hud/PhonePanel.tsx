import {
  BatteryFull,
  Bell,
  BookMarked,
  ClipboardCheck,
  Compass,
  Gift,
  HelpCircle,
  Map,
  ScrollText,
  Settings,
  ShoppingBag,
  Signal,
  Sparkles,
  UserRound,
  Volume2,
  Wifi,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMusic } from "@/game/audio/music-store";
import { useDungeon } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { AudioSettingsPanel } from "./GameMenu";
import "./phone-panel.css";

const APPS = [
  { id: "map", label: "Peta", accessible: "Peta", Icon: Map, color: "#73b28c" },
  { id: "quest", label: "Quest", accessible: "Quest", Icon: ScrollText, color: "#e1ab66" },
  {
    id: "daily-missions",
    label: "Misi Harian",
    accessible: "Misi Harian",
    Icon: ClipboardCheck,
    color: "#96a7db",
  },
  { id: "shop", label: "Toko", accessible: "Toko", Icon: ShoppingBag, color: "#df91a6" },
  {
    id: "profile",
    label: "Karakter",
    accessible: "Karakter & Point",
    Icon: UserRound,
    color: "#a893d3",
  },
  {
    id: "daily-login",
    label: "Login Harian",
    accessible: "Login Harian",
    Icon: Gift,
    color: "#dc9a77",
  },
  { id: "explore", label: "Jelajah", accessible: "Jelajah", Icon: Compass, color: "#79b4ba" },
  {
    id: "archive",
    label: "Arsip",
    accessible: "Arsip rahasia",
    Icon: BookMarked,
    color: "#b8a28c",
  },
  { id: "feed", label: "Aktivitas", accessible: "Notifikasi", Icon: Bell, color: "#dbba65" },
  {
    id: "settings",
    label: "Pengaturan",
    accessible: "Pengaturan game",
    Icon: Settings,
    color: "#93a6bb",
  },
  {
    id: "audio",
    label: "Suara & Musik",
    accessible: "Atur volume musik & efek",
    Icon: Volume2,
    color: "#c49ac3",
  },
  {
    id: "help",
    label: "Panduan",
    accessible: "Panduan kontrol",
    Icon: HelpCircle,
    color: "#8daf9a",
  },
] as const;
const WORLD_APPS = new Set<string>(["map", "quest", "daily-missions", "shop", "explore"]);

/** Phone applications route to the existing game panels; audio stays in its own local screen. */
export function PhonePanel() {
  const [screen, setScreen] = useState<"home" | "audio">("home");
  const setSheet = useHud((state) => state.setSheet);
  const openKiosk = useGame((state) => state.openKiosk);
  const ensureStarted = useMusic((state) => state.ensureStarted);
  const dungeon = useDungeon((state) => !!state.data?.instance);
  const audioTile = useRef<HTMLButtonElement>(null);
  const audioScreen = useRef<HTMLElement>(null);
  const previousScreen = useRef(screen);

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    const target =
      screen === "audio"
        ? audioScreen.current?.querySelector<HTMLButtonElement>("button")
        : audioTile.current;
    target?.focus();
  }, [screen]);

  const openApp = (id: (typeof APPS)[number]["id"]) => {
    if (useDungeon.getState().data?.instance && WORLD_APPS.has(id)) return;
    if (id === "audio") {
      setScreen("audio");
      void ensureStarted();
      return;
    }
    if (id === "quest") {
      setSheet(null);
      openKiosk();
      return;
    }
    setSheet(id);
  };

  return (
    <div className="phone-panel" data-phone-panel>
      <div className="phone-status" aria-hidden>
        <span>TOKOCUNG</span>
        <span className="phone-notch" />
        <span className="phone-status-icons">
          <Signal />
          <Wifi />
          <BatteryFull />
        </span>
      </div>
      <div className="phone-content">
        <div className="phone-heading">
          <span className="phone-heading-kicker">
            <Sparkles aria-hidden /> SAKU PETUALANGAN
          </span>
          <h3>{screen === "home" ? "Halo, penjelajah!" : "Suara & musik"}</h3>
          <p>
            {screen === "home"
              ? "Mau ke mana hari ini?"
              : "Atur suara untuk menemani petualanganmu."}
          </p>
        </div>

        {screen === "home" ? (
          <nav className="phone-app-grid" aria-label="Aplikasi handphone">
            {APPS.filter(({ id }) => !dungeon || !WORLD_APPS.has(id)).map(
              ({ id, label, accessible, Icon, color }) => (
                <button
                  key={id}
                  ref={id === "audio" ? audioTile : undefined}
                  type="button"
                  className="phone-app"
                  aria-label={accessible}
                  onClick={() => openApp(id)}
                  style={{ "--phone-app-color": color } as CSSProperties}
                >
                  <span className="phone-app-icon" aria-hidden>
                    <Icon />
                  </span>
                  <span className="phone-app-label">{label}</span>
                </button>
              ),
            )}
          </nav>
        ) : (
          <section
            ref={audioScreen}
            className="phone-audio"
            data-phone-audio
            aria-label="Pengaturan audio"
          >
            <AudioSettingsPanel backLabel="Kembali ke aplikasi" onBack={() => setScreen("home")} />
          </section>
        )}
      </div>
      <div className="phone-footer">
        <button
          type="button"
          className="phone-home-button"
          aria-label={screen === "audio" ? "Beranda handphone" : "Kembali ke dunia"}
          onClick={() => (screen === "audio" ? setScreen("home") : setSheet(null))}
        >
          <span aria-hidden />
        </button>
      </div>
    </div>
  );
}
