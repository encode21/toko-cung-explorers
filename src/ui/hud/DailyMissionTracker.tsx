import { useDaily } from "@/game/daily/store";
import { useHud } from "@/state/hud-store";
import "./daily-mission-tracker.css";

const DAILY_TOTAL = 5;

/** Compact speech-bubble tip beside the Daily Mission shortcut — opens the full sheet. */
export function DailyMissionTracker() {
  const data = useDaily((s) => s.data);
  if (!data) return null;
  const done = data.completedCount;
  return (
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
  );
}
