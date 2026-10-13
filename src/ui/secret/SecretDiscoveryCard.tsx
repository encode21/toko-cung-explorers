import { GameModal } from "@/ui/game-ui/GamePanel";
import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { command, useGameCore } from "@/game/core/store";
import { useSecretQuest } from "@/game/secret/store";
import { useGame } from "@/state/game-store";
import type { SecretClue } from "@/game/secret/types";

function SequencePicker({
  items,
  order,
  onToggle,
}: {
  items: string[];
  order: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-amber-200/80">
        Ketuk urutan · {order.length}/{items.length}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const rank = order.indexOf(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`min-h-11 min-w-[7.5rem] flex-1 rounded-xl px-3 text-sm ${
                rank >= 0
                  ? "bg-amber-200 text-slate-900"
                  : "bg-white/10 text-slate-100 hover:bg-white/15"
              }`}
            >
              {rank >= 0 ? `${rank + 1}. ` : ""}
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBanner({
  tone,
  title,
  detail,
}: {
  tone: "ok" | "bad" | "warn";
  title: string;
  detail?: string | null;
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-300/50 bg-emerald-400/20 text-emerald-50"
      : tone === "bad"
        ? "border-rose-300/50 bg-rose-500/25 text-rose-50"
        : "border-amber-200/40 bg-amber-200/15 text-amber-50";
  return (
    <div role="status" className={`mt-3 rounded-xl border px-3 py-2.5 ${cls}`}>
      <p className="text-sm font-semibold">{title}</p>
      {detail ? <p className="mt-1 text-xs leading-relaxed opacity-95">{detail}</p> : null}
    </div>
  );
}

export function SecretDiscoveryCard() {
  const open = useSecretQuest((s) => s.open);
  const objectiveIndex = useSecretQuest((s) => s.objectiveIndex);
  const feedback = useSecretQuest((s) => s.feedback);
  const closeDiscovery = useSecretQuest((s) => s.closeDiscovery);
  const setFeedback = useSecretQuest((s) => s.setFeedback);
  const snapshot = useGameCore((s) => s.snapshot);
  const busy = useGameCore((s) => s.busy);
  const [choice, setChoice] = useState<string | null>(null);
  const [sequence, setSequence] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  const objective = objectiveIndex !== null && quest ? quest.objectives[objectiveIndex] : null;
  const secret = objective?.secret as SecretClue | undefined;

  useEffect(() => {
    setChoice(null);
    setSequence([]);
    setLocalError("");
    setFeedback(null);
    setSubmitting(false);
  }, [objectiveIndex, setFeedback]);

  const archiveLabel = useMemo(() => {
    if (!secret) return "";
    const n = String(secret.archiveIndex).padStart(2, "0");
    return `TOKO CUNG ARCHIVE #${n}`;
  }, [secret]);

  if (!open || !secret || objectiveIndex === null || !run) return null;

  const isSequence = secret.interactionType === "SEQUENCE";
  const solved = !!feedback?.ok;
  const wrong = !!feedback && !feedback.ok;

  const submit = async () => {
    const answer = isSequence ? sequence : choice;
    if (!answer || (Array.isArray(answer) && answer.length === 0) || submitting) return;
    setLocalError("");
    setFeedback(null);
    setSubmitting(true);
    useGameCore.setState({ error: "" });
    try {
      // Do not pose-then-objective: a second locked request stacks behind the
      // heartbeats and often hits the gateway timeout ("Koneksi terputus").
      // Presence is already refreshed by GameCoreRuntime; secret answers allow
      // a wider investigation radius server-side.
      const result = await command("objective", {
        objective: objectiveIndex,
        answer,
      });
      if (!result.ok) {
        setLocalError(result.error || "Gagal memeriksa jawaban.");
        setShake(true);
        window.setTimeout(() => setShake(false), 320);
        return;
      }
      const fb = result.snapshot.secretFeedback ?? null;
      if (!fb) {
        setLocalError("Server tidak mengembalikan hasil jawaban. Coba lagi.");
        setShake(true);
        window.setTimeout(() => setShake(false), 320);
        return;
      }
      setFeedback(fb);
      if (fb.ok) {
        const xp = (fb.xpAwarded ?? 0) + (fb.firstTryBonus ?? 0);
        useGame.getState().setToast(`${fb.firstTry ? "Perfect Discovery · " : ""}+${xp} XP`);
        return;
      }
      setShake(true);
      window.setTimeout(() => setShake(false), 320);
    } finally {
      setSubmitting(false);
    }
  };

  const continueAfterSolve = () => {
    closeDiscovery();
    const nextHint = feedback?.nextClueHint;
    if (nextHint) useGame.getState().setToast(nextHint);
  };

  return (
    <GameModal
      title={secret.title}
      subtitle={archiveLabel}
      onClose={closeDiscovery}
      className={shake ? "animate-pulse" : ""}
    >
      <header className="border-b border-white/10 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
          {solved ? "Archive Unlocked" : "Secret Discovered"}
        </p>
        <p className="mt-1 text-[11px] text-world-muted">{archiveLabel}</p>
        <h2 className="text-base font-semibold text-amber-50">“{secret.title}”</h2>
        {!solved && secret.discoveryText && (
          <p className="mt-1 text-xs text-slate-200">{secret.discoveryText}</p>
        )}
      </header>

      {solved ? (
        <div className="mt-1 space-y-2">
          <StatusBanner
            tone="ok"
            title={feedback?.firstTry ? "Benar · Perfect Discovery!" : "Benar!"}
            detail={
              typeof feedback?.xpAwarded === "number"
                ? `+${(feedback.xpAwarded ?? 0) + (feedback.firstTryBonus ?? 0)} XP${
                    feedback.nextClueHint ? ` · ${feedback.nextClueHint}` : ""
                  }`
                : (feedback?.nextClueHint ?? null)
            }
          />
          <ActionButton
            onClick={continueAfterSolve}
            className="mt-1 min-h-11 w-full rounded-xl bg-amber-200 px-3 text-sm font-semibold text-slate-900"
          >
            Lanjut jelajah
          </ActionButton>
        </div>
      ) : (
        <>
          {secret.funFact && (
            <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-xs leading-relaxed text-slate-100">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-amber-200/80">
                Fun Fact
              </span>
              {secret.funFact}
            </p>
          )}

          {secret.interactionType === "OBSERVATION" && (
            <p className="mt-2 text-[11px] text-world-muted">
              Amati lingkungan sekitar — jawabannya tidak tertulis di kartu ini.
            </p>
          )}

          <p className="mt-3 text-sm font-medium text-slate-50">{secret.question}</p>
          <p className="mt-1 text-[11px] leading-snug text-world-muted">
            Salah jawab? Petunjuk terbuka otomatis (hingga 3 tingkat). Bonus XP first-try hilang —
            point tidak dipotong.
          </p>

          {isSequence ? (
            <SequencePicker
              items={secret.answers}
              order={sequence}
              onToggle={(item) =>
                setSequence((prev) =>
                  prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
                )
              }
            />
          ) : (
            <div className="mt-2 grid gap-2">
              {secret.answers.map((option, i) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setChoice(option);
                    setLocalError("");
                  }}
                  className={`min-h-11 rounded-xl px-3 text-left text-sm ${
                    choice === option
                      ? "bg-amber-200 text-slate-900"
                      : "bg-white/10 text-slate-100 hover:bg-white/15"
                  }`}
                >
                  <span className="mr-2 text-world-muted">{String.fromCharCode(65 + i)}.</span>
                  {option}
                </button>
              ))}
            </div>
          )}

          {wrong && (
            <StatusBanner
              tone="bad"
              title="Belum tepat"
              detail={
                feedback?.hint
                  ? `${feedback.message ?? "Coba lagi."} Petunjuk: ${feedback.hint}`
                  : (feedback?.message ?? "Coba jawaban lain.")
              }
            />
          )}

          {!!localError && (
            <StatusBanner tone="warn" title="Belum bisa dicek" detail={localError} />
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-white/10 text-sm"
              onClick={closeDiscovery}
            >
              Nanti
            </button>
            <ActionButton
              busy={busy || submitting}
              busyLabel="Memeriksa…"
              disabled={
                busy ||
                submitting ||
                (isSequence ? sequence.length !== secret.answers.length : !choice)
              }
              onClick={() => void submit()}
              className="min-h-11 flex-[1.4] rounded-xl bg-amber-200 px-3 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              Jawab
            </ActionButton>
          </div>
        </>
      )}
    </GameModal>
  );
}
