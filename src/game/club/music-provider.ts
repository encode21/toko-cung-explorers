import {
  DEFAULT_YOUTUBE_VIDEO_ID,
  playbackPosition,
  youtubeIdFor,
  type PlaybackState,
} from "./model.ts";

export type ProviderStatus = "ready" | "autoplay-blocked" | "unavailable" | "failed";

export interface MusicProvider {
  readonly id: string;
  apply(state: PlaybackState, serverNow: number): Promise<ProviderStatus>;
  position(): number;
  /** Local listening preference; never changes the room's playback transport. */
  setMuted(muted: boolean): void;
  resumeFromGesture(): Promise<ProviderStatus>;
  dispose(): void;
  lastErrorCode?: number | null;
}

/** Silent fallback for non-YouTube catalog ids and offline checks. */
export class MockMusicProvider implements MusicProvider {
  readonly id = "mock";
  lastErrorCode = null;
  private seconds = 0;
  async apply(state: PlaybackState, serverNow: number): Promise<ProviderStatus> {
    this.seconds = playbackPosition(state, serverNow);
    return "ready";
  }
  position() {
    return this.seconds;
  }
  setMuted() {
    // This provider has no audible output.
  }
  async resumeFromGesture(): Promise<ProviderStatus> {
    return "ready";
  }
  dispose() {
    this.seconds = 0;
  }
}

type YtPlayer = {
  destroy: () => void;
  cueVideoById: (args: { videoId: string; startSeconds?: number }) => void;
  loadVideoById: (args: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  getIframe?: () => HTMLIFrameElement;
};

type YtNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      width: number;
      height: number;
      videoId?: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YtPlayer }) => void;
        onError?: (e: { data: number }) => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YtPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; CUED: number; ENDED: number; BUFFERING: number };
};

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SEEK_SLACK_SEC = 2.5;
let apiLoading: Promise<YtNamespace> | null = null;

function loadYouTubeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearInterval(wait);
      window.clearTimeout(timeout);
      if (ok && window.YT?.Player) resolve(window.YT);
      else {
        apiLoading = null;
        reject(err ?? new Error("YouTube IFrame API unavailable"));
      }
    };
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      finish(true);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => finish(false, new Error("Failed to load YouTube IFrame API"));
      document.head.appendChild(script);
    }
    const wait = window.setInterval(() => {
      if (window.YT?.Player) finish(true);
    }, 50);
    const timeout = window.setTimeout(() => {
      finish(false, new Error("YouTube IFrame API timeout"));
    }, 15000);
  });
  return apiLoading;
}

function waitForBox(el: HTMLElement): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const read = () => {
      const w = Math.max(320, Math.floor(el.clientWidth || 0));
      const h = Math.max(180, Math.floor(el.clientHeight || w * (9 / 16)));
      if (el.clientWidth >= 200 && el.clientHeight >= 150) {
        resolve({ w, h });
        return true;
      }
      return false;
    };
    if (read()) return;
    const ro = new ResizeObserver(() => {
      if (read()) ro.disconnect();
    });
    ro.observe(el);
    window.setTimeout(() => {
      ro.disconnect();
      resolve({
        w: Math.max(320, Math.floor(el.clientWidth || 320)),
        h: Math.max(180, Math.floor(el.clientHeight || 180)),
      });
    }, 800);
  });
}

/**
 * Official visible IFrame Player — no audio extraction/proxy.
 * Always boots with an allowlisted videoId (empty players show YouTube's "try again later").
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export class YouTubeMusicProvider implements MusicProvider {
  readonly id = "youtube" as const;
  onStatus: (status: ProviderStatus) => void;
  lastErrorCode: number | null = null;
  private player: YtPlayer | null = null;
  private host: HTMLElement | null = null;
  private videoId: string | null = null;
  private lastStatus: ProviderStatus = "ready";
  private lastApplyKey = "";
  private ready = false;
  private mock = new MockMusicProvider();
  private wantPlaying = false;
  private targetSeconds = 0;
  private muted = false;

  constructor(onStatus: (status: ProviderStatus) => void = () => undefined) {
    this.onStatus = onStatus;
  }

  async mountVisiblePlayer(
    container: HTMLElement,
    initialVideoId = DEFAULT_YOUTUBE_VIDEO_ID,
  ): Promise<void> {
    this.disposePlayerOnly();
    this.host = container;
    container.replaceChildren();
    container.style.minWidth = "200px";
    container.style.minHeight = "200px";
    const mount = document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    mount.style.minWidth = "200px";
    mount.style.minHeight = "200px";
    container.appendChild(mount);
    const { w, h } = await waitForBox(container);
    const YT = await loadYouTubeApi();
    const videoId = initialVideoId || DEFAULT_YOUTUBE_VIDEO_ID;
    await new Promise<void>((resolve, reject) => {
      try {
        this.player = new YT.Player(mount, {
          width: w,
          height: h,
          // Never create an empty player — YouTube renders "Terjadi kesalahan / try again later".
          videoId,
          playerVars: {
            autoplay: 0,
            // Controls stay visible for YouTube branding; screen overlay blocks clicks.
            // Pause/next for the room is DJ Console only (server-authoritative).
            controls: 1,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
            fs: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            // Helps YouTube identify the embed client (related to Error 153).
            widget_referrer: window.location.href,
          },
          events: {
            onReady: (e) => {
              this.player = e.target;
              this.ready = true;
              this.videoId = videoId;
              this.lastErrorCode = null;
              this.applyMuted();
              try {
                const iframe = e.target.getIframe?.();
                iframe?.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
              } catch {
                /* ignore */
              }
              this.emit("ready");
              resolve();
            },
            onError: (e) => {
              this.lastErrorCode = e.data;
              // 100/101/150 = missing/restricted; 153 = config/referrer; 2/5 = param/HTML5.
              this.emit(
                e.data === 101 || e.data === 150 || e.data === 100 || e.data === 153
                  ? "unavailable"
                  : "failed",
              );
            },
            onStateChange: (e) => {
              const YT = window.YT;
              if (!YT || !this.wantPlaying || !this.player) return;
              // Local pause/seek must not diverge from room — only DJ Console mutates server state.
              if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
                try {
                  this.player.playVideo();
                } catch {
                  this.emit("autoplay-blocked");
                }
              }
            },
          },
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error("YouTube player failed"));
      }
    });
  }

  async apply(state: PlaybackState, serverNow: number): Promise<ProviderStatus> {
    const yt = state.mediaId ? youtubeIdFor(state.mediaId) : null;
    if (!this.player || !this.ready) {
      this.mock.apply(state, serverNow);
      if (state.playbackStatus === "playing" && yt) return this.emit("failed");
      return this.lastStatus;
    }

    // No active YouTube track: keep allowlisted video cued/paused (avoids blank error iframe).
    if (!yt) {
      this.wantPlaying = false;
      this.mock.apply(state, serverNow);
      try {
        this.player.pauseVideo();
      } catch {
        /* ignore */
      }
      return this.emit("ready");
    }

    const seconds = playbackPosition(state, serverNow);
    this.targetSeconds = seconds;
    this.wantPlaying = state.playbackStatus === "playing";
    const key = `${state.mediaId}:${state.playbackStatus}:${state.startedAt}:${Math.floor(state.positionSeconds)}:${state.queueVersion}`;

    if (this.videoId !== yt) {
      this.videoId = yt;
      this.lastApplyKey = key;
      this.lastErrorCode = null;
      if (this.wantPlaying) {
        this.player.loadVideoById({ videoId: yt, startSeconds: seconds });
      } else {
        this.player.cueVideoById({ videoId: yt, startSeconds: seconds });
      }
      return this.syncTransport();
    }

    if (this.lastApplyKey !== key) {
      this.lastApplyKey = key;
      const local = this.safeTime();
      if (Math.abs(local - seconds) > SEEK_SLACK_SEC) {
        this.player.seekTo(seconds, true);
      }
      return this.syncTransport();
    }

    return this.lastStatus;
  }

  position() {
    if (this.player && this.ready && this.videoId) return this.safeTime();
    return this.mock.position();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMuted();
  }

  async resumeFromGesture(): Promise<ProviderStatus> {
    if (!this.player || !this.ready) return this.emit("failed");
    try {
      this.lastErrorCode = null;
      if (this.wantPlaying) {
        this.player.seekTo(this.targetSeconds, true);
        this.player.playVideo();
      } else if (this.videoId) {
        // Idle preview: user gesture can start the allowlisted set locally until DJ presses Play.
        this.player.playVideo();
      }
      return this.emit("ready");
    } catch {
      return this.emit("autoplay-blocked");
    }
  }

  dispose() {
    this.disposePlayerOnly();
    this.mock.dispose();
    this.host = null;
    this.videoId = null;
    this.ready = false;
    this.lastApplyKey = "";
    this.lastErrorCode = null;
  }

  private disposePlayerOnly() {
    try {
      this.player?.destroy();
    } catch {
      /* player may already be torn down with the host node */
    }
    this.player = null;
    this.ready = false;
    if (this.host) this.host.replaceChildren();
  }

  private safeTime() {
    try {
      return this.player?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  }

  private applyMuted() {
    if (!this.player || !this.ready) return;
    try {
      if (this.muted) this.player.mute();
      else this.player.unMute();
    } catch {
      // Keep the preference for the replacement player if its iframe is being removed.
    }
  }

  private async syncTransport(): Promise<ProviderStatus> {
    if (!this.player) return this.emit("failed");
    try {
      if (this.wantPlaying) {
        this.player.playVideo();
        await new Promise((r) => setTimeout(r, 400));
        const state = this.player.getPlayerState();
        const YT = window.YT;
        if (
          YT &&
          this.wantPlaying &&
          state !== YT.PlayerState.PLAYING &&
          state !== YT.PlayerState.BUFFERING
        ) {
          return this.emit("autoplay-blocked");
        }
      } else {
        this.player.pauseVideo();
      }
      return this.emit("ready");
    } catch {
      return this.emit("autoplay-blocked");
    }
  }

  private emit(status: ProviderStatus) {
    this.lastStatus = status;
    this.onStatus(status);
    return status;
  }
}

export const YOUTUBE_ENABLED = true;
