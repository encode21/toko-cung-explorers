import { useEffect, useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { useTouchControls } from "@/hooks/use-touch";
import { useGameUi } from "@/state/game-ui-store";
import { resetTouchDrive } from "@/game/player/touch-drive";
import { useGameSettings } from "@/state/game-settings";
import { FullscreenController } from "./FullscreenController";

export function LandscapeOrientationGuard({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const touch = useTouchControls();
  const [portrait, setPortrait] = useState(false);
  const uiSize = useGameSettings((s) => s.uiSize);
  useEffect(() => {
    // Layout viewport does not rotate when a landscape software keyboard opens.
    const check = () => setPortrait(window.matchMedia("(orientation: portrait)").matches);
    check();
    window.addEventListener("resize", check);
    screen.orientation?.addEventListener("change", check);
    return () => {
      window.removeEventListener("resize", check);
      screen.orientation?.removeEventListener("change", check);
    };
  }, []);
  const blocked = touch && portrait && !disabled;
  useEffect(() => {
    useGameUi.setState({ portrait: blocked });
    resetTouchDrive();
    return () => {
      useGameUi.setState({ portrait: false });
      resetTouchDrive();
    };
  }, [blocked]);
  return (
    <>
      <div
        data-game-ui-root
        data-game-ui-size={uiSize}
        className={disabled ? "game-runtime-root" : "game-runtime-root game-ui"}
        inert={blocked}
        aria-hidden={blocked || undefined}
      >
        {children}
      </div>
      {blocked && (
        <section
          className="game-orientation game-ui"
          role="dialog"
          aria-modal="true"
          aria-label="Putar perangkat"
        >
          <div className="game-orientation-card">
            <p className="game-orientation-eyebrow">Landscape saja</p>
            <span className="game-orientation-icon" aria-hidden>
              <Smartphone className="game-rotate-phone" />
            </span>
            <h1>Putar HP untuk bermain Toko Cung World</h1>
            <p>
              Game dioptimalkan untuk layar landscape. Sesi tetap tersambung saat kamu memutar
              perangkat.
            </p>
            <FullscreenController />
          </div>
        </section>
      )}
    </>
  );
}
