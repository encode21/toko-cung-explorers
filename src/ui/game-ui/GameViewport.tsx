import type { ReactNode } from "react";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { LandscapeOrientationGuard } from "./LandscapeOrientationGuard";

/** Entry/lobby viewport uses the same orientation and keyboard policy as live gameplay. */
export function GameViewport({ children }: { children: ReactNode }) {
  const ref = useWorldViewport();
  return (
    <main ref={ref} className="world-viewport" data-game-viewport>
      <LandscapeOrientationGuard>{children}</LandscapeOrientationGuard>
    </main>
  );
}
