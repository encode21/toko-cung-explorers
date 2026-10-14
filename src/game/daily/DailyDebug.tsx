import { useState } from "react";
import { worldRequest } from "@/services/world/client";
import { useWorldEditor } from "@/game/editor/store";
import type { DailyQuest } from "./types";
type DebugState = {
  simulation: { dateKey: string; quests: DailyQuest[] };
  current: unknown;
  instances: unknown;
  pool: unknown[];
};
export function DailyDebug() {
  const canEdit = useWorldEditor((s) => s.canEdit);
  const selected = useWorldEditor((s) => s.selected);
  const [data, setData] = useState<DebugState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: string, instanceId?: string) {
    setBusy(true);
    setError("");
    try {
      const result = await worldRequest<DebugState>("daily-debug", {
        action,
        ...(instanceId ? { instanceId } : {}),
        ...(action === "assign" ? { npcId: selected, poolId: "daily_toko_cung" } : {}),
      });
      setData(result);
      if (action === "assign") await useWorldEditor.getState().load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debug unavailable");
    } finally {
      setBusy(false);
    }
  }
  if (!import.meta.env.DEV || !canEdit) return null;
  return (
    <details className="mt-3 border-t border-white/20 pt-2">
      <summary>Quest Giver Debug</summary>
      <p className="my-2 text-amber-200">Simulation only · zero payouts</p>
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["inspect", "Inspect"],
            ["regenerate", "Regenerate"],
            ["reset", "Reset progress"],
            ["next-day", "Next day"],
            ["assign", "Assign pool to selected NPC"],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            className="min-h-11 rounded bg-slate-800 px-2"
            disabled={busy || (action === "assign" && !selected)}
            onClick={() => void run(action)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>{data.simulation.dateKey}</p>
          {data.simulation.quests.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-2">
              <span>
                {q.definition.title} · {q.status}
              </span>
              <button
                disabled={busy}
                className="min-h-11 p-2"
                onClick={() => void run("complete", q.id)}
              >
                Complete
              </button>
            </div>
          ))}
          <details>
            <summary>Current set / reward receipts</summary>
            <pre className="overflow-auto">
              {JSON.stringify({ set: data.current, instances: data.instances }, null, 2)}
            </pre>
          </details>
          <details>
            <summary>Quest pool ({data.pool.length})</summary>
            <pre className="overflow-auto">{JSON.stringify(data.pool, null, 2)}</pre>
          </details>
        </>
      )}
    </details>
  );
}
