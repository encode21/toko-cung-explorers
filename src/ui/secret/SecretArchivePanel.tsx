import { RAHASIA_ARCHIVES } from "@/game/secret/archive";
import { useGameCore } from "@/game/core/store";

/** Lightweight collectible archive for Rahasia Dunia Toko Cung. */
export function SecretArchivePanel() {
  const metrics = useGameCore((s) => s.snapshot?.profile.secretMetrics);
  const found = metrics?.secretsFound ?? 0;
  const total = metrics?.archiveTotal || RAHASIA_ARCHIVES.length;
  const known = new Set(metrics?.archives ?? []);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
          Rahasia Dunia Toko Cung
        </p>
        <p className="mt-1 text-sm text-slate-200">
          Archives: {found} / {total}
        </p>
        {metrics && (
          <p className="mt-1 text-[11px] text-world-muted">
            Perfect answers: {metrics.perfectAnswers}
            {metrics.secretQuestCompletionTime != null
              ? ` · Clear ${metrics.secretQuestCompletionTime}s`
              : ""}
          </p>
        )}
      </div>
      <ul className="space-y-2">
        {RAHASIA_ARCHIVES.map((entry) => {
          const unlocked = known.has(entry.id);
          return (
            <li
              key={entry.id}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <p className="text-[11px] text-amber-200/80">
                #{String(entry.index).padStart(2, "0")}
              </p>
              <p className="font-semibold text-slate-50">
                {unlocked ? entry.title : "???"}
              </p>
              <p className="mt-0.5 text-xs text-world-muted">
                {unlocked ? entry.lore : "Belum ditemukan."}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
