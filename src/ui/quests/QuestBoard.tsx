import { GameDialog } from "@/ui/game-ui/GamePrimitives";
import { useDungeon } from "@/game/dungeon/store";
import { useEffect, useState } from "react";
import { ArrowLeft, Flag, LockKeyhole, MapPin, Sparkles, Check } from "lucide-react";
import { useGameCore, command } from "@/game/core/store";
import { GameProgress } from "@/ui/hud/GameProgress";
import { useGame } from "@/state/game-store";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";
const categories: Record<string, string> = {
  WORLD: "Petualangan dunia",
  DAILY: "Misi harian",
  SUPPLIER: "Pengantaran",
  PRINCIPAL: "Petualangan brand",
  DUNGEON: "Dungeon",
  EASTER_EGG: "Rahasia dunia",
  REACTIVE: "Event dunia",
};
export function QuestBoard() {
  const snapshot = useGameCore((s) => s.snapshot);
  const busy = useGameCore((s) => s.busy);
  const pending = useGameCore((s) => s.pending);
  const error = useGameCore((s) => s.error);
  const syncing = useGameCore((s) => s.syncing);
  const [filter, setFilter] = useState("Semua");
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
  const accept = async () => {
    if (!quest) return;
    if (quest.category === "DUNGEON") {
      useDungeon.setState({ tracked: true });
      useGame.getState().closeOverlay();
      return;
    }
    const result = await command("accept", { questId: quest.id });
    if (result.ok && result.snapshot.active?.quest_id === quest.id) {
      useGame.getState().setToast(`Quest diterima · ${quest.title}`);
      useGame.getState().closeOverlay();
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col quest-journal">
      <div className="game-quest-toolbar">
        <div className="max-w-md">
          <GameProgress compact />
        </div>
        <nav aria-label="Filter quest" className="mt-4 flex gap-2 overflow-x-auto">
          {["Semua", "Tersedia", "Aktif", "Riwayat"].map((tab) => (
            <button
              key={tab}
              aria-pressed={filter === tab}
              onClick={() => {
                setFilter(tab);
                setDetail(false);
                setConfirm(false);
              }}
              className={`min-h-11 shrink-0 rounded-lg px-4 text-sm ${filter === tab ? "bg-amber-200 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      {error && (
        <p
          role="alert"
          className="shrink-0 border-b border-red-300/20 bg-red-300/10 px-5 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {!snapshot ? (
        <div className="overflow-y-auto p-6">
          <AdventureSkeleton label="Membuka jurnal…" />
          <ActionButton busy={syncing} busyLabel="Memuat…" onClick={() => void command("read")}>
            Muat ulang quest
          </ActionButton>
        </div>
      ) : filter === "Riwayat" ? (
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <p className="adventure-eyebrow">Jejak petualangan</p>
          <h3 className="mb-5 mt-2 font-display text-3xl">CERITA YANG TELAH DILALUI</h3>
          {!snapshot.history.length && (
            <p className="text-slate-300">Belum ada riwayat. Petualangan pertamamu menunggu.</p>
          )}
          {snapshot.history.map((r) => (
            <div key={r.id} className="mb-3 rounded-xl border border-white/10 p-4">
              <strong>
                {snapshot.quests.find((q) => q.id === r.quest_id)?.title ?? r.quest_id}
              </strong>
              <p className="mt-2 text-sm text-slate-300">
                {r.status === "COMPLETED"
                  ? "Selesai"
                  : r.status === "CANCELLED"
                    ? "Dibatalkan"
                    : r.status}{" "}
                · +{r.xp_awarded} XP · +{r.point_awarded} Point
              </p>
            </div>
          ))}
          <details className="mt-6 text-sm">
            <summary className="min-h-11 cursor-pointer text-amber-200">
              Detail Point dan riwayat saldo
            </summary>
            <p className="mb-4 text-slate-300">
              Batas 10.000 Point per hari WIB, mengikuti ketersediaan reward. XP tetap dapat
              diperoleh. Penukaran nantinya di Toko Cung App.
            </p>
            {snapshot.ledger.map((l) => (
              <p key={l.id} className="border-t border-white/10 py-3">
                {new Date(l.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB ·
                +{l.amount} P · Saldo {l.balance_after} P
              </p>
            ))}
          </details>
        </div>
      ) : (
        <div className="game-quest-columns">
          <div
            className={`${detail ? "hidden md:block" : ""} min-h-0 overflow-y-auto border-r border-white/10 p-3 sm:p-4`}
          >
            {!quests.length && (
              <p className="p-5 text-sm text-slate-300">
                {filter === "Aktif"
                  ? "Belum ada quest aktif. Pilih petualangan dari tab Tersedia."
                  : "Belum ada quest tersedia. Kembali setelah syarat atau event terpenuhi."}
              </p>
            )}
            {quests.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  setSelected(q.id);
                  setDetail(true);
                  setConfirm(false);
                }}
                aria-pressed={quest?.id === q.id}
                className={`mb-3 flex w-full gap-3 rounded-xl border p-4 text-left transition active:scale-[.99] ${quest?.id === q.id ? "border-amber-200/70 bg-amber-200/10" : "border-white/10 bg-white/[.025] hover:bg-white/5"}`}
              >
                <span className="mt-1 text-amber-200">
                  {snapshot.active?.quest_id === q.id ? (
                    <Flag className="size-5" />
                  ) : q.available ? (
                    <Sparkles className="size-5" />
                  ) : (
                    <LockKeyhole className="size-5 text-slate-400" />
                  )}
                </span>
                <span>
                  <span className="adventure-eyebrow text-[9px]">{categories[q.category]}</span>
                  <strong className="mt-2 block leading-5">{q.title}</strong>
                  <span className="mt-2 block text-xs text-slate-300">
                    {snapshot.active?.quest_id === q.id
                      ? "Sedang dilacak"
                      : q.available
                        ? `${q.rewards.xp} XP${q.rewards.point ? ` · hingga ${q.rewards.point} Point` : ""}`
                        : q.reason || "Belum tersedia"}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <section
            className={`${detail ? "" : "hidden md:block"} min-h-0 overflow-y-auto p-5 sm:p-8`}
            aria-label="Detail quest"
          >
            <button
              className="mb-4 flex min-h-11 items-center gap-2 text-sm text-amber-200 md:hidden"
              onClick={() => setDetail(false)}
            >
              <ArrowLeft className="size-4" />
              Daftar quest
            </button>
            {quest ? (
              <>
                <p className="adventure-eyebrow">
                  {categories[quest.category]} ·{" "}
                  {quest.repeat_policy === "DAILY"
                    ? "Harian"
                    : quest.repeat_policy === "ONCE"
                      ? "Satu kali"
                      : "Dapat diulang"}
                </p>
                <h3 className="mt-4 font-display text-4xl leading-tight">{quest.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{quest.description}</p>
                <p className="mt-4 flex items-center gap-2 text-xs text-amber-200">
                  <MapPin className="size-4" />
                  {quest.location}
                </p>
                <div className="my-6 flex flex-wrap gap-3">
                  <span className="rounded-lg border border-amber-200/30 bg-amber-200/10 px-4 py-3 font-semibold text-amber-200">
                    +{quest.rewards.xp} XP
                  </span>
                  {quest.rewards.point > 0 && (
                    <span className="rounded-lg border border-white/15 px-4 py-3 text-sm">
                      Hingga {quest.rewards.point} Point
                    </span>
                  )}
                </div>
                <h4 className="adventure-eyebrow">Tujuan perjalanan</h4>
                <ol className="my-4 space-y-3">
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
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-amber-200/30 text-xs text-amber-200">
                          {done ? <Check className="size-4" /> : i + 1}
                        </span>
                        <span className={done ? "text-slate-400 line-through" : "text-slate-200"}>
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
                <div className="mt-7 border-t border-white/10 pt-5">
                  {quest.category === "DUNGEON" ? (
                    !quest.available ? (
                      <p className="flex gap-2 rounded-xl bg-white/5 p-4 text-sm text-slate-300">
                        <LockKeyhole className="size-5 shrink-0" />
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
                      <ActionButton onClick={() => useGame.getState().closeOverlay()}>
                        Lanjutkan petualangan
                      </ActionButton>
                      {quest.cancellable && (
                        <div className="mt-4">
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
                                  disabled={busy}
                                  className="min-h-11 px-3 text-sm"
                                  onClick={() => setConfirm(false)}
                                >
                                  Tetap lanjut
                                </button>
                              </div>
                            </GameDialog>
                          ) : (
                            <button
                              className="min-h-11 text-sm text-slate-300 underline"
                              onClick={() => setConfirm(true)}
                            >
                              Batalkan quest
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : !quest.available ? (
                    <p className="flex gap-2 rounded-xl bg-white/5 p-4 text-sm text-slate-300">
                      <LockKeyhole className="size-5 shrink-0" />
                      {quest.reason || "Quest belum tersedia"}
                    </p>
                  ) : snapshot.active ? (
                    <p className="text-sm text-slate-300">
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
              <p className="text-slate-300">Pilih quest untuk melihat ceritanya.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
