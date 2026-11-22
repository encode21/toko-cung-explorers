import type { ReactNode } from "react";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { LandscapeOrientationGuard } from "./LandscapeOrientationGuard";

/** Entry/lobby viewport uses the same orientation and keyboard policy as live gameplay. */
export function GameViewport({
  children,
  allowPortrait = false,
}: {
  children: ReactNode;
  allowPortrait?: boolean;
}) {
  const ref = useWorldViewport();
  return (
    <main ref={ref} className="world-viewport" data-game-viewport>
      <LandscapeOrientationGuard allowPortrait={allowPortrait}>
        {children}
      </LandscapeOrientationGuard>
    </main>
  );
}
