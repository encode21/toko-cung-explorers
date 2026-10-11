import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { useGameCore, command } from "@/game/core/store";
import { useGame } from "@/state/game-store";
import { useTouchDrive } from "@/game/player/touch-drive";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { GameProgress } from "./GameProgress";

export function QuestTracker() {
  const snapshot = useGameCore((s) => s.snapshot);
  const busy = useGameCore((s) => s.busy);
  const error = useGameCore((s) => s.error);
  const pending = useGameCore((s) => s.pending);
  const pos = useGame((s) => s.playerPos);
  const { mobile, touch } = useMobileHudLayout();
  const moving = useTouchDrive((s) => s.active);
  const [expanded, setExpanded] = useState(true);
  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  const index = quest?.objectives.findIndex((o, i) => (run?.progress[i] ?? 0) < o.required) ?? -1;
  const objective = quest?.objectives[index];
  const near =
    objective &&
    Math.hypot(pos[0] - objective.position[0], pos[2] - objective.position[2]) <=
      objective.radius &&
    Math.abs(pos[1] - 0.83 - objective.position[1]) < 1.8;
  const distance = objective
    ? Math.round(Math.hypot(pos[0] - objective.position[0], pos[2] - objective.position[2]))
    : null;

  // Mobile: collapsed by default; collapse again when movement resumes (no flicker loop).
  useEffect(() => {
    setExpanded(!mobile);
  }, [mobile]);

  useEffect(() => {
    if (!touch || !moving || !expanded) return;
    setExpanded(false);
  }, [touch, moving, expanded]);

  const compact = mobile && !expanded;

  return (
    <section
      data-hud-control
      data-ui-panel
      data-quest-tracker
      aria-label="Quest tracker"
      className={`pointer-events-auto relative z-0 w-full border-l-2 border-amber-200/60 hud-glass ${
        compact ? "rounded-xl px-2 py-1.5 text-[11px]" : "rounded-xl p-3 text-xs"
      }`}
    >
      <GameProgress compact={mobile} />

      {quest && run && (
        <div className={`border-t border-world-outline ${compact ? "mt-1.5 pt-1.5" : "mt-2 pt-2"}`}>
          {compact ? (
            <button
              type="button"
              className="flex w-full items-start gap-2 text-left"
              aria-expanded={false}
              onClick={() => setExpanded(true)}
            >
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-widest text-amber-200">
                  Quest
                </span>
                <strong className="block truncate leading-tight">{quest.title}</strong>
                <span className="mt-0.5 block truncate text-world-muted">
                  {objective
                    ? `${index + 1} / ${quest.objectives.length} · ${objective.label}`
                    : "Semua tujuan selesai"}
                </span>
              </span>
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-world-muted" aria-hidden />
            </button>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="mb-1 text-[9px] uppercase tracking-widest text-amber-200">
                    Quest aktif
                  </p>
                  <strong className="block">{quest.title}</strong>
                </div>
                {mobile && (
                  <button
                    type="button"
                    aria-label="Ciutkan quest"
                    aria-expanded={true}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-world-muted"
                    onClick={() => setExpanded(false)}
                  >
                    <ChevronUp className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-1">
                {objective
                  ? `${index + 1}/${quest.objectives.length} · ${objective.label} (${run.progress[index] ?? 0}/${objective.required})`
                  : "Semua tujuan selesai"}
              </p>
              {objective && distance !== null && (
                <p className="text-world-muted">
                  ±{distance} m · {objective.position[0]}, {objective.position[2]}
                </p>
              )}
              <ActionButton
                busy={busy && (pending === "objective" || pending === "complete")}
                busyLabel={objective ? "Melakukan tujuan…" : "Menyelesaikan…"}
                disabled={busy || (!!objective && !near)}
                onClick={async () => {
                  const result = await command(
                    objective ? "objective" : "complete",
                    objective ? { objective: index } : {},
                  );
                  const next = useGameCore.getState().snapshot?.active;
                  if (
                    result.ok &&
                    objective?.type === "TALK" &&
                    next?.id === run.id &&
                    (next.progress[index] ?? 0) > (run.progress[index] ?? 0)
                  ) {
                    useGame.setState({
                      overlay: "dialogue",
                      activeNpc: objective.target,
                      dialogue: [],
                    });
                  }
                }}
                className="mt-2 min-h-10 w-full rounded-lg bg-world-accent px-2 text-world-accent-foreground disabled:opacity-50"
              >
                {objective
                  ? near
                    ? objective.type === "TALK"
                      ? "Sapa Nakama"
                      : "Lakukan tujuan"
                    : "Dekati lokasi tujuan"
                  : "Selesaikan quest"}
              </ActionButton>
            </>
          )}
        </div>
      )}

      {!run && (
        <button
          type="button"
          className={`underline ${compact ? "mt-1 min-h-8 text-[11px]" : "mt-1 min-h-9"}`}
          onClick={() => useGame.getState().openKiosk()}
        >
          Lihat Quest Board
        </button>
      )}
      {error && (
        <p role="status" className="mt-1 line-clamp-3 text-world-muted">
          {error}
        </p>
      )}
    </section>
  );
}
