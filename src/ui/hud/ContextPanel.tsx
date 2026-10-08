import { Armchair, Hand, HandFist, MessageCircle, Monitor, Package, ScanLine } from "lucide-react";
import { useGame } from "@/state/game-store";

const META = {
  kiosk: { verb: "Buka kiosk", Icon: Monitor },
  world: { verb: "Lihat informasi", Icon: Package },
  npc: { verb: "Ajak bicara", Icon: MessageCircle },
  shelf: { verb: "Lihat rak", Icon: Package },
  cashier: { verb: "Buka kasir", Icon: ScanLine },
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

  const bottom = touch
    ? "bottom-[calc(env(safe-area-inset-bottom)+13.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]";

  if (nearby.kind === "player") {
    return (
      <div
        className={`-translate-x-1/2 pointer-events-auto absolute left-1/2 flex max-w-[min(24rem,calc(100vw-2rem))] items-stretch gap-2 ${bottom}`}
      >
        <button
          type="button"
          data-hud-control
          onClick={() => socialAct("wave")}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-2 pr-4 pl-2 text-left hud-glass active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-world-sky text-world-panel-foreground">
            <Hand className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-sm">{nearby.label}</span>
            <span className="block text-world-muted text-xs">Sapa</span>
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
          className="flex items-center gap-2 rounded-2xl px-3 py-2 hud-glass active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
          aria-label={`Pukul ${nearby.label}`}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-world-brand text-world-brand-foreground">
            <HandFist className="size-5" />
          </span>
          <span className="hidden text-xs sm:inline">Pukul</span>
          {!touch && (
            <kbd className="rounded-md border border-world-outline px-2 py-0.5 font-semibold text-xs">
              G
            </kbd>
          )}
        </button>
      </div>
    );
  }

  const meta = META[nearby.kind];
  const verb =
    nearby.kind === "bench" && sitting && sittingBenchId === nearby.id ? "Berdiri" : meta.verb;
  const Icon = meta.Icon;

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
      {!touch && (
        <kbd className="ml-1 rounded-md border border-world-outline px-2 py-0.5 font-semibold text-xs">
          F
        </kbd>
      )}
    </button>
  );
}
