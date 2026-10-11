import { useEffect, useState } from "react";
import { useDungeon, dungeonCommand } from "@/game/dungeon/store";
import { useHud } from "@/state/hud-store";
import { useGameCore } from "@/game/core/store";
import { worldRequest } from "@/services/world/client";
import { connectionId } from "@/net/channel-store";
import type { LeaderboardCategory, PrincipalLeaderboard } from "@/game/dungeon/types";
const categories: Record<LeaderboardCategory, string> = {
  WEEKLY_XP: "XP Mingguan",
  QUESTS_COMPLETED: "Quest Selesai",
  DUNGEON_CLEARS: "Dungeon Clears",
  EASTER_EGGS: "Rahasia Ditemukan",
  FASTEST_CLEAR: "Waktu Tercepat",
};
export function PrincipalBoard() {
  const panel = useHud((s) => s.principalPanel);
  const { data, busy, error } = useDungeon();
  const snapshot = useGameCore((s) => s.snapshot);
  const [category, setCategory] = useState<LeaderboardCategory>("WEEKLY_XP");
  const [period, setPeriod] = useState<"weekly" | "all-time">("weekly");
  const [board, setBoard] = useState<PrincipalLeaderboard | null>(null);
  const [boardError, setBoardError] = useState("");
  useEffect(() => {
    if (panel !== "leaderboard") return;
    let cancelled = false;
    setBoard(null);
    setBoardError("");
    void worldRequest<PrincipalLeaderboard>("dungeon", {
      action: "leaderboard",
      connectionId,
      category,
      period,
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
  }, [panel, category, period]);
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
  const button = "min-h-11 rounded-lg border border-white/20 px-3 text-sm disabled:opacity-40";
  return (
    <div
      data-ui-panel
      data-hud-control
      className="pointer-events-auto absolute inset-0 z-[65] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Principal Quest Hub"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-200/25 bg-slate-950 text-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <p className="text-[10px] tracking-[.2em] text-amber-200">
              PRINCIPAL / DISTRIBUTION CENTER
            </p>
            <h2 className="mt-1 text-xl font-semibold">Quest Hub</h2>
            <p className="mt-1 text-xs text-slate-400">
              Level {level} · Temukan jejak, jelajahi kota, bangun reputasi.
            </p>
          </div>
          <button
            autoFocus
            className={button}
            onClick={() => useHud.setState({ principalPanel: null })}
            aria-label="Tutup Quest Hub"
          >
            Tutup
          </button>
        </header>
        <nav className="flex gap-2 px-4 pt-3" aria-label="Principal hub">
          <button
            aria-pressed={panel === "missions"}
            className={`${button} ${panel === "missions" ? "bg-amber-200 text-slate-950" : ""}`}
            onClick={() => useHud.setState({ principalPanel: "missions" })}
          >
            Mission Board
          </button>
          <button
            aria-pressed={panel === "leaderboard"}
            className={`${button} ${panel === "leaderboard" ? "bg-amber-200 text-slate-950" : ""}`}
            onClick={() => useHud.setState({ principalPanel: "leaderboard" })}
          >
            Leaderboard
          </button>
        </nav>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {panel === "missions" ? (
            <>
              <div className="mb-5 grid gap-2 sm:grid-cols-3">
                {data.config.chapters?.map((ch) => (
                  <div
                    key={ch.id}
                    className={`rounded-lg border p-3 text-xs ${level >= ch.minLevel ? "border-teal-300/30 bg-teal-300/5" : "border-white/10 text-slate-400"}`}
                  >
                    <p>
                      CHAPTER {ch.id} · Lv.{ch.minLevel}
                      {ch.maxLevel ? `–${ch.maxLevel}` : "+"}
                    </p>
                    <p className="mt-1 font-semibold">{ch.title}</p>
                    {level < ch.minLevel && <p className="mt-1">Requires Level {ch.minLevel}</p>}
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quests.map((q) => (
                  <article
                    key={q.id}
                    className="rounded-xl border border-white/10 bg-white/[.03] p-4"
                  >
                    <p className="text-[10px] tracking-widest text-amber-200">
                      {q.mission_kind ?? "MAIN"} QUEST · Lv.{q.prerequisites.level} · CH.
                      {q.chapter ?? 1}
                    </p>
                    <h3 className="mt-2 font-semibold">{q.title}</h3>
                    <p className="my-2 text-xs leading-5 text-slate-300">{q.description}</p>
                    <p className="text-xs text-amber-100">
                      +{q.rewards.xp} XP ·{" "}
                      {q.repeat_policy === "DAILY" ? "Reset harian WIB" : "Satu kali"}
                    </p>
                    <button
                      className={`${button} mt-3 w-full ${q.available ? "bg-amber-200 text-slate-950" : ""}`}
                      disabled={busy || !!data.instance || !q.available}
                      onClick={() => {
                        void dungeonCommand("enter", undefined, q.id).then(() => {
                          if (useDungeon.getState().data?.instance)
                            useHud.setState({ principalPanel: null });
                        });
                      }}
                    >
                      {level < (q.prerequisites.level ?? 1)
                        ? `Requires Level ${q.prerequisites.level}`
                        : data.instance
                          ? "Selesaikan misi aktif"
                          : !q.available
                            ? q.reason
                            : "Mulai misi"}
                    </button>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Petunjuk terbuka bertahap selama misi. Beberapa perjalanan berlanjut di World.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Kategori leaderboard"
                  className={`${button} min-w-0 bg-slate-900`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LeaderboardCategory)}
                >
                  {Object.entries(categories).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Periode leaderboard"
                  disabled={category === "WEEKLY_XP"}
                  className={`${button} bg-slate-900`}
                  value={category === "WEEKLY_XP" ? "weekly" : period}
                  onChange={(e) => setPeriod(e.target.value as "weekly" | "all-time")}
                >
                  <option value="weekly">Mingguan</option>
                  <option value="all-time">Sepanjang waktu</option>
                </select>
              </div>
              {category === "FASTEST_CLEAR" && (
                <p className="mt-3 text-xs text-slate-300">
                  Lintasan: Kiriman yang Hilang V2. Waktu termasuk perjalanan World.
                </p>
              )}
              {!board && !boardError && (
                <p role="status" className="py-6">
                  Memuat peringkat…
                </p>
              )}
              {board && (
                <>
                  <p className="my-3 text-xs text-slate-400">
                    {board.period === "weekly"
                      ? `Reset Senin · ${new Date(board.resetsAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`
                      : "Rekor sepanjang waktu"}
                  </p>
                  <ol className="divide-y divide-white/10">
                    {board.top.map((row) => (
                      <li
                        key={row.playerId}
                        className={`flex items-center gap-3 py-3 text-sm ${row.playerId === board.own?.playerId ? "text-amber-200" : ""}`}
                      >
                        <span className="w-8">#{row.rank}</span>
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <strong>
                          {row.score.toLocaleString("id-ID")}
                          {category === "FASTEST_CLEAR" ? " dtk" : ""}
                        </strong>
                      </li>
                    ))}
                  </ol>
                  {!board.top.length && (
                    <p className="py-6 text-sm">
                      Belum ada catatan. Selesaikan misi untuk masuk peringkat.
                    </p>
                  )}
                  <p className="mt-4 rounded-lg bg-teal-300/10 p-3 text-sm">
                    Peringkatmu:{" "}
                    {board.own
                      ? `#${board.own.rank} · ${board.own.score}${category === "FASTEST_CLEAR" ? " dtk" : ""}`
                      : "Belum ada catatan"}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">{board.reward}</p>
                  {board.achievements.length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-sm font-semibold">Achievement profil</h3>
                      {board.achievements.map((a) => (
                        <p
                          key={`${a.period}-${a.category}`}
                          className="mt-2 text-xs text-amber-200"
                        >
                          ✦ {a.badge} · #{a.rank} · {a.period}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
              {boardError && (
                <p role="alert" className="mt-3 text-red-200">
                  {boardError}
                </p>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
