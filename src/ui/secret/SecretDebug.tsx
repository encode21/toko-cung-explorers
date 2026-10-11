import { command, useGameCore } from "@/game/core/store";
import { useSecretQuest } from "@/game/secret/store";
import { useGame } from "@/state/game-store";

/** Development only — never mounted in production builds. */
export function SecretDebug() {
  const snapshot = useGameCore((s) => s.snapshot);
  const reveal = useSecretQuest((s) => s.revealMarkers);
  const setReveal = useSecretQuest((s) => s.setRevealMarkers);
  const resetLocal = useSecretQuest((s) => s.resetLocal);
  const openDiscovery = useSecretQuest((s) => s.openDiscovery);
  if (!import.meta.env.DEV) return null;

  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  const index =
    quest?.objectives.findIndex((o, i) => (run?.progress[i] ?? 0) < o.required) ?? -1;
  const objective = index >= 0 ? quest?.objectives[index] : null;

  return (
    <details
      data-ui-panel
      className="pointer-events-auto absolute bottom-2 left-2 z-40 max-w-[min(20rem,45vw)] rounded bg-black/80 p-2 text-[10px] text-white"
    >
      <summary>Secret DEV</summary>
      <div className="mt-1 flex flex-col gap-1">
        <button
          type="button"
          className="min-h-10 rounded bg-white/10 px-2 text-left"
          onClick={() => setReveal(!reveal)}
        >
          {reveal ? "Hide" : "Reveal"} Secret Markers
        </button>
        <button
          type="button"
          className="min-h-10 rounded bg-white/10 px-2 text-left"
          disabled={!objective?.secret || index < 0}
          onClick={() => index >= 0 && openDiscovery(index)}
        >
          Force Clue Card
        </button>
        <button
          type="button"
          className="min-h-10 rounded bg-white/10 px-2 text-left"
          disabled={!objective?.secret || index < 0 || !objective.secret.answers[0]}
          onClick={() => {
            if (!objective?.secret || index < 0) return;
            const answer =
              objective.secret.interactionType === "SEQUENCE"
                ? objective.secret.answers
                : objective.secret.answers[0];
            // DEV helper only — still validated server-side; uses first listed option / full sequence.
            void command("objective", { objective: index, answer: answer! }).then((r) => {
              if (r.ok && r.snapshot.secretFeedback?.ok) {
                useGame.getState().setToast("DEV: submitted answer");
              }
            });
          }}
        >
          Submit Listed Answer
        </button>
        <button
          type="button"
          className="min-h-10 rounded bg-white/10 px-2 text-left"
          disabled={!objective}
          onClick={() => {
            if (!objective) return;
            const [x, , z] = objective.position;
            useGame.getState().requestTeleport([x, 0.83, z]);
            useGame.getState().setToast(`Teleport → ${x.toFixed(1)}, ${z.toFixed(1)}`);
          }}
        >
          Teleport To Current Clue
        </button>
        <p className="text-white/50">
          Clue pos:{" "}
          {objective
            ? `${objective.position[0]}, ${objective.position[1]}, ${objective.position[2]}`
            : "—"}
        </p>
        <button
          type="button"
          className="min-h-10 rounded bg-white/10 px-2 text-left"
          onClick={() => {
            resetLocal();
            void command("read");
          }}
        >
          Inspect / Refresh State
        </button>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(
            {
              quest: quest?.id,
              index,
              progress: run?.progress,
              metrics: snapshot?.profile.secretMetrics,
              feedback: snapshot?.secretFeedback,
            },
            null,
            2,
          )}
        </pre>
        <p className="text-white/60">
          Reset Archive: clear area_unlocks secret:* via DB/artisan (server-owned).
        </p>
      </div>
    </details>
  );
}
