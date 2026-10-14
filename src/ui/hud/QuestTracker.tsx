import { resolveObjective } from "@/game/editor/resolve";
import { useWorldEditor } from "@/game/editor/store";
import { useEffect } from "react";
import { useGameCore } from "@/game/core/store";
import { useGame } from "@/state/game-store";
import { useTouchDrive } from "@/game/player/touch-drive";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { useHud } from "@/state/hud-store";
import { QuestTrackerCard, QuestTrackerGuidance } from "./QuestTrackerCard";

export function QuestTracker() {
  const snapshot = useGameCore((s) => s.snapshot);
  const error = useGameCore((s) => s.error);
  const pos = useGame((s) => s.playerPos);
  // Re-render when editor moves/saves a target bound to the active objective.
  useWorldEditor((s) => s.targets);
  useWorldEditor((s) => s.saved);
  useWorldEditor((s) => s.mode);
  const { touch } = useMobileHudLayout();
  const moving = useTouchDrive((s) => s.active);
  const expanded = useHud((s) => s.tracker === "quest");
  const toggleTracker = useHud((s) => s.toggleTracker);
  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  const index = quest?.objectives.findIndex((o, i) => (run?.progress[i] ?? 0) < o.required) ?? -1;
  const rawObjective = quest?.objectives[index];
  const resolved = rawObjective ? resolveObjective(rawObjective) : undefined;
  const objective =
    resolved?.position && resolved.position.length >= 3 && typeof resolved.position[0] === "number"
      ? resolved
      : undefined;
  const secret = objective?.secret;
  const isSecretQuest = quest?.category === "EASTER_EGG";
  // Secrets: looser vertical tolerance so moved props (y ≠ 0) stay clickable.
  const near =
    objective &&
    Math.hypot(pos[0] - objective.position[0], pos[2] - objective.position[2]) <=
      objective.radius &&
    Math.abs(pos[1] - 0.83 - objective.position[1]) < (secret ? 5 : 1.8);
  const distance = objective
    ? Math.round(Math.hypot(pos[0] - objective.position[0], pos[2] - objective.position[2]))
    : null;

  useEffect(() => {
    if (!touch || !moving || !expanded) return;
    useHud.setState({ tracker: null });
  }, [touch, moving, expanded]);

  const clueHint =
    index > 0 ? quest?.objectives[index - 1]?.secret?.nextClueHint : quest?.description;

  if (!quest || !run) return null;

  const total = quest.objectives.length;
  const completed = quest.objectives.filter((o, i) => (run.progress[i] ?? 0) >= o.required).length;

  return (
    <QuestTrackerCard
      data-quest-tracker
      aria-label="Quest tracker"
      label={isSecretQuest ? "Rahasia" : "Quest"}
      title={quest.title}
      summary={objective?.label ?? "Semua tujuan selesai"}
      count={`${index >= 0 ? index + 1 : total} / ${total}`}
      expanded={expanded}
      onToggle={() => toggleTracker("quest")}
      toggleLabel={expanded ? "Ciutkan quest" : undefined}
      progress={{
        value: completed,
        max: total,
        label: "Progres quest",
        valueText: `${completed} dari ${total} tujuan selesai`,
      }}
      error={error}
    >
      <p className="quest-tracker-current">
        {objective
          ? `${objective.label}${secret ? "" : ` (${run.progress[index] ?? 0}/${objective.required})`}`
          : "Semua tujuan selesai"}
      </p>
      {isSecretQuest && objective && (
        <p className="quest-tracker-hint">
          {near
            ? "Ada kertas berkilau di dekatmu — selidiki."
            : clueHint || objective.hint || "Cari secarik kertas / kilau emas di dunia."}
        </p>
      )}
      {!isSecretQuest && objective && distance !== null && (
        <p className="quest-tracker-hint">
          ±{distance} m · {objective.position[0]}, {objective.position[2]}
        </p>
      )}
      <QuestTrackerGuidance>
        {objective
          ? near
            ? "Gunakan tombol interaksi untuk melanjutkan."
            : "Ikuti panah oranye menuju tujuan misi."
          : "Gunakan tombol interaksi untuk menyelesaikan quest."}
      </QuestTrackerGuidance>
    </QuestTrackerCard>
  );
}
