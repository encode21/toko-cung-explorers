import { useEffect } from "react";
import { useMusic } from "./music-store";
import { getAudioContext } from "./audio-context";
import { startWorldFeedback } from "./world-feedback";
import { setAmbientDucked } from "./ambient-music";
import { useClub } from "@/game/club/store";
import { useClubYoutubeUi } from "@/game/club/youtube-host";

/** Shared gesture unlock, route cleanup and mobile/background suspension. */
export function AmbientMusic() {
  useEffect(() => {
    const syncVenueMute = () => {
      const club = useClub.getState();
      setAmbientDucked(club.inside && !club.outdoor && useClubYoutubeUi.getState().muted);
    };
    syncVenueMute();
    const unsubscribeClub = useClub.subscribe((state, previous) => {
      if (state.inside !== previous.inside || state.outdoor !== previous.outdoor) syncVenueMute();
    });
    const unsubscribeMute = useClubYoutubeUi.subscribe((state, previous) => {
      if (state.muted !== previous.muted) syncVenueMute();
    });
    return () => {
      unsubscribeClub();
      unsubscribeMute();
      setAmbientDucked(false);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlocked = false;
    let pending = false;
    const stopFeedback = startWorldFeedback();
    const unlock = async () => {
      if (pending || disposed || document.hidden) return;
      pending = true;
      await useMusic.getState().ensureStarted();
      pending = false;
      unlocked = getAudioContext()?.state === "running";
      if (disposed || document.hidden) {
        useMusic.getState().shutdown();
        void getAudioContext()
          ?.suspend()
          .catch(() => undefined);
      }
    };
    const gesture = (event: Event) => {
      if (event.isTrusted) void unlock();
    };
    const visibility = () => {
      if (document.hidden) {
        useMusic.getState().shutdown();
        void getAudioContext()
          ?.suspend()
          .catch(() => undefined);
      } else if (unlocked) void unlock();
    };
    window.addEventListener("pointerdown", gesture, { passive: true });
    window.addEventListener("keydown", gesture);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      stopFeedback();
      window.removeEventListener("pointerdown", gesture);
      window.removeEventListener("keydown", gesture);
      document.removeEventListener("visibilitychange", visibility);
      useMusic.getState().shutdown();
      void getAudioContext()
        ?.suspend()
        .catch(() => undefined);
    };
  }, []);
  return null;
}
