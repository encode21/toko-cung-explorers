import { useEffect } from "react";
import { useMusic } from "./music-store";
import { getAudioContext } from "./audio-context";
import { startWorldFeedback } from "./world-feedback";
import { startCityAmbience } from "./city-ambience";
import { setAmbientDucked } from "./ambient-music";
import { setWorldAudioQuiet } from "./audio-manager";
import { preloadTransportSounds, stopTransportSounds } from "./transport-sounds";
import { useTravelScene } from "@/ui/hud/travel-loader";
import { useClub } from "@/game/club/store";
import { useClubYoutubeUi } from "@/game/club/youtube-host";

/** Shared gesture unlock, route cleanup and mobile/background suspension. */
export function AmbientMusic() {
  useEffect(() => {
    const syncVenueMute = () => {
      const club = useClub.getState();
      const travel = useTravelScene.getState();
      const showroom = (travel.mounted ?? travel.target)?.art === "showroom";
      setWorldAudioQuiet(showroom);
      if (showroom) stopTransportSounds();
      setAmbientDucked(
        showroom || (club.inside && !club.outdoor && useClubYoutubeUi.getState().muted),
      );
    };
    syncVenueMute();
    const unsubscribeClub = useClub.subscribe((state, previous) => {
      if (state.inside !== previous.inside || state.outdoor !== previous.outdoor) syncVenueMute();
    });
    const unsubscribeMute = useClubYoutubeUi.subscribe((state, previous) => {
      if (state.muted !== previous.muted) syncVenueMute();
    });
    const unsubscribeScene = useTravelScene.subscribe((state, previous) => {
      if (state.mounted !== previous.mounted || state.target !== previous.target) syncVenueMute();
    });
    return () => {
      unsubscribeScene();
      unsubscribeClub();
      unsubscribeMute();
      setWorldAudioQuiet(false);
      setAmbientDucked(false);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlocked = false;
    let pending = false;
    const stopFeedback = startWorldFeedback();
    const stopAmbience = startCityAmbience();
    const unlock = async () => {
      if (pending || disposed || document.hidden) return;
      pending = true;
      try {
        await useMusic.getState().ensureStarted();
      } finally {
        pending = false;
      }
      const ctx = getAudioContext();
      unlocked = ctx?.state === "running";
      if (disposed || document.hidden) {
        useMusic.getState().shutdown();
        void getAudioContext()
          ?.suspend()
          .catch(() => undefined);
      } else if (ctx) {
        void preloadTransportSounds(ctx);
      }
    };
    const gesture = (event: Event) => {
      if (!event.isTrusted) return;
      // resume() must run inside the gesture itself; iOS unlocks audio on touchend/click, not pointerdown.
      const ctx = getAudioContext();
      if (ctx && ctx.state !== "running" && ctx.state !== "closed" && !document.hidden)
        void ctx.resume().catch(() => undefined);
      void unlock();
    };
    const gestures = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    const visibility = () => {
      if (document.hidden) {
        stopTransportSounds();
        useMusic.getState().shutdown();
        void getAudioContext()
          ?.suspend()
          .catch(() => undefined);
      } else if (unlocked) void unlock();
    };
    for (const name of gestures) window.addEventListener(name, gesture, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      stopFeedback();
      stopAmbience();
      stopTransportSounds();
      for (const name of gestures) window.removeEventListener(name, gesture);
      document.removeEventListener("visibilitychange", visibility);
      useMusic.getState().shutdown();
      void getAudioContext()
        ?.suspend()
        .catch(() => undefined);
    };
  }, []);
  return null;
}
