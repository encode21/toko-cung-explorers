import { getAudioContext } from "./audio-context";
import { audioAudible, audioBus } from "./audio-manager";

/** Synthesized wildlife one-shots for the mountain (no samples): birds by day, crickets at night. */
export type WildlifeCall = "trill" | "whistle" | "coo" | "cricket";

let voices = 0;

/** One short sine note with a pitch sweep; returns when it ends (seconds from now). */
function note(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  from: number,
  to: number,
  duration: number,
  gain: number,
) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + Math.min(0.012, duration / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
  return at + duration;
}

export function playWildlife(call: WildlifeCall, level = 1) {
  const ctx = getAudioContext();
  if (!ctx || !audioAudible() || voices >= 3 || level <= 0) return;
  // Each call comes from a random side so the forest sounds wide rather than centred.
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.4 - 0.7;
  pan.connect(audioBus("ambience"));
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  const v = Math.min(1, level);
  let t = ctx.currentTime + 0.02;
  if (call === "trill") {
    const base = r(3200, 4600);
    for (let i = 0, n = Math.floor(r(4, 9)); i < n; i++)
      t = note(ctx, pan, t, base * r(0.95, 1.05), base * 1.25, r(0.035, 0.06), 0.035 * v) + r(0.02, 0.05);
  } else if (call === "whistle") {
    // Two- or three-note descending whistle, repeated once.
    const base = r(1900, 2700);
    for (let rep = 0; rep < 2; rep++) {
      t = note(ctx, pan, t, base * 1.3, base * 1.15, 0.14, 0.04 * v) + 0.05;
      t = note(ctx, pan, t, base, base * 0.82, 0.22, 0.04 * v) + r(0.25, 0.45);
    }
  } else if (call === "coo") {
    // Dove-like "ku-kuuk": low, soft, far away.
    const base = r(480, 560);
    t = note(ctx, pan, t, base, base * 0.92, 0.18, 0.03 * v) + 0.12;
    t = note(ctx, pan, t, base * 1.05, base * 0.85, 0.42, 0.03 * v);
  } else {
    // Cricket: rapid pulses of a high carrier.
    const base = r(4300, 4900);
    for (let i = 0; i < 3; i++) {
      for (let p = 0; p < 6; p++) t = note(ctx, pan, t, base, base, 0.018, 0.012 * v) + 0.012;
      t += 0.16;
    }
  }
  voices++;
  window.setTimeout(
    () => {
      voices--;
      pan.disconnect();
    },
    (t - ctx.currentTime + 0.1) * 1000,
  );
}
