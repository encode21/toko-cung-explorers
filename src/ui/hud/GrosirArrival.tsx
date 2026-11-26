import { useEffect, useRef } from "react";
import { skipStoreIntro } from "@/game/player/store-entry-camera";
import { useGameUi } from "@/state/game-ui-store";
import "./grosir-arrival.css";

export function GrosirArrival() {
  const active = useGameUi((s) => s.storeIntro);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement;
    skip.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      skipStoreIntro();
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        document.activeElement === document.body
      )
        previous.focus({ preventScroll: true });
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="grosir-arrival" data-grosir-arrival>
      <div className="grosir-arrival-title" role="status">
        <h2>Grosir Toko Cung</h2>
        <p>Belanja stok untuk warungmu</p>
      </div>
      <button
        ref={skip}
        className="grosir-arrival-skip"
        type="button"
        data-hud-control
        onClick={skipStoreIntro}
      >
        Lewati
      </button>
    </div>
  );
}
