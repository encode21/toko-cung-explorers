import { useMissionFocus } from "@/state/mission-focus";
import { trackDaily } from "@/game/daily/store";
import { useHud } from "@/state/hud-store";
import { GameDialog } from "@/ui/game-ui/GamePrimitives";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { useDungeon } from "@/game/dungeon/store";
import { useEffect, useState } from "react";
import { ArrowLeft, Flag, LockKeyhole, MapPin, Sparkles, Check, Star } from "lucide-react";
import { useGameCore, command } from "@/game/core/store";
import { nextLevel } from "@/game/core/types";
import { useGame } from "@/state/game-store";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";
import "./quest-journal.css";

const categories: Record<string, string> = {
  WORLD: "Petualangan dunia",
  DAILY: "Misi harian",
  SUPPLIER: "Pengantaran",
  PRINCIPAL: "Petualangan brand",
  DUNGEON: "Dungeon",
  EASTER_EGG: "Rahasia dunia",
  REACTIVE: "Event dunia",
};

const FILTERS = ["Semua", "Tersedia", "Aktif", "Riwayat"] as const;

export function QuestBoard({ compact = false }: { compact?: boolean }) {
  const snapshot = useGameCore((s) => s.snapshot);
  const busy = useGameCore((s) => s.busy);
  const pending = useGameCore((s) => s.pending);
  const error = useGameCore((s) => s.error);
  const syncing = useGameCore((s) => s.syncing);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    void command("read");
  }, []);
  const quests =
    snapshot?.quests.filter((q) =>
      filter === "Tersedia"
        ? q.available
        : filter === "Aktif"
          ? snapshot.active?.quest_id === q.id
          : true,
    ) ?? [];
  const quest =
    quests.find((q) => q.id === selected) ??
    quests.find((q) => q.id === snapshot?.active?.quest_id) ??
    quests.find((q) => q.available) ??
    quests[0];
  const active = !!quest && snapshot?.active?.quest_id === quest.id;
  const next = snapshot ? nextLevel(snapshot) : null;
  const accept = async () => {
    if (!quest) return;
    if (quest.category === "DUNGEON") {
      useDungeon.setState({ tracked: true });
      useHud.getState().setSheet(null);
      useGame.getState().closeOverlay();
      return;
    }
    const result = await command("accept", { questId: quest.id });
    if (result.ok && result.snapshot.active?.quest_id === quest.id) {
      trackDaily(null);
      useMissionFocus.setState({ source: "quest" });
      useDungeon.setState({ tracked: false });
      useGame.getState().setToast(`Quest diterima · ${quest.title}`);
      useHud.getState().setSheet(null);
      useGame.getState().closeOverlay();
    }
  };
  return (
    <div className="quest-journal">
      {!compact && (
        <div className="quest-journal-summary">
          {snapshot ? (
            <section aria-label="Progression pemain">
              <div className="flex items-baseline justify-between gap-2">
                <strong className="truncate">
                  LV. {snapshot.profile.level} · {snapshot.profile.title}
                </strong>
              </div>
              <p className="tabular-nums text-[11px]">
                {snapshot.profile.xp.toLocaleString("id-ID")} /{" "}
                {next ? next.xp.toLocaleString("id-ID") : "MAX"} XP
              </p>
              <progress
                aria-label="XP menuju level berikutnya"
                className="mt-1 h-2.5 w-full"
                max={next?.xp ?? Math.max(1, snapshot.profile.xp)}
                value={snapshot.profile.xp}
              />
            </section>
          ) : (
            <p className="text-xs">Progression belum terhubung</p>
          )}
          {snapshot && (
            <span className="quest-journal-point">
              <PointCoinIcon />
              {snapshot.wallet.current_balance.toLocaleString("id-ID")}
            </span>
          )}
        </div>
      )}
      <nav aria-label="Filter quest" className="quest-journal-tabs">
        {FILTERS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={filter === tab}
            onClick={() => {
              setFilter(tab);
              setDetail(false);
              setConfirm(false);
            }}
            className="quest-journal-tab"
          >
            {tab}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="quest-journal-error">
          {error}
        </p>
      )}
      {!snapshot ? (
        <div className="quest-journal-loading">
          <AdventureSkeleton label="Membuka jurnal…" />
          <ActionButton busy={syncing} busyLabel="Memuat…" onClick={() => void command("read")}>
            Muat ulang quest
          </ActionButton>
        </div>
      ) : filter === "Riwayat" ? (
        <div className="quest-journal-history">
          <p className="quest-journal-eyebrow">Jejak petualangan</p>
          <h3>Cerita yang telah dilalui</h3>
          {!snapshot.history.length && (
            <p className="quest-journal-list-empty">
              Belum ada riwayat. Petualangan pertamamu menunggu.
            </p>
          )}
          {snapshot.history.map((r) => (
            <div key={r.id} className="quest-journal-history-card">
              <strong>
                {snapshot.quests.find((q) => q.id === r.quest_id)?.title ?? r.quest_id}
              </strong>
              <p>
                {r.status === "COMPLETED"
                  ? "Selesai"
                  : r.status === "CANCELLED"
                    ? "Dibatalkan"
                    : r.status}{" "}
                · +{r.xp_awarded} XP · +{r.point_awarded} Point
              </p>
            </div>
          ))}
          <details className="quest-journal-ledger">
            <summary>Detail Point dan riwayat saldo</summary>
            <p>
              Batas 10.000 Point per hari WIB, mengikuti ketersediaan reward. XP tetap dapat
              diperoleh. Penukaran nantinya di Toko Cung App.
            </p>
            {snapshot.ledger.map((l) => (
              <p key={l.id}>
                {new Date(l.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB ·
                +{l.amount} P · Saldo {l.balance_after} P
              </p>
            ))}
          </details>
        </div>
      ) : (
        <div className="quest-journal-columns" data-detail={detail ? "open" : "list"}>
          <div className="quest-journal-list">
            {!quests.length && (
              <p className="quest-journal-list-empty">
                {filter === "Aktif"
                  ? "Belum ada quest aktif. Pilih petualangan dari tab Tersedia."
                  : "Belum ada quest tersedia. Kembali setelah syarat atau event terpenuhi."}
              </p>
            )}
            {quests.map((q) => {
              const isActive = snapshot.active?.quest_id === q.id;
              const state = isActive ? "active" : q.available ? "available" : "locked";
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setSelected(q.id);
                    setDetail(true);
                    setConfirm(false);
                  }}
                  aria-pressed={quest?.id === q.id}
                  data-state={state}
                  className="quest-journal-item"
                >
                  <span className="quest-journal-icon" aria-hidden="true">
                    {isActive ? <Flag /> : q.available ? <Sparkles /> : <LockKeyhole />}
                  </span>
                  <span>
                    <span className="quest-journal-category">{categories[q.category]}</span>
                    <strong className="quest-journal-item-title">{q.title}</strong>
                    <span className="quest-journal-item-meta">
                      {isActive
                        ? "Sedang dilacak"
                        : q.available
                          ? `${q.rewards.xp} XP${q.rewards.point ? ` · hingga ${q.rewards.point} Point` : ""}`
                          : q.reason || "Belum tersedia"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <section className="quest-journal-detail" aria-label="Detail quest">
            <button type="button" className="quest-journal-back" onClick={() => setDetail(false)}>
              <ArrowLeft aria-hidden="true" />
              Daftar quest
            </button>
            {quest ? (
              <>
                <p className="quest-journal-eyebrow">
                  {categories[quest.category]} ·{" "}
                  {quest.repeat_policy === "DAILY"
                    ? "Harian"
                    : quest.repeat_policy === "ONCE"
                      ? "Satu kali"
                      : "Dapat diulang"}
                </p>
                <h3 className="quest-journal-title">{quest.title}</h3>
                <p className="quest-journal-description">{quest.description}</p>
                <p className="quest-journal-location">
                  <MapPin aria-hidden="true" />
                  {quest.location}
                </p>
                <div className="quest-journal-rewards">
                  <span className="quest-journal-reward">
                    <Star aria-hidden="true" />+{quest.rewards.xp} XP
                  </span>
                  {quest.rewards.point > 0 && (
                    <span className="quest-journal-reward quest-journal-reward-point">
                      <PointCoinIcon />
                      Hingga {quest.rewards.point} Point
                    </span>
                  )}
                </div>
                <h4 className="quest-journal-eyebrow">Tujuan perjalanan</h4>
                <ol className="quest-journal-objectives">
                  {quest.objectives.map((o, i) => {
                    const current = active
                      ? quest.objectives.findIndex(
                          (obj, n) => (snapshot.active?.progress[n] ?? 0) < obj.required,
                        )
                      : 0;
                    if (
                      (quest.progressive || quest.category === "EASTER_EGG") &&
                      i > Math.max(0, current)
                    )
                      return null;
                    const done = active && (snapshot.active?.progress[i] ?? 0) >= o.required;
                    return (
                      <li key={i}>
                        <span className="quest-journal-step" data-done={done ? "true" : "false"}>
                          {done ? <Check aria-hidden="true" /> : i + 1}
                        </span>
                        <span className={done ? "quest-journal-objective-done" : undefined}>
                          {quest.category === "EASTER_EGG" && !done && i > current
                            ? "???"
                            : o.label}
                          {active && !o.secret
                            ? ` · ${snapshot.active?.progress[i] ?? 0}/${o.required}`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div className="quest-journal-actions">
                  {quest.category === "DUNGEON" ? (
                    !quest.available ? (
                      <p className="quest-journal-locked">
                        <LockKeyhole aria-hidden="true" />
                        {quest.reason ||
                          (quest.repeat_policy === "ONCE"
                            ? "Misi satu kali ini sudah kamu selesaikan."
                            : "Dungeon belum tersedia")}
                      </p>
                    ) : (
                      <ActionButton onClick={() => void accept()}>Lacak pintu dungeon</ActionButton>
                    )
                  ) : active ? (
                    <>
                      <ActionButton
                        onClick={() => {
                          trackDaily(null);
                          useMissionFocus.setState({ source: "quest" });
                          useGame.setState({ waypoint: null, guidanceMuted: false });
                          useDungeon.setState({ tracked: false });
                          useHud.getState().setSheet(null);
                          useGame.getState().closeOverlay();
                        }}
                      >
                        Lanjutkan petualangan
                      </ActionButton>
                      {quest.cancellable && (
                        <div className="mt-2">
                          {confirm ? (
                            <GameDialog
                              title="Konfirmasi pembatalan"
                              onClose={() => setConfirm(false)}
                            >
                              <p className="mb-3 text-sm">
                                Batalkan quest ini? Progres run ini akan berakhir.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <ActionButton
                                  busy={busy && pending === "cancel"}
                                  busyLabel="Membatalkan…"
                                  disabled={busy}
                                  className="adventure-secondary"
                                  onClick={async () => {
                                    const result = await command("cancel");
                                    if (result.ok) {
                                      setConfirm(false);
                                      useGame.getState().setToast("Quest dibatalkan");
                                    }
                                  }}
                                >
                                  Ya, batalkan
                                </ActionButton>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="quest-journal-action quest-journal-action-secondary"
                                  onClick={() => setConfirm(false)}
                                >
                                  Tetap lanjut
                                </button>
                              </div>
                            </GameDialog>
                          ) : (
                            <button
                              type="button"
                              className="quest-journal-cancel"
                              onClick={() => setConfirm(true)}
                            >
                              Batalkan quest
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : !quest.available ? (
                    <p className="quest-journal-locked">
                      <LockKeyhole aria-hidden="true" />
                      {quest.reason || "Quest belum tersedia"}
                    </p>
                  ) : snapshot.active ? (
                    <p className="quest-journal-hint">
                      Selesaikan atau batalkan quest aktif sebelum menerima petualangan berikutnya.
                    </p>
                  ) : (
                    <ActionButton
                      busy={busy && pending === "accept"}
                      busyLabel="Menerima quest…"
                      disabled={busy}
                      onClick={() => void accept()}
                    >
                      Terima & lacak quest
                    </ActionButton>
                  )}
                </div>
              </>
            ) : (
              <p className="quest-journal-list-empty">Pilih quest untuk melihat ceritanya.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
