import type { ReactNode } from "react";
import { Navigation, X } from "lucide-react";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { useOps } from "@/state/ops-store";
import { useTouchControls } from "@/hooks/use-touch";
import { SHELVES } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";
import { PRODUCTS } from "@/commerce/products/catalog";
import { COURIERS, POS_SUMMARY, REORDER_LIST } from "@/commerce/products/tokocung-inventory";
import { ChatPanel } from "@/ui/chat/WorldChat";
import { MAP_LEGEND, Minimap } from "@/ui/minimap/Minimap";
import { ProfilePanel } from "@/ui/profile/ProfilePanel";

const TITLES = {
  map: "Peta Dunia",
  explore: "Jelajah",
  chat: "Obrolan",
  profile: "Profil",
  feed: "Aktivitas Dunia",
  help: "Kontrol",
} as const;

const TRUCK_TEXT: Record<string, string> = {
  away: "Belum datang",
  incoming: "Menuju toko",
  loading: "Sedang muat",
  leaving: "Berangkat",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-world-panel px-3 py-2 text-xs">
      <span className="text-world-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MapSheet() {
  const touch = useTouchControls();
  const size = Math.min(touch ? 300 : 340, typeof window === "undefined" ? 300 : window.innerWidth - 56);
  return (
    <div className="flex flex-col items-center gap-3">
      <Minimap size={size} range={110} follow={false} />
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {MAP_LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExploreSheet() {
  const setWaypoint = useGame((s) => s.setWaypoint);
  const waypoint = useGame((s) => s.waypoint);
  const setSheet = useHud((s) => s.setSheet);
  return (
    <div className="space-y-3">
      <p className="text-world-muted text-xs">Pilih rak — panah penunjuk arah akan memandumu.</p>
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
              <span className="text-world-muted text-[11px]">{PRODUCTS.filter((p) => p.shelf === s.id).length} produk</span>
            </span>
          </button>
        ))}
      </div>
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
  const pending = useOps((s) => s.pendingOrders);
  const pallet = useOps((s) => s.palletBoxes);
  const shipped = useOps((s) => s.shipped);
  const truck = useOps((s) => s.truck);
  const awaiting = COURIERS.reduce((sum, c) => sum + c.awaitingPickup, 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <Row label="Menunggu packing" value={`${pending}`} />
        <Row label="Dus di palet" value={`${pallet}`} />
        <Row label="Terkirim hari ini" value={`${shipped}`} />
        <Row label="Pickup kurir" value={`${awaiting}`} />
        <Row label="Truk" value={TRUCK_TEXT[truck] ?? "—"} />
        <Row label="Transaksi kasir" value={`${POS_SUMMARY.transactions}`} />
        <Row label="Jam tersibuk" value={POS_SUMMARY.peakHour} />
        <Row label="Perlu restock" value={`${REORDER_LIST.length} item`} />
      </div>
      <ul className="space-y-1.5 text-xs">
        {events.slice(0, 12).map((e) => (
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
    : ["Klik kanan tahan + geser: jalan & putar arah", "WASD jalan · Shift lari", "Q / E putar kamera", "F interaksi · Esc tutup"];
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
  map: MapSheet,
  explore: ExploreSheet,
  chat: ChatPanel,
  profile: ProfilePanel,
  feed: FeedSheet,
  help: HelpSheet,
};

/** Bottom sheet di ponsel, panel mengambang di desktop. */
export function HudSheetHost() {
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  if (!sheet) return null;
  const Body = BODIES[sheet];
  return (
    <section
      data-ui-panel
      aria-label={TITLES[sheet]}
      className={`pointer-events-auto absolute inset-x-2 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4rem)] flex flex-col rounded-3xl p-4 hud-glass animate-in fade-in slide-in-from-bottom-4 sm:inset-x-auto sm:right-4 sm:bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] sm:w-[24rem] ${sheet === "profile" ? "max-h-[calc(100dvh-6rem)] sm:max-h-[76dvh] sm:w-[28rem]" : "max-h-[62dvh]"}`}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-world-outline sm:hidden" />
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl leading-none tracking-wide">{TITLES[sheet].toUpperCase()}</h2>
        <button
          type="button"
          onClick={() => setSheet(null)}
          aria-label="Tutup"
          className="grid size-11 place-items-center rounded-full text-world-panel-foreground hover:bg-world-panel"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="hud-scroll flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        <Body />
      </div>
    </section>
  );
}
