import { Armchair, Hand, HandFist, MessageCircle, Monitor, Package, ScanLine } from "lucide-react";
import { useGame } from "@/state/game-store";

const META = {
  mission: { verb: "Ambil Paket", Icon: Package },
  kiosk: { verb: "Gunakan Quest Board", Icon: Monitor },
  world: { verb: "Masuk Gedung", Icon: Package },
  npc: { verb: "Ajak bicara", Icon: MessageCircle },
  shelf: { verb: "Scan Barang", Icon: Package },
  cashier: { verb: "Scan Barang", Icon: ScanLine },
  bench: { verb: "Duduk", Icon: Armchair },
  player: { verb: "Sapa", Icon: Hand },
} as const;

/** Panel interaksi kontekstual — hanya muncul saat dekat sesuatu. */
export function ContextPanel({ touch }: { touch: boolean }) {
  const nearby = useGame((s) => s.nearby);
  const sitting = useGame((s) => s.sitting);
  const sittingBenchId = useGame((s) => s.sittingBenchId);
  const interact = useGame((s) => s.interact);
  const socialAct = useGame((s) => s.socialAct);
  if (!nearby) return null;

  // Mobile: di atas dock, geser ke kanan agar tidak menutupi joystick kiri.
  const bottom = touch
    ? "bottom-[calc(var(--dock-clearance,4.5rem)+7.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]";
  const place = touch
    ? "left-auto right-[max(0.75rem,env(safe-area-inset-right))] translate-x-0 max-w-[min(14.5rem,calc(100vw-8.5rem))]"
    : "-translate-x-1/2 left-1/2 max-w-[min(22rem,calc(100vw-2rem))]";

  if (nearby.kind === "player") {
    return (
      <div className={`pointer-events-auto absolute flex items-stretch gap-1.5 ${bottom} ${place}`}>
        <button
          type="button"
          data-hud-control
          onClick={() => socialAct("wave")}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left hud-glass active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 ${
            touch ? "rounded-xl py-1.5 pr-2.5 pl-1.5" : "rounded-2xl py-2 pr-4 pl-2 gap-3"
          }`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-world-sky text-world-panel-foreground">
            <Hand className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-sm leading-tight">{nearby.label}</span>
            <span className="block text-world-muted text-[11px]">Sapa</span>
          </span>
          {!touch && (
            <kbd className="ml-1 rounded-md border border-world-outline px-2 py-0.5 font-semibold text-xs">
              F
            </kbd>
          )}
        </button>
        <button
          type="button"
          data-hud-control
          onClick={() => socialAct("punch")}
          className={`grid shrink-0 place-items-center hud-glass active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 ${
            touch ? "size-11 rounded-xl" : "gap-2 rounded-2xl px-3 py-2"
          }`}
          aria-label={`Pukul ${nearby.label}`}
        >
          <span
            className={`grid place-items-center rounded-lg bg-world-brand text-world-brand-foreground ${
              touch ? "size-8" : "size-10 rounded-xl"
            }`}
          >
            <HandFist className="size-4" />
          </span>
          {!touch && (
            <>
              <span className="hidden text-xs sm:inline">Pukul</span>
              <kbd className="rounded-md border border-world-outline px-2 py-0.5 font-semibold text-xs">
                G
              </kbd>
            </>
          )}
        </button>
      </div>
    );
  }

  const meta = META[nearby.kind];
  const verb =
    nearby.kind === "bench" && sitting && sittingBenchId === nearby.id
      ? "Berdiri"
      : nearby.kind === "mission" && nearby.label.toLowerCase().includes("taruh")
        ? "Taruh Paket"
        : meta.verb;
  const Icon = meta.Icon;

  // Mobile: kartu info ringkas di kanan; aksi utama lewat FAB pojok kanan.
  if (touch) {
    return (
      <button
        type="button"
        data-hud-control
        onClick={interact}
        className={`pointer-events-auto absolute flex items-center gap-2 rounded-xl py-1.5 pr-2.5 pl-1.5 text-left hud-glass active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 ${bottom} ${place}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-world-accent text-world-accent-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-sm leading-tight">{nearby.label}</span>
          <span className="block text-world-muted text-[11px]">{verb}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-hud-control
      onClick={interact}
      className={`-translate-x-1/2 pointer-events-auto absolute left-1/2 flex max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl py-2 pr-4 pl-2 text-left hud-glass active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 ${bottom}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-world-accent text-world-accent-foreground">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-sm">{nearby.label}</span>
        <span className="block text-world-muted text-xs">{verb}</span>
      </span>
      <kbd className="ml-1 rounded-md border border-world-outline px-2 py-0.5 font-semibold text-xs">
        F
      </kbd>
    </button>
  );
}
