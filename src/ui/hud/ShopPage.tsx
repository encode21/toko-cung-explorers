import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useGamePanelLock } from "@/ui/game-ui/GamePanel";
import { ShopPanel } from "./ShopPanel";
import "./shop-panel.css";

/** Full game page for Shop / Toko — not a modal. */
export function ShopPage({ onClose }: { onClose: () => void }) {
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
            : (document.querySelector<HTMLElement>('[data-side-action="shop"]') ??
              document.querySelector<HTMLElement>('[data-phone-app="shop"]') ??
              document.querySelector<HTMLElement>('[data-side-action="phone"]'));
        target?.focus();
      });
    };
  }, []);

  if (!container) return null;
  return createPortal(
    <main
      ref={pageRef}
      className="game-panel game-shop-page"
      aria-label="Shop"
      data-ui-panel
      data-hud-control
      data-game-panel
    >
      <div className="game-scroll game-shop-page-body">
        <ShopPanel onClose={onClose} />
      </div>
    </main>,
    container,
  );
}
