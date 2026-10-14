import { useDaily, nearDailyObjective, interactDaily } from "@/game/daily/store";
import { dailyStep } from "@/game/daily/types";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
const button =
  "min-h-11 rounded-lg border border-world-outline px-3 text-xs font-semibold hover:bg-world-panel disabled:opacity-40";
export function DailyMissionTracker() {
  const data = useDaily((s) => s.data);
  const tracked = useDaily((s) => s.tracked);
  const busy = useDaily((s) => s.busy);
  const expanded = useHud((s) => s.tracker === "daily");
  useGame((s) => s.playerPos);
  if (!data) return null;
  const quest = data.quests.find((q) => q.id === tracked && q.status === "ACTIVE");
  const step = quest ? dailyStep(quest).objective : null;
  return (
    <section
      data-hud-control
      className={`mmo-tracker pointer-events-auto ${expanded ? "mmo-tracker-expanded" : ""}`}
      aria-label="Daily Mission tracker"
    >
      <button
        className="min-h-11 w-full text-left text-xs font-semibold"
        aria-expanded={expanded}
        onClick={() => useHud.getState().toggleTracker("daily")}
      >
        Daily {data.completedCount}/5 <span className="float-right">{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded && (
        <div className="space-y-1 text-[11px]">
          {data.quests.map((q) => (
            <button
              key={q.id}
              className="block min-h-11 w-full text-left"
              onClick={() => {
                if (q.status === "ACTIVE") useDaily.setState({ tracked: q.id });
                else useHud.getState().setSheet("daily-missions");
              }}
            >
              {q.status === "CLAIMED" || q.status === "CLAIMABLE"
                ? "✓"
                : tracked === q.id
                  ? "➤"
                  : "•"}{" "}
              {q.definition.title} · {Math.floor(q.progress.reduce((a, b) => a + b, 0))}/
              {q.definition.objectives.reduce((a, o) => a + o.required, 0)}
            </button>
          ))}
          {quest && step?.targetId && nearDailyObjective(step) && (
            <button className={button} disabled={busy} onClick={() => void interactDaily(quest)}>
              {step.label}
            </button>
          )}
          <button className={button} onClick={() => useHud.getState().setSheet("daily-missions")}>
            Lihat Semua
          </button>
        </div>
      )}
    </section>
  );
}
