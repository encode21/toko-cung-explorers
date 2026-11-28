import { useCallback, useEffect, useRef, useState } from "react";
import "./studio-splash.css";

const STUDIO_LOGO_VIDEO = "/assets/logo/logo-studio.mp4";
const STUDIO_LOGO_IMAGE = "/assets/logo/logo-studio.png";
const FADE_OUT_MS = 320;
const FALLBACK_IMAGE_MS = 1500;
const WATCHDOG_MS = 7000;

/** Full-screen white studio splash shown once when opening the game. */
export function StudioSplash({ onFinish }: { onFinish: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [fallback, setFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFinishRef = useRef(onFinish);
  const leavingRef = useRef(false);
  const finishedRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finishNow = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, []);

  const startLeave = useCallback(() => {
    if (leavingRef.current || finishedRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      finishNow();
      return;
    }
    fadeTimerRef.current = window.setTimeout(finishNow, FADE_OUT_MS);
  }, [finishNow]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => startLeave(), WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [startLeave]);

  useEffect(() => {
    if (!fallback) return;
    const timer = window.setTimeout(() => startLeave(), FALLBACK_IMAGE_MS);
    return () => window.clearTimeout(timer);
  }, [fallback, startLeave]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFallback(true);
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    let alive = true;

    const startPlayback = async () => {
      // Try unmuted first where browser/WebView permits audio; fall back to muted autoplay.
      el.muted = false;
      try {
        await el.play();
      } catch {
        if (!alive) return;
        el.muted = true;
        el.defaultMuted = true;
        try {
          await el.play();
        } catch {
          if (alive) setFallback(true);
        }
      }
    };

    // Effect owns the media source so React StrictMode cleanup/remount restores cleanly.
    el.src = STUDIO_LOGO_VIDEO;
    el.load();
    void startPlayback();

    const onVisibility = () => {
      if (!alive || document.hidden || leavingRef.current) return;
      if (el.paused && !el.ended) void el.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startLeave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startLeave]);

  return (
    <div
      className="studio-splash"
      data-leaving={leaving}
      role="dialog"
      aria-modal="true"
      aria-label="Logo Sembako Mampang Studio"
      onClick={startLeave}
    >
      {fallback ? (
        <img
          className="studio-splash-media"
          src={STUDIO_LOGO_IMAGE}
          alt="Sembako Mampang Studio"
          width={1920}
          height={1080}
        />
      ) : (
        <video
          ref={videoRef}
          className="studio-splash-media"
          playsInline
          muted
          preload="auto"
          aria-label="Animasi logo Sembako Mampang Studio"
          onEnded={startLeave}
          onError={() => setFallback(true)}
        />
      )}
    </div>
  );
}
