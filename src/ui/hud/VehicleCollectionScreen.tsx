import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { GameIconButton, useGamePanelLock } from "@/ui/game-ui/GamePanel";
import "./vehicle-collection-screen.css";

export function VehicleCollectionScreen({
  title,
  className,
  children,
  onClose,
  closeDisabled = false,
}: {
  title: string;
  className: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  useGamePanelLock();
  const close = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const container =
    typeof document === "undefined"
      ? undefined
      : (document.querySelector<HTMLElement>(".world-viewport") ??
        document.querySelector<HTMLElement>("[data-game-ui-root]") ??
        undefined);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !closeDisabled && onClose()}>
      <Dialog.Portal {...(container ? { container } : {})}>
        <Dialog.Content
          className={`game-panel game-light vehicle-collection-screen ${className}`}
          aria-describedby={undefined}
          data-game-panel
          data-ui-panel
          data-hud-control
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const focused = document.activeElement;
            opener.current = focused instanceof HTMLElement ? focused : null;
            close.current?.querySelector("button")?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              const next = document.querySelector<HTMLElement>(
                "[data-game-panel] [data-game-close]",
              );
              const previous = opener.current?.isConnected ? opener.current : null;
              const phone = document.querySelector<HTMLElement>('[data-side-action="phone"]');
              (next ?? (previous !== document.body ? previous : null) ?? phone)?.focus();
            });
          }}
          onEscapeKeyDown={(event) => {
            event.stopPropagation();
            if (closeDisabled) event.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="vehicle-collection-close" ref={close}>
            <Dialog.Close asChild>
              <GameIconButton label={`Tutup ${title}`} disabled={closeDisabled} data-game-close>
                <X aria-hidden />
              </GameIconButton>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
