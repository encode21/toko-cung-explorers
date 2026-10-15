import { GameModal } from "@/ui/game-ui/GamePanel";
import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { command, useGameCore } from "@/game/core/store";
import { useSecretQuest } from "@/game/secret/store";
import { useGame } from "@/state/game-store";
import type { SecretClue } from "@/game/secret/types";
import { Check, CircleAlert, Lightbulb } from "lucide-react";
import "./secret-discovery.css";

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
    <div className="secret-sequence">
      <p className="secret-sequence-label">
        Ketuk urutan · {order.length}/{items.length}
      </p>
      <div className="secret-sequence-options">
        {items.map((item) => {
          const rank = order.indexOf(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={rank >= 0}
              aria-label={rank >= 0 ? `${item}, urutan ${rank + 1}` : item}
              onClick={() => onToggle(item)}
              className="secret-answer secret-sequence-option"
            >
              <span className="secret-answer-marker" aria-hidden>
                {rank >= 0 ? rank + 1 : "·"}
              </span>
              <span>{item}</span>
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
  const Icon = tone === "ok" ? Check : tone === "bad" ? Lightbulb : CircleAlert;
  return (
    <div role="status" className={`secret-status secret-status--${tone}`}>
      <Icon aria-hidden />
      <div>
        <p className="secret-status-title">{title}</p>
        {detail ? <p className="secret-status-detail">{detail}</p> : null}
      </div>
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
      className={`secret-discovery-modal${shake ? " secret-discovery-feedback" : ""}`}
      bodyClassName="secret-discovery-body"
      footer={
        solved ? (
          <ActionButton onClick={continueAfterSolve} className="secret-primary-button w-full">
            Lanjut jelajah
          </ActionButton>
        ) : (
          <div className="secret-discovery-actions">
            <button type="button" className="secret-later-button" onClick={closeDiscovery}>
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
              className="secret-primary-button w-full"
            >
              Jawab
            </ActionButton>
          </div>
        )
      }
    >
      {solved ? (
        <div className="secret-discovery-success">
          <p className="secret-discovery-eyebrow">Arsip terbuka!</p>
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
        </div>
      ) : (
        <>
          {secret.discoveryText && <p className="secret-discovery-intro">{secret.discoveryText}</p>}
          {secret.funFact && (
            <aside className="secret-fact">
              <div className="secret-fact-heading">
                <Lightbulb aria-hidden />
                <span>Fun Fact</span>
              </div>
              <p>{secret.funFact}</p>
            </aside>
          )}

          {secret.interactionType === "OBSERVATION" && (
            <p className="secret-observation">
              Amati lingkungan sekitar — jawabannya tidak tertulis di kartu ini.
            </p>
          )}

          <div className="secret-question">
            <p className="secret-question-title">{secret.question}</p>
            <p className="secret-question-help">
              Salah jawab? Petunjuk terbuka otomatis (hingga 3 tingkat). Bonus XP first-try hilang —
              point tidak dipotong.
            </p>
          </div>

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
            <div className="secret-answer-list" role="group" aria-label="Pilihan jawaban">
              {secret.answers.map((option, i) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={choice === option}
                  onClick={() => {
                    setChoice(option);
                    setLocalError("");
                  }}
                  className="secret-answer"
                >
                  <span className="secret-answer-marker" aria-hidden>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="secret-answer-text">{option}</span>
                  {choice === option && <Check className="secret-answer-check" aria-hidden />}
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
        </>
      )}
    </GameModal>
  );
}
