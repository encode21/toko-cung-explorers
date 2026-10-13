import { useEffect, useState } from "react";
import { GameButton } from "./GamePanel";

/** Fullscreen and orientation lock are optional, and only requested from a click. */
export function FullscreenController() {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => setActive(!!document.fullscreenElement);
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggle = async () => {
    setMessage("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const root = document.querySelector<HTMLElement>(".world-viewport");
      if (!root?.requestFullscreen) {
        setMessage("Layar penuh tidak tersedia di browser ini. Kamu tetap bisa bermain landscape.");
        return;
      }
      await root.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      if (orientation?.lock) {
        try {
          await orientation.lock("landscape");
        } catch {
          /* Manual rotation remains available. */
        }
      }
    } catch {
      setMessage("Layar penuh tidak tersedia. Putar perangkat ke landscape untuk bermain.");
    }
  };
  return (
    <div>
      <GameButton onClick={() => void toggle()}>
        {active ? "Keluar layar penuh" : "Layar penuh"}
      </GameButton>
      {message && (
        <p role="status" className="mt-1 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
