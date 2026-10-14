import { useEffect, useRef, useState } from "react";
import { Check, Clock3, Coins, Flag, Gift, LoaderCircle, RefreshCw, Star } from "lucide-react";
import { command, useGameCore } from "@/game/core/store";
import type { QuestDefinition, QuestProgress } from "@/game/core/types";
import { useDungeon } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";

const WIB_OFFSET = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const number = new Intl.NumberFormat("id-ID");

function wibDay(at: number) {
  return Math.floor((at + WIB_OFFSET) / DAY);
}

function resetCountdown(now: number) {
  const reset = (wibDay(now) + 1) * DAY - WIB_OFFSET;
  const seconds = Math.max(0, Math.ceil((reset - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function completedToday(run: QuestProgress, day: number) {
  if (run.status !== "COMPLETED" || !run.completed_at) return false;
  const at = Date.parse(run.completed_at);
  return Number.isFinite(at) && wibDay(at) === day;
}

function readyToClaim(quest: QuestDefinition, run: QuestProgress) {
  return (
    (run.status === "ACTIVE" || run.status === "ACCEPTED") &&
    quest.objectives.every((objective, index) => (run.progress[index] ?? 0) >= objective.required)
  );
}

/** Daily offers and rewards are projections of the existing authoritative quest snapshot. */
export function DailyMissionPanel() {
  const snapshot = useGameCore((state) => state.snapshot);
  const busy = useGameCore((state) => state.busy);
  const syncing = useGameCore((state) => state.syncing);
  const target = useGameCore((state) => state.target);
  const pending = useGameCore((state) => state.pending);
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const day = wibDay(now);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let currentRead = true;
    void command("read").then((result) => {
      if (currentRead && !result.ok && result.error !== "Synchronization already running")
        setError(result.error);
    });
    return () => {
      currentRead = false;
    };
  }, [day]);

  const refresh = async () => {
    setError("");
    const result = await command("read");
    if (mounted.current && !result.ok && result.error !== "Synchronization already running")
      setError(result.error);
  };

  const isCurrentPanel = () => mounted.current && useHud.getState().sheet === "daily-missions";
  const followQuest = () => {
    if (isCurrentPanel()) useHud.setState({ sheet: null, tracker: "quest" });
  };

  const act = async (questId: string) => {
    if (useGameCore.getState().busy) return;
    setError("");
    const current = useGameCore.getState().snapshot;
    const quest = current?.quests.find((offer) => offer.id === questId);
    if (!current || !quest) return;
    const active = current.active;
    if (active?.quest_id === quest.id) {
      if (!readyToClaim(quest, active)) {
        followQuest();
        return;
      }
      const result = await command("complete");
      if (!result.ok) {
        if (mounted.current) setError(result.error);
      } else if (
        isCurrentPanel() &&
        result.snapshot.history.some((run) => run.id === active.id && run.status === "COMPLETED")
      )
        useHud.getState().setSheet(null);
      return;
    }
    if (!quest.available) {
      setError(quest.reason || "Misi ini belum tersedia.");
      return;
    }
    if (active) {
      setError("Selesaikan atau batalkan quest aktif sebelum memulai misi berikutnya.");
      return;
    }
    if (quest.category === "DUNGEON") {
      useDungeon.setState({ tracked: true });
      followQuest();
      return;
    }
    const result = await command("accept", { questId: quest.id });
    if (!result.ok) {
      if (mounted.current) setError(result.error);
    } else if (result.snapshot.active?.quest_id === quest.id) {
      useGame.getState().setToast(`Misi dimulai · ${quest.title}`);
      followQuest();
    }
  };

  const quests =
    snapshot?.quests.filter(
      (quest) => quest.repeat_policy === "DAILY" || quest.category === "DAILY",
    ) ?? [];
  const completed = new Map<string, QuestProgress>();
  for (const run of snapshot?.history ?? []) {
    if (!completedToday(run, day)) continue;
    const previous = completed.get(run.quest_id);
    if (!previous || Date.parse(run.completed_at!) > Date.parse(previous.completed_at!))
      completed.set(run.quest_id, run);
  }
  const count = quests.filter((quest) => completed.has(quest.id)).length;
  const anotherQuest =
    snapshot?.active && !quests.some((quest) => quest.id === snapshot.active?.quest_id);

  return (
    <div className="daily-mission-panel" aria-busy={busy || syncing}>
      <div className="daily-mission-summary">
        <div className="daily-mission-summary-count">
          <Gift aria-hidden="true" />
          <div>
            <span>Misi selesai hari ini</span>
            <strong>
              {count} / {quests.length}
            </strong>
          </div>
        </div>
        <div className="daily-mission-countdown">
          <Clock3 aria-hidden="true" />
          <div>
            <span>Diperbarui dalam</span>
            <strong>{resetCountdown(now)}</strong>
            <small>Setiap 00.00 WIB</small>
          </div>
        </div>
      </div>
      <div className="daily-mission-progress-wrap">
        <progress
          className="daily-mission-progress"
          aria-label="Misi harian selesai"
          value={count}
          max={Math.max(1, quests.length)}
        />
      </div>

      {error && (
        <div className="daily-mission-error" role="alert">
          <p>{error}</p>
          <button type="button" disabled={busy || syncing} onClick={() => void refresh()}>
            <RefreshCw aria-hidden="true" /> Coba lagi
          </button>
        </div>
      )}

      {!snapshot ? (
        <div className="daily-mission-empty" role="status">
          {syncing && <LoaderCircle aria-hidden="true" />}
          <p>{syncing ? "Memuat misi harian…" : "Misi harian belum dapat dimuat."}</p>
          {!error && (
            <button type="button" disabled={busy || syncing} onClick={() => void refresh()}>
              <RefreshCw aria-hidden="true" /> Muat ulang
            </button>
          )}
        </div>
      ) : quests.length === 0 ? (
        <div className="daily-mission-empty">
          <Flag aria-hidden="true" />
          <p>Belum ada misi harian tersedia.</p>
          <button type="button" disabled={busy || syncing} onClick={() => void refresh()}>
            <RefreshCw aria-hidden="true" /> Muat ulang
          </button>
        </div>
      ) : (
        <>
          {anotherQuest && (
            <div className="daily-mission-status">
              <p>Selesaikan quest aktif sebelum memulai misi harian.</p>
              <button type="button" disabled={busy} onClick={followQuest}>
                Lanjutkan quest aktif
              </button>
            </div>
          )}
          <ul className="daily-mission-list" aria-label="Daftar misi harian">
            {quests.map((quest) => {
              const active = snapshot.active?.quest_id === quest.id ? snapshot.active : null;
              const finished = completed.get(quest.id);
              const claim = active ? readyToClaim(quest, active) : false;
              const total = quest.objectives.reduce(
                (sum, objective) => sum + objective.required,
                0,
              );
              const value = active
                ? quest.objectives.reduce(
                    (sum, objective, index) =>
                      sum + Math.min(objective.required, Math.max(0, active.progress[index] ?? 0)),
                    0,
                  )
                : finished
                  ? total
                  : 0;
              const nextObjective = active
                ? quest.objectives.find(
                    (objective, index) => (active.progress[index] ?? 0) < objective.required,
                  )
                : quest.objectives[0];
              const locked = !active && (!quest.available || !!snapshot.active);
              const actionBusy =
                busy && (target === quest.id || (active && pending === "complete"));
              const status = active
                ? claim
                  ? "claim"
                  : "active"
                : finished
                  ? "completed"
                  : locked
                    ? "locked"
                    : "available";
              return (
                <li
                  className="daily-mission-item"
                  key={quest.id}
                  data-quest-id={quest.id}
                  data-state={status}
                >
                  <span className="daily-mission-icon" aria-hidden="true">
                    {finished && !active ? <Check /> : claim ? <Gift /> : <Flag />}
                  </span>
                  <div className="daily-mission-details">
                    <h3 className="daily-mission-title">{quest.title}</h3>
                    <p className="daily-mission-description">{quest.description}</p>
                    {active && nextObjective && (
                      <p className="daily-mission-objective">
                        {nextObjective.hidden ? "Ikuti petunjuk misi." : nextObjective.label}
                      </p>
                    )}
                    <span className="daily-mission-status">
                      {finished && !active ? "Selesai hari ini" : `Progres ${value}/${total}`}
                    </span>
                    <div
                      className="daily-mission-rewards"
                      aria-label={finished && !active ? "Hadiah diterima" : "Hadiah misi"}
                    >
                      <span className="daily-mission-reward">
                        <Star aria-hidden="true" /> +
                        {number.format(
                          finished && !active ? finished.xp_awarded : quest.rewards.xp,
                        )}{" "}
                        XP
                      </span>
                      <span className="daily-mission-reward">
                        <Coins aria-hidden="true" />{" "}
                        {finished && !active
                          ? `+${number.format(finished.point_awarded)}`
                          : `Hingga ${number.format(quest.rewards.point)}`}{" "}
                        Point
                      </span>
                    </div>
                    {locked && !finished && (
                      <p className="daily-mission-status">
                        {snapshot.active
                          ? "Selesaikan quest aktif terlebih dahulu."
                          : quest.reason || "Misi belum tersedia."}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="daily-mission-action"
                    disabled={busy || locked}
                    onClick={() => void act(quest.id)}
                  >
                    {actionBusy ? <LoaderCircle aria-hidden="true" /> : null}
                    {actionBusy
                      ? "Memproses…"
                      : active
                        ? claim
                          ? "Klaim hadiah"
                          : "Lanjutkan"
                        : finished && !quest.available
                          ? "Selesai"
                          : "Mulai"}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
