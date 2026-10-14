import { useEffect, useRef } from "react";

/** Event-driven usable viewport; browser chrome/keyboard changes resize the existing canvas. */
export function useWorldViewport() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const viewport = window.visualViewport;
      const set = (key: string, value: number) => {
        const next = `${Math.round(value * 100) / 100}px`;
        if (el.style.getPropertyValue(key) !== next) el.style.setProperty(key, next);
      };
      set("--world-height", viewport?.height ?? window.innerHeight);
      set("--world-width", viewport?.width ?? window.innerWidth);
      set("--world-top", viewport?.offsetTop ?? 0);
      set("--world-left", viewport?.offsetLeft ?? 0);
      el.dataset["keyboard"] = String(
        (viewport?.height ?? window.innerHeight) < window.innerHeight * 0.75,
      );
      el.dataset["compact"] = String((viewport?.height ?? window.innerHeight) < 500);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const visible = () => {
      if (!document.hidden) schedule();
    };
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", visible);
    apply();
    window.addEventListener("resize", schedule);
    screen.orientation?.addEventListener("change", schedule);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", visible);
      screen.orientation?.removeEventListener("change", schedule);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, []);
  return ref;
}
