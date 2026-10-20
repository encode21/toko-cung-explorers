import { useState } from "react";
import { dailyCommand, interactDaily, nearDailyObjective, useDaily } from "@/game/daily/store";
import { useDailyTarget } from "@/game/daily/use-daily-target";
import { dailyActionLabel } from "@/game/daily/types";
import { useDungeon } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { QuestTrackerButton, QuestTrackerCard } from "./QuestTrackerCard";
import "./daily-mission-tracker.css";

const DAILY_TOTAL = 5;

export function DailyMissionTracker() {
  const { data, busy, error } = useDaily();
  const target = useDailyTarget();
  const pos = useGame((s) => s.playerPos);
  const dungeon = useDungeon((s) => s.data?.instance);
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;
  const done = data.completedCount;
  const objective = target?.objective;
  const near = nearDailyObjective(objective);
  const label = target?.claim ? "Ambil hadiah" : dailyActionLabel(objective);
  const distance = objective?.position
    ? Math.round(Math.hypot(pos[0] - objective.position[0], pos[2] - objective.position[2]))
    : null;
  const act = () => {
    if (!target || !objective || !nearDailyObjective(objective)) return;
    if (target.claim)
      void dailyCommand("claim", { instanceId: target.quest.id, npcId: objective.targetId ?? "" });
    else void interactDaily(target.quest, target.index);
  };
  return (
    <>
      <button
        type="button"
        className="daily-mission-tip"
        data-hud-control
        data-ui-panel
        data-daily-mission-tip
        aria-label={`Daily Mission, ${done} dari ${DAILY_TOTAL} selesai`}
        onClick={() => useHud.getState().setSheet("daily-missions")}
      >
        <span className="daily-mission-tip-bubble">
          {done}/{DAILY_TOTAL} selesai
        </span>
      </button>
      {target && !dungeon && (
        <QuestTrackerCard
          data-daily-tracker
          label="Harian"
          title={target.quest.definition.title}
          summary={objective?.label}
          count={
            target.claim
              ? "Hadiah siap"
              : objective?.type === "DISTANCE"
                ? `${Math.floor(target.quest.progress[target.index] ?? 0)}/${objective.required} m`
                : `${target.index + 1}/${target.quest.definition.objectives.length}`
          }
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
          error={error}
          footer={
            <div className="daily-tracker-action">
              {label && near ? (
                <QuestTrackerButton disabled={busy} onClick={act}>
                  {busy ? "Memproses…" : label}
                </QuestTrackerButton>
              ) : (
                <span>
                  {distance !== null
                    ? `±${distance} m · ${near ? "Tunggu validasi kunjungan" : "Ikuti penanda misi"}`
                    : objective?.label}
                </span>
              )}
            </div>
          }
        >
          <p className="quest-tracker-current">{objective?.label}</p>
          <p className="quest-tracker-hint">
            {target.claim ? "Kembali ke Koko Cung." : "Aksi tersedia di HUD saat dekat tujuan."}
          </p>
          <span className="daily-tracker-reward">
            <PointCoinIcon /> {target.quest.definition.reward.cungPoint} Point ·{" "}
            {target.quest.definition.reward.xp} XP
          </span>
        </QuestTrackerCard>
      )}
    </>
  );
}
