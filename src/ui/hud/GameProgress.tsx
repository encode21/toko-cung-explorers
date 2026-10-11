import { useGameCore } from "@/game/core/store";
import { nextLevel } from "@/game/core/types";

export function GameProgress({
  expanded = false,
  compact = false,
}: {
  expanded?: boolean;
  compact?: boolean;
}) {
  const snapshot = useGameCore((s) => s.snapshot);
  if (!snapshot) return <p className="text-xs text-world-muted">Progression belum terhubung</p>;
  const { profile: p, wallet: w } = snapshot;
  const next = nextLevel(snapshot);
  const points = w.current_balance.toLocaleString("id-ID");
  const xpLabel = `${p.xp.toLocaleString("id-ID")} / ${next ? next.xp.toLocaleString("id-ID") : "MAX"} XP`;

  if (compact) {
    return (
      <section aria-label="Progression pemain" className="space-y-0.5 text-[11px] leading-tight">
        <div className="flex items-baseline justify-between gap-2">
          <strong className="truncate">
            LV. {p.level} · {p.title}
          </strong>
          <span className="shrink-0 tabular-nums text-world-muted">{points} P</span>
        </div>
        <p className="text-world-muted tabular-nums">{xpLabel}</p>
        <progress
          aria-label="XP menuju level berikutnya"
          className="h-0.5 w-full accent-world-brand"
          max={next?.xp ?? Math.max(1, p.xp)}
          value={p.xp}
        />
      </section>
    );
  }

  return (
    <section aria-label="Progression pemain" className="space-y-1 text-xs">
      <div className="flex flex-wrap justify-between gap-2">
        <strong>
          LV. {p.level} · {p.title}
        </strong>
        <span>{points} P</span>
      </div>
      <p>{xpLabel}</p>
      <progress
        aria-label="XP menuju level berikutnya"
        className="h-1 w-full accent-world-brand"
        max={next?.xp ?? Math.max(1, p.xp)}
        value={p.xp}
      />
      {expanded && (
        <>
          <p>Quest selesai: {p.missions_completed}</p>
          <p>Daily Point: {w.earned_today.toLocaleString("id-ID")} / 10.000 · WIB</p>
          <p className="text-world-muted">
            {w.earned_today >= 10000
              ? "Daily Point limit reached. XP tetap bertambah."
              : "1 Point = Rp1. Hanya aktivitas tertentu memberi Point."}
          </p>
          <p className="text-world-muted">Penukaran reward nantinya di Toko Cung App.</p>
        </>
      )}
    </section>
  );
}
