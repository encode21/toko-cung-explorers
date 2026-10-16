import { useEffect, useState } from "react";
import { Check, Clock3, Coins, Flag, Gift, LoaderCircle, RefreshCw, Star } from "lucide-react";
import {
  useDaily,
  dailyCommand,
  dailyGiver,
  nearDailyGiver,
  nearDailyObjective,
  interactDaily,
} from "@/game/daily/store";
import { dailyStep } from "@/game/daily/types";
import { useDungeon } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";

function resetCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/** Existing Daily Mission presentation, backed by independent server-authoritative daily instances. */
export function DailyMissionPanel() {
  const { data, busy, error, retry, tracked, npcId, resetAt } = useDaily();
  const [now, setNow] = useState(Date.now);
  useGame((s) => s.playerPos);
  const giver = dailyGiver(npcId);
  const near = nearDailyGiver();
  useEffect(() => {
    void dailyCommand("read");
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="daily-mission-panel" data-daily-panel aria-busy={busy}>
      <div className="daily-mission-summary">
        <div className="daily-mission-summary-count">
          <Gift aria-hidden="true" />
          <div>
            <span>Misi selesai hari ini</span>
            <strong>{data?.completedCount ?? 0} / 5</strong>
            <small>Daily Streak: {data?.streak ?? 0} hari</small>
          </div>
        </div>
        <div className="daily-mission-countdown">
          <Clock3 aria-hidden="true" />
          <div>
            <span>Diperbarui dalam</span>
            <strong>{resetAt ? resetCountdown(resetAt - now) : "—"}</strong>
            <small>Reset besok 00:00 WIB</small>
          </div>
        </div>
      </div>
      <div className="daily-mission-progress-wrap">
        <progress
          className="daily-mission-progress"
          aria-label="Misi harian selesai"
          value={data?.completedCount ?? 0}
          max={5}
        />
      </div>
      {error && (
        <div className="daily-mission-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void dailyCommand(retry?.action ?? "read", {}, retry ?? undefined)}
          >
            <RefreshCw aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      )}
      {!data ? (
        <div className="daily-mission-empty" role="status">
          {busy && <LoaderCircle aria-hidden="true" />}
          <p>{busy ? "Memuat misi harian…" : "Daily Mission belum tersedia."}</p>
          <button disabled={busy} onClick={() => void dailyCommand("read")}>
            Muat ulang
          </button>
        </div>
      ) : (
        <>
          <div className="daily-mission-giver">
            <div>
              <strong>{giver?.name ?? "Koko Cung"}</strong>
              <p>{giver?.dialogue ?? "Hari ini toko lagi ramai nih. Mau bantuin?"}</p>
              <small>
                {near
                  ? "Dekat Koko — terima misi lewat dialog NPC atau tombol di sini."
                  : "Bicara dengan Koko Cung untuk menerima misi; Claim juga di dekatnya."}
              </small>
            </div>
            {data.quests.some((q) => q.status === "AVAILABLE") && (
              <button
                className="daily-mission-action"
                disabled={busy || !near}
                onClick={() => void dailyCommand("accept", { npcId: near?.id ?? "" })}
              >
                Terima 5 Misi
              </button>
            )}
          </div>
          <ul className="daily-mission-list" aria-label="Daftar misi harian">
            {data.quests.map((quest) => {
              const { index, objective } = dailyStep(quest);
              const claimed = quest.status === "CLAIMED";
              const claimable = quest.status === "CLAIMABLE";
              const active = quest.status === "ACTIVE";
              const total = quest.definition.objectives.reduce((n, o) => n + o.required, 0);
              const value = Math.floor(quest.progress.reduce((n, p) => n + p, 0));
              const actionAvailable =
                active && objective?.targetId && nearDailyObjective(objective);
              const carrying =
                index > 0 && quest.definition.objectives[index - 1]?.type === "COLLECT" && active;
              return (
                <li
                  key={quest.id}
                  className="daily-mission-item"
                  data-daily-quest={quest.id}
                  data-state={
                    claimed ? "completed" : claimable ? "claim" : active ? "active" : "available"
                  }
                >
                  <span className="daily-mission-icon" aria-hidden="true">
                    {claimed ? <Check /> : claimable ? <Gift /> : <Flag />}
                  </span>
                  <div className="daily-mission-details">
                    <h3 className="daily-mission-title">{quest.definition.title}</h3>
                    <p className="daily-mission-objective">
                      {claimed
                        ? "Hadiah diambil"
                        : claimable
                          ? "Kembali ke Koko Cung untuk hadiah"
                          : (objective?.label ?? quest.definition.description)}
                    </p>
                    <span className="daily-mission-status">
                      Progres {value}/{total}
                      {carrying ? " · Paket dibawa" : ""}
                    </span>
                    <div
                      className="daily-mission-rewards"
                      aria-label={claimed ? "Hadiah diterima" : "Hadiah misi"}
                    >
                      <span className="daily-mission-reward">
                        <Star aria-hidden="true" />+
                        {quest.receipt?.xp ?? quest.definition.reward.xp} XP
                      </span>
                      <span className="daily-mission-reward">
                        <Coins aria-hidden="true" />+
                        {quest.receipt?.cungPoint ?? quest.definition.reward.cungPoint} CP
                      </span>
                      {!!quest.receipt?.bonusXp && (
                        <span className="daily-mission-reward">
                          +{quest.receipt.bonusXp} Bonus XP
                        </span>
                      )}
                    </div>
                    {quest.receipt && quest.receipt.cungPoint < quest.receipt.requestedPoint && (
                      <p className="daily-mission-status">
                        CP dibatasi anggaran / batas harian. XP diberikan penuh.
                      </p>
                    )}
                  </div>
                  <div className="daily-mission-actions">
                    {active && (
                      <button
                        className="daily-mission-action"
                        aria-pressed={tracked === quest.id}
                        onClick={() => {
                          if (tracked !== quest.id) useDungeon.setState({ tracked: false });
                          useDaily.setState({ tracked: tracked === quest.id ? null : quest.id });
                        }}
                      >
                        {tracked === quest.id ? "Untrack" : "Track"}
                      </button>
                    )}
                    {actionAvailable && (
                      <button
                        className="daily-mission-action"
                        disabled={busy}
                        onClick={() => void interactDaily(quest)}
                      >
                        {objective.type === "COLLECT"
                          ? "Ambil paket"
                          : objective.type === "DELIVER"
                            ? "Antar paket"
                            : objective.type === "TALK"
                              ? "Bicara"
                              : "Lakukan"}
                      </button>
                    )}
                    {claimable && (
                      <button
                        className="daily-mission-action"
                        disabled={busy || !near}
                        onClick={() =>
                          void dailyCommand("claim", {
                            instanceId: quest.id,
                            npcId: near?.id ?? "",
                          })
                        }
                      >
                        Claim
                      </button>
                    )}
                    {claimed && <span className="daily-mission-status">Selesai</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          {data.completedCount === 5 && (
            <div className="daily-mission-complete" role="status">
              <strong>DAILY COMPLETE · 5/5 Misi selesai</strong>
              <p>Kembali lagi besok untuk Daily Mission baru.</p>
              {data.claimedCount < 5 && <small>Ambil semua hadiah untuk +150 Bonus XP.</small>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
