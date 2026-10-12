import { useEffect, useRef, useState } from "react";
import { useChannels } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { clubCommand, resetClub, useClub, clubNow } from "./store";
import {
  MockMusicProvider,
  YouTubeMusicProvider,
  YOUTUBE_ENABLED,
  type MusicProvider,
  type ProviderStatus,
} from "./music-provider";
import { DEFAULT_YOUTUBE_VIDEO_ID, youtubeIdFor } from "./model";

function errorHint(code: number | null | undefined) {
  if (code === 100) return "Video tidak ditemukan / dihapus.";
  if (code === 101 || code === 150) return "Pemilik video membatasi embed.";
  if (code === 5) return "HTML5 player error — refresh halaman.";
  if (code === 2) return "Parameter player tidak valid — refresh halaman.";
  return "Refresh halaman, lalu Request → Accept → Play lagi.";
}

export function ClubRuntime() {
  const room = useChannels((s) => s.lease?.channel);
  const inside = useClub((s) => s.inside);
  const connected = useNet((s) => s.connected);
  const mediaId = useClub((s) => s.data?.mediaId ?? null);
  const playback = useClub((s) => s.data?.playbackStatus ?? "stopped");
  const hostRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<MusicProvider | null>(null);
  const [status, setStatus] = useState<ProviderStatus>("ready");
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const showPlayer = inside && YOUTUBE_ENABLED;
  const needsGesture = status === "autoplay-blocked";
  const usingYoutube = !!(mediaId && youtubeIdFor(mediaId));

  useEffect(() => {
    resetClub();
    return resetClub;
  }, [room]);

  // Mount player only while inside the club — do not tear down on brief reconnects.
  useEffect(() => {
    if (!inside) return;
    let cancelled = false;
    let provider: MusicProvider;
    provider = YOUTUBE_ENABLED
      ? new YouTubeMusicProvider((next) => {
          if (cancelled) return;
          setStatus(next);
          setErrorCode(provider.lastErrorCode ?? null);
        })
      : new MockMusicProvider();
    providerRef.current = provider;

    void (async () => {
      const host = hostRef.current;
      if (!YOUTUBE_ENABLED || !host || !(provider instanceof YouTubeMusicProvider)) return;
      try {
        await provider.mountVisiblePlayer(host, DEFAULT_YOUTUBE_VIDEO_ID);
        if (!cancelled) {
          setStatus("ready");
          setErrorCode(null);
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      provider.dispose();
      providerRef.current = null;
      setStatus("ready");
      setErrorCode(null);
    };
  }, [inside]);

  // Authoritative sync while connected; player stays mounted across reconnect.
  useEffect(() => {
    if (!inside || !connected) return;
    let cancelled = false;
    let pending = false;
    let lastRead = 0;
    const refresh = async () => {
      const provider = providerRef.current;
      if (!provider || pending || cancelled || Date.now() - lastRead < 500) return;
      lastRead = Date.now();
      pending = true;
      await clubCommand("read");
      const s = useClub.getState().data;
      if (s && !cancelled) {
        await provider.apply(s, clubNow());
        setErrorCode(provider.lastErrorCode ?? null);
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

  if (!showPlayer) return null;

  return (
    <aside
      data-club-music
      aria-label="Cung Underground YouTube player"
      className="pointer-events-auto absolute bottom-36 left-3 z-30 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 text-white shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs tracking-wide text-fuchsia-200/90">
        <span>NOW PLAYING · YOUTUBE</span>
        <span className="text-white/50">
          {playback}
          {usingYoutube ? "" : " · standby"}
        </span>
      </div>
      <div
        ref={hostRef}
        className="mx-auto my-2 h-[180px] min-h-[180px] min-w-[200px] w-full bg-black"
      />
      {needsGesture && (
        <button
          type="button"
          className="m-3 min-h-11 w-[calc(100%-1.5rem)] rounded-xl border border-fuchsia-300/40 bg-fuchsia-700/80 px-3 py-2 text-sm"
          onClick={() => void providerRef.current?.resumeFromGesture()}
        >
          Ketuk untuk memutar musik
        </button>
      )}
      {(status === "unavailable" || status === "failed") && (
        <p role="alert" className="px-3 pb-2 text-sm text-rose-300">
          YouTube error{errorCode != null ? ` (${errorCode})` : ""}. {errorHint(errorCode)}
        </p>
      )}
      <p className="px-3 pb-3 text-[11px] leading-snug text-white/45">
        Set:{" "}
        <a
          className="underline"
          href={`https://youtu.be/${DEFAULT_YOUTUBE_VIDEO_ID}`}
          target="_blank"
          rel="noreferrer"
        >
          youtu.be/{DEFAULT_YOUTUBE_VIDEO_ID}
        </a>
        . Request → Accept → Play. Player resmi (terlihat).
      </p>
    </aside>
  );
}
