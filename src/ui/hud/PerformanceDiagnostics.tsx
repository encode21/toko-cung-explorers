import { useGameSettings } from "@/state/game-settings";
import { useRenderBudget } from "@/game/engine/AdaptiveQuality";
export function PerformanceDiagnostics() {
  const show = useGameSettings((s) => s.diagnostics);
  const { tier, fps, calls, triangles, breakdown } = useRenderBudget();
  if (!show) return null;
  return (
    <output className="game-performance">
      {fps || "…"} FPS · {tier} · {calls} draw calls · {Math.round(triangles / 1000)}k tris
      {breakdown.length > 0 && (
        <>
          <br />
          {breakdown.map((g) => `${g.name} ${g.calls}`).join(" · ")}
        </>
      )}
    </output>
  );
}
