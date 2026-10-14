import { GameSettingsPanel } from "@/ui/game-ui/GameSettingsPanel";
import { GameModal, GamePanel } from "@/ui/game-ui/GamePanel";
import type { ReactNode } from "react";
import { Navigation } from "lucide-react";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { useTouchControls } from "@/hooks/use-touch";
import { SHELVES } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";
import { ChatPanel } from "@/ui/chat/WorldChat";
import { WorldMap } from "@/ui/minimap/WorldMap";
import { ProfilePanel } from "@/ui/profile/ProfilePanel";

import { SecretArchivePanel } from "@/ui/secret/SecretArchivePanel";

const TITLES = {
  settings: "Pengaturan game",
  map: "Peta Dunia",
  explore: "Jelajah",
  chat: "Obrolan",
  profile: "Profil",
  feed: "Aktivitas Dunia",
  help: "Kontrol",
  archive: "Arsip Rahasia",
} as const;

function ExploreSheet() {
  const setWaypoint = useGame((s) => s.setWaypoint);
  const waypoint = useGame((s) => s.waypoint);
  const setSheet = useHud((s) => s.setSheet);
  return (
    <div className="space-y-3">
      <p className="text-world-muted text-xs">
        Jelajahi area toko — panah penunjuk arah akan memandumu.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SHELVES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setWaypoint(s.id);
              setSheet(null);
            }}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-world-panel-foreground transition hover:bg-world-panel ${
              waypoint === s.id ? "bg-world-panel ring-1 ring-world-accent" : "bg-world-panel/50"
            }`}
          >
            <Navigation className="size-4 shrink-0 text-world-accent" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-sm">{s.label}</span>
              <span className="text-world-muted text-[11px]">Area eksplorasi</span>
            </span>
          </button>
        ))}
      </div>
      {waypoint && (
        <button
          type="button"
          onClick={() => setWaypoint(null)}
          className="min-h-11 rounded-lg border border-world-outline px-3 text-xs"
        >
          Hentikan penunjuk lokasi
        </button>
      )}
      <p className="pt-1 text-world-muted text-[11px] uppercase tracking-widest">Di sekitar toko</p>
      <div className="flex flex-wrap gap-1.5">
        {PLACES.map((p) => (
          <span key={p.id} className="rounded-full bg-world-panel px-3 py-1.5 text-xs">
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function FeedSheet() {
  const events = useHud((s) => s.events);
  const activity = events.filter((event) => event.tone === "npc");
  return (
    <div className="space-y-3">
      {!activity.length && (
        <p className="text-world-muted text-xs">
          Belum ada aktivitas NPC yang tercatat di sesi ini.
        </p>
      )}
      <ul className="space-y-1.5 text-xs">
        {activity.slice(0, 12).map((e) => (
          <li key={e.id} className="flex gap-2">
            <span className="shrink-0 text-world-muted">
              {new Date(e.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpSheet() {
  const touch = useTouchControls();
  const rows = touch
    ? [
        "Analog kiri: jalan (maju/mundur/kiri/kanan)",
        "Geser kanan layar: putar kamera (bisa bersamaan dengan analog)",
        "Tombol tangan / panel konteks: interaksi",
      ]
    : [
        "Klik kanan tahan + geser: jalan & putar arah",
        "WASD jalan · Shift lari",
        "Q / E putar kamera",
        "F interaksi · Esc tutup",
      ];
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <li key={r} className="rounded-xl bg-world-panel px-3 py-2">
          {r}
        </li>
      ))}
    </ul>
  );
}

const BODIES: Record<keyof typeof TITLES, () => ReactNode> = {
  settings: GameSettingsPanel,
  map: WorldMap,
  explore: ExploreSheet,
  chat: ChatPanel,
  profile: ProfilePanel,
  feed: FeedSheet,
  help: HelpSheet,
  archive: SecretArchivePanel,
};

/** Bottom sheet di ponsel, panel mengambang di desktop. */
export function HudSheetHost() {
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  if (!sheet || sheet === "club" || sheet === "dance") return null;
  if (sheet === "map") {
    return (
      <GameModal
        title={TITLES.map}
        className="game-map-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>('[data-world-dock] [aria-label="Peta"]')?.focus();
        }}
      >
        <WorldMap />
      </GameModal>
    );
  }
  if (sheet === "chat") {
    return (
      <GameModal
        title={TITLES.chat}
        className="game-chat-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => setSheet(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>("[data-chat-preview]")?.focus();
        }}
      >
        <ChatPanel />
      </GameModal>
    );
  }
  const Body = BODIES[sheet];
  return (
    <GamePanel
      title={TITLES[sheet]}
      onClose={() => setSheet(null)}
      wide={sheet === "profile"}
      bodyClassName={sheet === "profile" ? "game-scroll-flush" : ""}
    >
      <Body />
    </GamePanel>
  );
}
