import { GameModal } from "@/ui/game-ui/GamePanel";
import { dungeonCommand, useDungeon } from "@/game/dungeon/store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { LoaderCircle, Star } from "lucide-react";
import { NpcDialogueShell } from "./NpcDialogueShell";
import { dungeonNpcAppearance } from "./npc-appearance";

/** Scripted dungeon talk / discovery — click-to-advance like classic MMORPG beats. */
export function DungeonDialogueOverlay() {
  const script = useDungeonDialogue((s) => s.script);
  const lineIndex = useDungeonDialogue((s) => s.lineIndex);
  const submitting = useDungeonDialogue((s) => s.submitting);
  const error = useDungeonDialogue((s) => s.error);
  const advance = useDungeonDialogue((s) => s.advance);
  const close = useDungeonDialogue((s) => s.close);
  const setSubmitting = useDungeonDialogue((s) => s.setSubmitting);
  const setError = useDungeonDialogue((s) => s.setError);

  if (!script) return null;

  const line = script.lines[lineIndex];
  if (!line) return null;
  const last = lineIndex >= script.lines.length - 1;
  const discover = script.kind === "discover";
  const speakerName =
    line.speaker === "npc" ? script.name : line.speaker === "player" ? "Kamu" : "Catatan";

  const finish = async () => {
    if (!last) {
      advance();
      return;
    }
    if (!script.completeTarget) {
      close();
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    await dungeonCommand("pose");
    useDungeon.setState({ error: "" });
    await dungeonCommand("interact", script.completeTarget);
    const err = useDungeon.getState().error;
    if (err) {
      setError(err);
      return;
    }
    close();
  };

  if (!discover) {
    return (
      <NpcDialogueShell
        name={script.name}
        role={script.role}
        avatar={dungeonNpcAppearance(script.name)}
        onClose={close}
        busy={submitting}
        footer={
          <div className="npc-dialogue-actions">
            <span className="npc-dialogue-progress">
              {lineIndex + 1} / {script.lines.length}
            </span>
            <button
              type="button"
              className="npc-dialogue-next"
              disabled={submitting}
              onClick={() => void finish()}
            >
              {submitting
                ? "Menyimpan…"
                : last
                  ? script.completeTarget
                    ? (script.completeLabel ?? "Selesai bicara")
                    : "Tutup"
                  : "Lanjut"}
              {submitting ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Star aria-hidden />
              )}
            </button>
          </div>
        }
      >
        <div className="npc-dialogue-log" aria-live="polite">
          {line.speaker !== "npc" && <p className="npc-dialogue-speaker">{speakerName}</p>}
          <p className="npc-dialogue-line">{line.text}</p>
          {error && (
            <p role="alert" className="npc-dialogue-error">
              {error}
            </p>
          )}
        </div>
      </NpcDialogueShell>
    );
  }

  return (
    <GameModal
      title={script.name}
      subtitle={script.role}
      onClose={() => {
        if (!submitting) close();
      }}
    >
      <div className="space-y-2">
        <p
          className={`text-[11px] font-semibold uppercase tracking-widest ${
            line.speaker === "player"
              ? "text-world-accent"
              : line.speaker === "narrator"
                ? "text-amber-100/80"
                : "text-amber-200"
          }`}
        >
          {speakerName}
        </p>
        <p className="text-sm leading-relaxed text-[#fff8ef]">{line.text}</p>
        <p className="text-[11px] text-world-muted">
          {lineIndex + 1} / {script.lines.length}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {!last && (
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-white/10 text-sm"
            onClick={close}
            disabled={submitting}
          >
            Nanti
          </button>
        )}
        <ActionButton
          busy={submitting}
          busyLabel="Menyimpan…"
          onClick={() => void finish()}
          className="min-h-11 flex-[1.6] rounded-xl bg-amber-200 px-3 text-sm font-semibold text-slate-900"
        >
          {last
            ? script.completeTarget
              ? (script.completeLabel ?? (discover ? "Selesai" : "Selesai bicara"))
              : "Tutup"
            : "Lanjut"}
        </ActionButton>
      </div>
    </GameModal>
  );
}
