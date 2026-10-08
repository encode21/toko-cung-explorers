import type { ReactNode } from "react";
import { useGame } from "@/state/game-store";

/** Kerangka panel overlay in-game: gelap, ringkas, tidak menutupi seluruh dunia. */
export function OverlayShell({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const close = useGame((s) => s.closeOverlay);
  return (
    <div
      data-ui-panel
      className="pointer-events-auto absolute inset-0 flex items-end justify-center p-4 sm:items-center"
    >
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[calc(var(--world-height,100dvh)-2rem)] overflow-y-auto rounded-2xl hud-glass p-5`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl leading-none tracking-wide">
              {title.toUpperCase()}
            </h2>
            {subtitle && <p className="mt-1 text-world-muted text-sm">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            className="min-h-11 shrink-0 rounded-xl border border-world-outline px-3 py-1 text-world-muted text-xs uppercase tracking-widest transition hover:text-world-panel-foreground"
          >
            Esc
          </button>
        </div>
        {children}
        {footer && <div className="mt-4 border-world-outline border-t pt-4">{footer}</div>}
      </div>
    </div>
  );
}
