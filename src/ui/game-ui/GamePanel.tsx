import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";
import { useGameUi } from "@/state/game-ui-store";
import { resetTouchDrive } from "@/game/player/touch-drive";

export function useGamePanelLock() {
  useEffect(() => {
    resetTouchDrive();
    useGameUi.setState((s) => ({ panels: s.panels + 1 }));
    return () => {
      resetTouchDrive();
      useGameUi.setState((s) => ({ panels: Math.max(0, s.panels - 1) }));
    };
  }, []);
}
export function GameButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`game-button ${className}`} />;
}
export function GameIconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <GameButton
      {...props}
      aria-label={label}
      title={label}
      className={`game-icon-button ${props.className ?? ""}`}
    >
      {children}
    </GameButton>
  );
}
export function GameScrollArea({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`game-scroll ${className}`}>{children}</div>;
}
export type PanelProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  subtitle?: string | undefined;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
  bodyClassName?: string;
  onCloseAutoFocus?: (event: Event) => void;
};
/** Shared modal: persistent header/footer, bounded body, focus trap and Escape dismissal. */
export function GameModal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide = false,
  className = "",
  bodyClassName = "",
  onCloseAutoFocus,
}: PanelProps) {
  useGamePanelLock();
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const container =
    typeof document === "undefined"
      ? undefined
      : (document.querySelector<HTMLElement>("[data-game-ui-root]") ??
        document.querySelector<HTMLElement>(".world-viewport") ??
        undefined);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal {...(container ? { container } : {})}>
        <Dialog.Overlay className="game-modal-backdrop" />
        <Dialog.Content
          aria-modal="true"
          ref={contentRef}
          data-ui-panel
          data-hud-control
          data-game-panel
          className={`game-panel game-modal ${wide ? "game-panel-wide" : ""} ${className}`}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (!event.defaultPrevented && returnFocusRef.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => event.stopPropagation()}
          onOpenAutoFocus={(event) => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            // Do not summon the mobile keyboard merely by opening a panel.
            event.preventDefault();
            contentRef.current?.querySelector<HTMLElement>("[data-game-close]")?.focus();
          }}
        >
          <header className="game-panel-header">
            <div className="min-w-0">
              <Dialog.Title>{title}</Dialog.Title>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <Dialog.Close asChild>
              <GameIconButton label={`Tutup ${title}`} data-game-close>
                <X aria-hidden />
              </GameIconButton>
            </Dialog.Close>
          </header>
          <GameScrollArea className={bodyClassName}>{children}</GameScrollArea>
          {footer && <footer className="game-panel-footer">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
/** Floating sheet uses the same dimensions as modals without obscuring the world. */
export function GamePanel({
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide = false,
  className = "",
  bodyClassName = "",
}: PanelProps) {
  useGamePanelLock();
  const id = useId();
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".game-modal")) onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <section
      role="dialog"
      aria-labelledby={id}
      data-ui-panel
      data-hud-control
      data-world-sheet
      data-game-panel
      className={`game-panel game-sheet ${wide ? "game-panel-wide" : ""} ${className}`}
    >
      <header className="game-panel-header">
        <div className="min-w-0">
          <h2 id={id}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <GameIconButton label={`Tutup ${title}`} data-game-close onClick={onClose}>
          <X aria-hidden />
        </GameIconButton>
      </header>
      <GameScrollArea className={bodyClassName}>{children}</GameScrollArea>
      {footer && <footer className="game-panel-footer">{footer}</footer>}
    </section>
  );
}
export function GameTabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T;
  tabs: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <nav className="game-tabs" aria-label="Bagian panel">
      {tabs.map((tab) => (
        <GameButton key={tab.id} aria-pressed={value === tab.id} onClick={() => onChange(tab.id)}>
          {tab.label}
        </GameButton>
      ))}
    </nav>
  );
}
