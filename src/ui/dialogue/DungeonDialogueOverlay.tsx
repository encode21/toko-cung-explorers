import { dungeonCommand, useDungeon } from "@/game/dungeon/store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { ActionButton } from "@/ui/adventure/ActionButton";

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
  const last = lineIndex >= script.lines.length - 1;
  const discover = script.kind === "discover";
  const speakerName =
    line.speaker === "npc"
      ? script.name
      : line.speaker === "player"
        ? "Kamu"
        : "Catatan";

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

  return (
    <div
      data-ui-panel
      data-hud-control
      className="pointer-events-auto absolute inset-0 z-[55] flex items-end justify-center bg-black/35 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-labelledby="dungeon-dialogue-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-amber-200/30 hud-glass p-4 shadow-2xl">
        <header className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">
              {discover ? "Temuan misi" : "Percakapan"}
            </p>
            <h2 id="dungeon-dialogue-title" className="mt-1 font-display text-3xl tracking-wide">
              {script.name.toUpperCase()}
            </h2>
            <p className="text-xs text-world-muted">{script.role}</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-world-outline px-3 text-xs uppercase tracking-widest text-world-muted"
            onClick={close}
            disabled={submitting}
          >
            Tutup
          </button>
        </header>

        <div className="min-h-[7.5rem] space-y-2">
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
      </div>
    </div>
  );
}
