import { useEffect, useRef } from "react";

/** Event-driven usable viewport; browser chrome/keyboard changes resize the existing canvas. */
export function useWorldViewport() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let settle = 0;
    const apply = () => {
      frame = 0;
      const viewport = window.visualViewport;
      el.style.setProperty("--world-height", `${viewport?.height ?? window.innerHeight}px`);
      el.style.setProperty("--world-width", `${viewport?.width ?? window.innerWidth}px`);
      el.style.setProperty("--world-top", `${viewport?.offsetTop ?? 0}px`);
      el.style.setProperty("--world-left", `${viewport?.offsetLeft ?? 0}px`);
      el.dataset["keyboard"] = String(
        (viewport?.height ?? window.innerHeight) < window.innerHeight * 0.75,
      );
      el.dataset["compact"] = String((viewport?.height ?? window.innerHeight) < 500);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
      // Re-read once the keyboard / browser-bar animation has finished: Android may skip the final
      // visualViewport resize, leaving the world at a stale height. CSS only; a synthetic window
      // resize here closed the chat keyboard on phones.
      clearTimeout(settle);
      settle = window.setTimeout(apply, 350);
    };
    apply();
    window.addEventListener("resize", schedule);
    screen.orientation?.addEventListener("change", schedule);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      document.body.style.overflow = oldOverflow;
      screen.orientation?.removeEventListener("change", schedule);
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, []);
  return ref;
}
