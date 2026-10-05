import { useEffect } from "react";
import { useMusic } from "@/game/audio/music-store";

/**
 * Unlock + jalankan ambient music setelah gesture pertama di /world
 * (kebijakan autoplay browser).
 */
export function AmbientMusic() {
  const ensureStarted = useMusic((s) => s.ensureStarted);
  const shutdown = useMusic((s) => s.shutdown);

  useEffect(() => {
    const unlock = () => {
      void ensureStarted();
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      shutdown();
    };
  }, [ensureStarted, shutdown]);

  return null;
}
