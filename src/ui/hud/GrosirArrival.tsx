import { useEffect, useRef } from "react";
import { skipStoreIntro } from "@/game/player/store-entry-camera";
import { skipShowroomIntro } from "@/game/showroom/entry-camera";
import { SHOWROOM_NAME } from "@/game/showroom/layout";
import { useGameUi } from "@/state/game-ui-store";
import "./grosir-arrival.css";

export function GrosirArrival() {
  const showroom = useGameUi((s) => s.showroomIntro);
  const active = useGameUi((s) => s.storeIntro || s.showroomIntro);
  const skipIntro = showroom ? skipShowroomIntro : skipStoreIntro;
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement;
    skip.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      skipIntro();
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
  }, [active, skipIntro]);

  if (!active) return null;
  return (
    <div
      className="grosir-arrival"
      data-grosir-arrival={showroom ? undefined : ""}
      data-showroom-arrival={showroom ? "" : undefined}
    >
      <div className="grosir-arrival-title" role="status">
        <h2>{showroom ? SHOWROOM_NAME : "Grosir Toko Cung"}</h2>
        <p>{showroom ? "Galeri kendaraan" : "Belanja stok untuk warungmu"}</p>
      </div>
      <button
        ref={skip}
        className="grosir-arrival-skip"
        type="button"
        data-hud-control
        onClick={skipIntro}
      >
        Lewati
      </button>
    </div>
  );
}
