import type { ReactNode } from "react";
import { useGame } from "@/state/game-store";
import { GameModal } from "@/ui/game-ui/GamePanel";

/** Shared shell for NPC dialogue and the existing in-game product/checkout flows. */
export function OverlayShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const close = useGame((s) => s.closeOverlay);
  return (
    <GameModal title={title} subtitle={subtitle} onClose={close} wide={wide} footer={footer}>
      {children}
    </GameModal>
  );
}
