import { useEffect, useRef } from "react";
import { useChannels } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { clubCommand, resetClub, useClub, clubNow } from "./store";
import {
  MockMusicProvider,
  YouTubeMusicProvider,
  YOUTUBE_ENABLED,
  type MusicProvider,
} from "./music-provider";
import { DEFAULT_YOUTUBE_VIDEO_ID } from "./model";
import { onClubYoutubeHost, useClubYoutubeUi } from "./youtube-host";

/** Sync room playback and mount the official YouTube player on the 3D MUSIC_SCREEN. */
export function ClubRuntime() {
  const room = useChannels((s) => s.lease?.channel);
  const inside = useClub((s) => s.inside);
  const connected = useNet((s) => s.connected);
  const providerRef = useRef<MusicProvider | null>(null);

  useEffect(() => {
    resetClub();
    return resetClub;
  }, [room]);

  // Keep the screen player mounted for the whole club visit (ignore brief reconnects).
  useEffect(() => {
    if (!inside) return;
    let cancelled = false;
    const provider: MusicProvider = YOUTUBE_ENABLED
      ? new YouTubeMusicProvider((next) => {
          if (!cancelled)
            useClubYoutubeUi.getState().setStatus(next, provider.lastErrorCode ?? null);
        })
      : new MockMusicProvider();
    providerRef.current = provider;

    useClubYoutubeUi.getState().setResume(() => {
      void provider.resumeFromGesture().then((status) => {
        if (!cancelled)
          useClubYoutubeUi.getState().setStatus(status, provider.lastErrorCode ?? null);
      });
    });

    const unsub = onClubYoutubeHost((host) => {
      if (cancelled || !host || !(provider instanceof YouTubeMusicProvider)) return;
      void provider
        .mountVisiblePlayer(host, DEFAULT_YOUTUBE_VIDEO_ID)
        .then(async () => {
          if (cancelled) return;
          useClubYoutubeUi.getState().setStatus("ready", null);
          const s = useClub.getState().data;
          if (s) {
            const status = await provider.apply(s, clubNow());
            useClubYoutubeUi.getState().setStatus(status, provider.lastErrorCode ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) useClubYoutubeUi.getState().setStatus("failed", null);
        });
    });

    return () => {
      cancelled = true;
      unsub();
      provider.dispose();
      providerRef.current = null;
      useClubYoutubeUi.getState().setResume(null);
      useClubYoutubeUi.getState().setStatus("ready", null);
    };
  }, [inside]);

  useEffect(() => {
    if (!inside || !connected) return;
    let cancelled = false;
    let pending = false;
    let lastRead = 0;
    const refresh = async () => {
      if (pending || cancelled || Date.now() - lastRead < 500) return;
      lastRead = Date.now();
      pending = true;
      await clubCommand("read");
      const provider = providerRef.current;
      const s = useClub.getState().data;
      if (provider && s && !cancelled) {
        const status = await provider.apply(s, clubNow());
        useClubYoutubeUi.getState().setStatus(status, provider.lastErrorCode ?? null);
      }
      pending = false;
    };
    const changed = () => void refresh();
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    window.addEventListener("club-changed", changed);
    window.addEventListener("online", changed);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("club-changed", changed);
      window.removeEventListener("online", changed);
    };
  }, [inside, connected]);

  return null;
}
