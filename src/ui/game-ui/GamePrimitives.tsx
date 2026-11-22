import type { ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { GameModal, type PanelProps } from "./GamePanel";

/** Game-style single choice: a row of chips (radiogroup), used instead of native selects. */
export function GameChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`game-choice ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          className="game-choice-chip"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
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
