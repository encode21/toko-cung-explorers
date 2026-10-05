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

export async function resumeAudioContext() {
  const audio = ensureAudioContext();
  if (audio.state === "suspended") await audio.resume();
  return audio;
}
