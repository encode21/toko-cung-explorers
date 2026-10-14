import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { GameIconButton, useGamePanelLock } from "@/ui/game-ui/GamePanel";
import { ProfilePanel } from "./ProfilePanel";

/** Full game page; only the profile editor opens a dialog above it. */
export function ProfilePage({ onClose }: { onClose: () => void }) {
  useGamePanelLock();
  const pageRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const container =
    typeof document === "undefined"
      ? null
      : (document.querySelector<HTMLElement>("[data-game-ui-root]") ??
        document.querySelector<HTMLElement>(".world-viewport"));

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const previousFocus = document.activeElement;
    // Keep covered HUD controls out of keyboard navigation while this page is open.
    const siblings = Array.from(page.parentElement?.children ?? [])
      .filter(
        (element): element is HTMLElement => element instanceof HTMLElement && element !== page,
      )
      .map((element) => ({ element, inert: element.inert }));
    siblings.forEach(({ element }) => {
      element.inert = true;
    });
    page.querySelector<HTMLElement>("[data-game-close]")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector(".game-modal")) return;
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      requestAnimationFrame(() => {
        if (document.querySelector("[data-game-panel]")) return;
        const target =
          previousFocus instanceof HTMLElement && previousFocus.isConnected
            ? previousFocus
            : document.querySelector<HTMLElement>('[aria-label="Buka profil dan progression"]');
        target?.focus();
      });
    };
  }, []);

  if (!container) return null;
  return createPortal(
    <main
      ref={pageRef}
      className="game-panel player-profile-page"
      aria-label="Profil"
      data-ui-panel
      data-hud-control
      data-game-panel
    >
      <header className="game-panel-header">
        <h2>Profil</h2>
        <GameIconButton label="Tutup Profil" data-game-close onClick={onClose}>
          <X aria-hidden />
        </GameIconButton>
      </header>
      <div className="game-scroll player-profile-body">
        <ProfilePanel />
      </div>
    </main>,
    container,
  );
}
