import { GameModal } from "@/ui/game-ui/GamePanel";
import { formatMissionTime, useQuestCompletion } from "@/game/core/completion-store";
import { Clock3, Star } from "lucide-react";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { QuestConfetti } from "./QuestConfetti";
import "./quest-complete.css";

/** Celebrate the confirmed quest reward; dismissing never claims it a second time. */
export function QuestCompleteOverlay() {
  const result = useQuestCompletion((s) => s.result);
  const dismiss = useQuestCompletion((s) => s.dismiss);

  if (!result) return null;

  const totalXp = result.xpAwarded + result.clueXp;
  const practice = result.theme === "plaza-obby";
  const formatNumber = (value: number) => value.toLocaleString("id-ID");

  return (
    <>
      <GameModal
        title={practice ? "Obby Selesai" : "Quest Selesai"}
        onClose={dismiss}
        className="quest-complete-modal"
        bodyClassName="quest-complete-body"
        footer={
          <button type="button" className="quest-complete-confirm" onClick={dismiss}>
            Ok
          </button>
        }
      >
        {!practice && (
          <dl className="quest-complete-reward">
            <dt className="sr-only">Point diterima</dt>
            <dd>
              <div className="quest-complete-coin" aria-hidden>
                <PointCoinIcon />
                <Star className="quest-complete-sparkle" fill="currentColor" strokeWidth={0} />
              </div>
              <strong className="quest-complete-amount">{formatNumber(result.pointAwarded)}</strong>
              <span className="quest-complete-point-label">Point</span>
            </dd>
          </dl>
        )}
        <p className="quest-complete-message">
          Kamu berhasil menyelesaikan <strong>{result.title}</strong>!
        </p>
        <dl className="quest-complete-stats">
          <div>
            <dt>
              <Clock3 aria-hidden /> Waktu
            </dt>
            <dd>{formatMissionTime(result.durationSeconds)}</dd>
          </div>
          {!practice && (
            <div>
              <dt>
                <Star aria-hidden fill="currentColor" strokeWidth={0} /> XP
              </dt>
              <dd>+{formatNumber(totalXp)}</dd>
            </div>
          )}
        </dl>
        {practice && (
          <p className="quest-complete-xp-detail">
            Latihan selesai! Kembali ke Start untuk bermain lagi.
          </p>
        )}
        {result.clueXp > 0 && (
          <p className="quest-complete-xp-detail">
            {formatNumber(result.clueXp)} XP jejak + {formatNumber(result.xpAwarded)} XP chapter
          </p>
        )}
      </GameModal>
      <QuestConfetti trigger={result} />
    </>
  );
}
