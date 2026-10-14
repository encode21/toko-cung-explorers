import { useDaily, nearDailyObjective, interactDaily } from "@/game/daily/store";
import { dailyStep } from "@/game/daily/types";
import { useDungeon } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { QuestTrackerButton, QuestTrackerCard } from "./QuestTrackerCard";

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
    <QuestTrackerCard
      aria-label="Daily Mission tracker"
      label="Harian"
      title={quest?.definition.title ?? "Misi harian"}
      summary={step?.label ?? `${data.completedCount} misi selesai hari ini`}
      count={`${data.completedCount} / 5`}
      expanded={expanded}
      onToggle={() => useHud.getState().toggleTracker("daily")}
      toggleLabel={expanded ? "Ciutkan misi harian" : "Buka misi harian"}
      progress={{ value: data.completedCount, max: 5, label: "Misi harian selesai" }}
    >
      {step && <p className="quest-tracker-current">{step.label}</p>}
      <div className="quest-tracker-list">
        {data.quests.map((q) => (
          <button
            key={q.id}
            type="button"
            className="quest-tracker-list-item"
            aria-current={tracked === q.id ? "step" : undefined}
            aria-pressed={tracked === q.id}
            onClick={() => {
              if (q.status === "ACTIVE") {
                useDungeon.setState({ tracked: false });
                useDaily.setState({ tracked: q.id });
              } else useHud.getState().setSheet("daily-missions");
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
      </div>
      <div className="quest-tracker-actions">
        {quest && step?.targetId && nearDailyObjective(step) && (
          <QuestTrackerButton disabled={busy} onClick={() => void interactDaily(quest)}>
            {step.label}
          </QuestTrackerButton>
        )}
        <QuestTrackerButton
          variant="secondary"
          onClick={() => useHud.getState().setSheet("daily-missions")}
        >
          Lihat Semua
        </QuestTrackerButton>
      </div>
    </QuestTrackerCard>
  );
}
