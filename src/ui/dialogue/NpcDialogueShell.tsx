import * as Dialog from "@radix-ui/react-dialog";
import { Component, lazy, Suspense, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { AvatarConfig } from "@/identity/avatar";
import { useGamePanelLock } from "@/ui/game-ui/GamePanel";
import { AvatarPortrait } from "@/ui/profile/AvatarPortrait";
import "./npc-dialogue.css";

const NpcDialoguePortrait = lazy(() => import("./NpcDialoguePortrait"));

class PortraitBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function NpcDialogueShell({
  name,
  role,
  avatar,
  character,
  playerAvatar = false,
  side = "left",
  onClose,
  busy = false,
  children,
  footer,
}: {
  name: string;
  role?: string | undefined;
  avatar: AvatarConfig;
  character?: string | null | undefined;
  playerAvatar?: boolean;
  side?: "left" | "right";
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  useGamePanelLock();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const container =
    typeof document === "undefined"
      ? undefined
      : (document.querySelector<HTMLElement>("[data-game-ui-root]") ??
        document.querySelector<HTMLElement>(".world-viewport") ??
        undefined);
  const fallback = (
    <div className="npc-dialogue-portrait-fallback">
      <AvatarPortrait avatar={avatar} character={character ?? null} />
    </div>
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal {...(container ? { container } : {})}>
        <Dialog.Overlay className="npc-dialogue-backdrop" />
        <Dialog.Content
          className="npc-dialogue-layout"
          data-dialogue-side={side}
          data-ui-panel
          data-hud-control
          data-game-panel
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            closeRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            event.stopPropagation();
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="npc-dialogue-portrait" role="img" aria-label={`Potret ${name}`}>
            <PortraitBoundary fallback={fallback}>
              <Suspense fallback={fallback}>
                <NpcDialoguePortrait
                  avatar={avatar}
                  character={character}
                  playerAvatar={playerAvatar}
                />
              </Suspense>
            </PortraitBoundary>
          </div>
          <section className="npc-dialogue-card">
            <header className="npc-dialogue-heading">
              <div className="npc-dialogue-identity">
                <Dialog.Title className="npc-dialogue-name">{name}</Dialog.Title>
                {role && <span className="npc-dialogue-role">{role}</span>}
              </div>
              <Dialog.Close asChild>
                <button
                  ref={closeRef}
                  type="button"
                  className="npc-dialogue-close"
                  data-game-close
                  aria-label={`Tutup percakapan ${name}`}
                  disabled={busy}
                >
                  <X aria-hidden />
                </button>
              </Dialog.Close>
            </header>
            <div className="npc-dialogue-content">{children}</div>
            <footer className="npc-dialogue-footer">{footer}</footer>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
