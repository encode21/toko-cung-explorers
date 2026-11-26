import { useLayoutEffect, useRef, type ReactNode } from "react";
import { registerActionAnchor } from "@/game/interactions/action-projection";
import { warungCustomerPosition } from "@/game/warung/customer-positions";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import "./warung-customer-anchor.css";

/** A speech card follows the actual customer, never a guessed screen percentage. */
export function WarungCustomerAnchor({
  customerId,
  variant = "speech",
  children,
}: {
  customerId: string;
  variant?: "speech" | "order" | "waiting" | "story";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);
  const sheet = useHud((s) => s.sheet);
  const overlay = useGame((s) => s.overlay);
  const visible = !blocked && !sheet && overlay === "none";
  useLayoutEffect(() => {
    const element = ref.current;
    if (!visible || !element) return;
    return registerActionAnchor(
      element,
      () => warungCustomerPosition(customerId),
      (onScreen) => element.toggleAttribute("data-on-screen", onScreen),
    );
  }, [customerId, visible]);
  if (!visible) return null;
  return (
    <div ref={ref} className="warung-customer-anchor" data-variant={variant}>
      <div
        className="warung-customer-anchor-content"
        data-hud-control
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
