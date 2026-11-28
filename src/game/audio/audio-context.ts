/**
 * Shared AudioContext — ambient + SFX butuh gesture unlock yang sama.
 */

let ctx: AudioContext | null = null;

export function ensureAudioContext(): AudioContext {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  return ctx;
}

export function getAudioContext() {
  return ctx;
}

/**
 * Resume from "suspended" and WebKit's "interrupted" (calls, notifications, audio route changes).
 * Outside a gesture some WebViews never settle resume(); give up after a moment so callers retry.
 */
export async function resumeAudioContext(timeoutMs = 1500) {
  const audio = ensureAudioContext();
  if (audio.state !== "running" && audio.state !== "closed") {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      audio.resume().catch(() => undefined),
      new Promise((done) => (timer = setTimeout(done, timeoutMs))),
    ]);
    clearTimeout(timer);
  }
  return audio;
}
