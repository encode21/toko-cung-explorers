import { GameModal } from "@/ui/game-ui/GamePanel";
import { useEffect, useState } from "react";
import { useDungeon, dungeonCommand } from "@/game/dungeon/store";
import { useHud } from "@/state/hud-store";
import { useGameCore } from "@/game/core/store";
import { worldRequest } from "@/services/world/client";
import { connectionId } from "@/net/channel-store";
import type { LeaderboardCategory, PrincipalLeaderboard } from "@/game/dungeon/types";
import {
  Check,
  ChevronRight,
  Clock3,
  Crown,
  LockKeyhole,
  MapPin,
  Medal,
  Play,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import "./principal-board.css";

const categories: Record<LeaderboardCategory, string> = {
  WEEKLY_XP: "XP",
  QUESTS_COMPLETED: "Quest",
  DUNGEON_CLEARS: "Dungeon",
  EASTER_EGGS: "Rahasia",
  FASTEST_CLEAR: "Waktu Tercepat",
};

export function PrincipalBoard() {
  const panel = useHud((s) => s.principalPanel);
  const { data, busy, error } = useDungeon();
  const snapshot = useGameCore((s) => s.snapshot);
  const [category, setCategory] = useState<LeaderboardCategory>("WEEKLY_XP");
  const [period, setPeriod] = useState<"weekly" | "all-time">("weekly");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [board, setBoard] = useState<PrincipalLeaderboard | null>(null);
  const [boardError, setBoardError] = useState("");
  const effectivePeriod = category === "WEEKLY_XP" ? "weekly" : period;
  useEffect(() => {
    if (panel !== "leaderboard") return;
    let cancelled = false;
    setBoard(null);
    setBoardError("");
    void worldRequest<PrincipalLeaderboard>("dungeon", {
      action: "leaderboard",
      connectionId,
      category,
      period: effectivePeriod,
      questId: "principal-missing-v2",
    })
      .then((result) => {
        if (!cancelled) setBoard(result);
      })
      .catch((e) => {
        if (!cancelled)
          setBoardError(e instanceof Error ? e.message : "Leaderboard belum tersedia.");
      });
    return () => {
      cancelled = true;
    };
  }, [panel, category, effectivePeriod]);
  useEffect(() => {
    if (!panel) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") useHud.setState({ principalPanel: null });
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panel]);
  if (!panel || !data) return null;
  const quests =
    data.quests ?? snapshot?.quests.filter((q) => q.campaign_id === data.config.campaignId) ?? [];
  const level = snapshot?.profile.level ?? 1;
  const chapters = data.config.chapters ?? [];
  const currentChapter =
    selectedChapter ??
    [...chapters].reverse().find((chapter) => level >= chapter.minLevel)?.id ??
    chapters[0]?.id ??
    1;
  const visibleQuests = quests.filter((quest) => (quest.chapter ?? 1) === currentChapter);

  return (
    <GameModal
      title="Pusat Misi Principal"
      subtitle={`Level ${level} · Distribution Center`}
      onClose={() => useHud.setState({ principalPanel: null })}
      wide
      className="principal-board"
      bodyClassName="principal-board-scroll"
    >
      <nav className="principal-board-tabs" aria-label="Pusat Principal">
        <button
          type="button"
          aria-pressed={panel === "missions"}
          className="principal-board-tab"
          onClick={() => useHud.setState({ principalPanel: "missions" })}
        >
          <Sparkles aria-hidden />
          Papan Misi
        </button>
        <button
          type="button"
          aria-pressed={panel === "leaderboard"}
          className="principal-board-tab"
          onClick={() => useHud.setState({ principalPanel: "leaderboard" })}
        >
          <Trophy aria-hidden />
          Leaderboard
        </button>
      </nav>
      {panel === "missions" ? (
        <section className="principal-missions">
          <div className="principal-intro">
            <div>
              <span className="principal-eyebrow">Pilih petualangan</span>
              <h3>Misi untuk levelmu</h3>
              <p>Naikkan level untuk membuka chapter dan tantangan berikutnya.</p>
            </div>
            <span className="principal-level-badge">
              <Star aria-hidden fill="currentColor" />
              Lv. {level}
            </span>
          </div>

          <nav className="principal-chapters" aria-label="Pilih chapter">
            {chapters.map((chapter) => {
              const unlocked = level >= chapter.minLevel;
              const selected = chapter.id === currentChapter;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  className="principal-chapter"
                  data-state={selected ? "selected" : unlocked ? "unlocked" : "locked"}
                  aria-pressed={selected}
                  onClick={() => setSelectedChapter(chapter.id)}
                >
                  <span className="principal-chapter-icon" aria-hidden>
                    {selected ? (
                      <Check />
                    ) : unlocked ? (
                      <Star fill="currentColor" />
                    ) : (
                      <LockKeyhole />
                    )}
                  </span>
                  <span className="principal-chapter-copy">
                    <small>CHAPTER {chapter.id}</small>
                    <strong>{chapter.title}</strong>
                    <span>
                      Lv. {chapter.minLevel}
                      {chapter.maxLevel ? `–${chapter.maxLevel}` : "+"}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="principal-chapter-chevron" />
                </button>
              );
            })}
          </nav>

          <div className="principal-quest-grid">
            {visibleQuests.map((quest) => {
              const requiredLevel = quest.prerequisites.level ?? 1;
              const locked = !quest.available;
              const activeInstance = !!data.instance;
              const actionLabel =
                level < requiredLevel
                  ? `Terbuka di Level ${requiredLevel}`
                  : activeInstance
                    ? "Selesaikan misi aktif"
                    : locked
                      ? quest.reason || "Belum tersedia"
                      : "Mulai Misi";
              return (
                <article
                  key={quest.id}
                  className="principal-quest-card"
                  data-state={locked ? "locked" : "available"}
                >
                  <div className="principal-quest-heading">
                    <span className="principal-quest-icon" aria-hidden>
                      {locked ? <LockKeyhole /> : <MapPin />}
                    </span>
                    <div>
                      <span className="principal-quest-kind">
                        {quest.mission_kind ?? "MAIN"} QUEST
                      </span>
                      <h3>{quest.title}</h3>
                    </div>
                  </div>
                  <p className="principal-quest-description">{quest.description}</p>
                  <div className="principal-quest-meta">
                    <span>
                      <Star aria-hidden fill="currentColor" />+{quest.rewards.xp} XP
                    </span>
                    {quest.rewards.point > 0 && (
                      <span>
                        <PointCoinIcon />+{quest.rewards.point}
                      </span>
                    )}
                    <span>
                      <Clock3 aria-hidden />
                      {quest.repeat_policy === "DAILY" ? "Harian" : "Satu kali"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="principal-quest-action"
                    disabled={busy || activeInstance || locked}
                    onClick={() => {
                      void dungeonCommand("enter", undefined, quest.id).then(() => {
                        if (useDungeon.getState().data?.instance)
                          useHud.setState({ principalPanel: null });
                      });
                    }}
                  >
                    {!locked && !activeInstance && <Play aria-hidden fill="currentColor" />}
                    {actionLabel}
                  </button>
                </article>
              );
            })}
            {!visibleQuests.length && (
              <div className="principal-empty">
                <LockKeyhole aria-hidden />
                <strong>Belum ada misi di chapter ini</strong>
                <p>Naikkan level atau kembali lagi saat misi baru tersedia.</p>
              </div>
            )}
          </div>
          <p className="principal-hint">
            <MapPin aria-hidden />
            Petunjuk tujuan muncul bertahap setelah misi dimulai.
          </p>
        </section>
      ) : (
        <section className="principal-leaderboard">
          <div className="principal-leaderboard-hero">
            <Trophy aria-hidden />
            <div>
              <span className="principal-eyebrow">Kompetisi Principal</span>
              <h3>Peringkat Explorer</h3>
              <p>Kumpulkan pencapaian dari misi dan dungeon.</p>
            </div>
          </div>
          <nav className="principal-category-tabs" aria-label="Kategori leaderboard">
            {(Object.entries(categories) as [LeaderboardCategory, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="principal-period" role="group" aria-label="Periode leaderboard">
            <button
              type="button"
              aria-pressed={category === "WEEKLY_XP" || period === "weekly"}
              onClick={() => setPeriod("weekly")}
            >
              Mingguan
            </button>
            <button
              type="button"
              disabled={category === "WEEKLY_XP"}
              aria-pressed={category !== "WEEKLY_XP" && period === "all-time"}
              onClick={() => setPeriod("all-time")}
            >
              Sepanjang waktu
            </button>
          </div>
          {category === "FASTEST_CLEAR" && (
            <p className="principal-leaderboard-note">
              Lintasan Kiriman yang Hilang V2, termasuk perjalanan World.
            </p>
          )}
          {!board && !boardError && (
            <p role="status" className="principal-loading">
              Memuat peringkat…
            </p>
          )}
          {board && (
            <>
              <p className="principal-reset">
                {board.period === "weekly"
                  ? `Reset Senin · ${new Date(board.resetsAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`
                  : "Rekor sepanjang waktu"}
              </p>
              <ol className="principal-ranking-list">
                {board.top.map((row) => {
                  const own = row.playerId === board.own?.playerId;
                  return (
                    <li key={row.playerId} data-own={own || undefined}>
                      <span className="principal-rank" data-rank={row.rank}>
                        {row.rank <= 3 ? <Crown aria-hidden fill="currentColor" /> : `#${row.rank}`}
                      </span>
                      <span className="principal-rank-name">{row.name}</span>
                      <strong>
                        {row.score.toLocaleString("id-ID")}
                        {category === "FASTEST_CLEAR" ? " dtk" : ""}
                      </strong>
                    </li>
                  );
                })}
              </ol>
              {!board.top.length && (
                <div className="principal-empty">
                  <Trophy aria-hidden />
                  <strong>Leaderboard masih kosong</strong>
                  <p>Belum ada catatan. Selesaikan misi untuk masuk peringkat.</p>
                </div>
              )}
              <div className="principal-own-rank">
                <Medal aria-hidden />
                <span>
                  <small>Peringkatmu</small>
                  <strong>
                    {board.own
                      ? `#${board.own.rank} · ${board.own.score}${category === "FASTEST_CLEAR" ? " dtk" : ""}`
                      : "Belum ada catatan"}
                  </strong>
                </span>
              </div>
              <p className="principal-reward">{board.reward}</p>
              {board.achievements.length > 0 && (
                <div className="principal-achievements">
                  <h3>Achievement profil</h3>
                  {board.achievements.map((achievement) => (
                    <p key={`${achievement.period}-${achievement.category}`}>
                      <Medal aria-hidden /> {achievement.badge} · #{achievement.rank} ·{" "}
                      {achievement.period}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
          {boardError && (
            <p role="alert" className="principal-error">
              {boardError}
            </p>
          )}
        </section>
      )}
      {error && !quests.length && (
        <p role="alert" className="principal-error">
          {error}
        </p>
      )}
    </GameModal>
  );
}
