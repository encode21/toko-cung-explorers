import type { ReactNode, SelectHTMLAttributes } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { GameModal, type PanelProps } from "./GamePanel";

/** Native selection retains platform keyboard and touch accessibility. */
export function GameDropdown({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`game-button bg-slate-900 ${className}`} />;
}
export function GameInventoryGrid({ children }: { children: ReactNode }) {
  return <div className="game-inventory-grid">{children}</div>;
}
export function GameToast({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="game-toast">
      {children}
    </div>
  );
}
export function GameDialog(props: PanelProps) {
  return <GameModal {...props} />;
}
export function GameTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal
          container={
            typeof document === "undefined"
              ? undefined
              : (document.querySelector<HTMLElement>("[data-game-ui-root]") ?? undefined)
          }
        >
          <Tooltip.Content sideOffset={4} collisionPadding={12} className="game-tooltip">
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
