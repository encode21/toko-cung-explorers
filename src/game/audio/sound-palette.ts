/** Replace these procedural placeholders with licensed samples at this single adapter.
 * Shared noise buffer, at most six short voices, and explicit node cleanup. */
import { audioAudible, audioBus, type AudioCategory } from "./audio-manager";
import { getAudioContext } from "./audio-context";
export type SoundCue =
  "interact" | "greeting" | "scan" | "receipt" | "carton" | "tape" | "trolley" | "entrance";
export const SOUND_PALETTE: Record<
  SoundCue,
  { frequency: number; duration: number; gain: number; noise?: boolean; category: AudioCategory }
> = {
  interact: { frequency: 520, duration: 0.09, gain: 0.045, category: "sfx" },
  greeting: { frequency: 230, duration: 0.32, gain: 0.025, category: "npc" },
  scan: { frequency: 1450, duration: 0.09, gain: 0.035, category: "sfx" },
  receipt: { frequency: 1600, duration: 0.55, gain: 0.025, noise: true, category: "sfx" },
  carton: { frequency: 430, duration: 0.22, gain: 0.06, noise: true, category: "sfx" },
  tape: { frequency: 2200, duration: 0.38, gain: 0.025, noise: true, category: "sfx" },
  trolley: { frequency: 650, duration: 0.7, gain: 0.028, noise: true, category: "sfx" },
  entrance: { frequency: 780, duration: 0.24, gain: 0.025, category: "sfx" },
};
let buffer: AudioBuffer | undefined;
let voices = 0;
export function sharedNoise(ctx: AudioContext) {
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 7, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
export function playCue(cue: SoundCue, level = 1) {
  const ctx = getAudioContext();
  if (!ctx || !audioAudible() || voices >= 6 || level <= 0) return;
  const spec = SOUND_PALETTE[cue];
  const source = spec.noise ? ctx.createBufferSource() : ctx.createOscillator();
  if (source instanceof AudioBufferSourceNode) source.buffer = sharedNoise(ctx);
  else {
    source.frequency.setValueAtTime(
      spec.frequency * (0.97 + Math.random() * 0.06),
      ctx.currentTime,
    );
    source.frequency.linearRampToValueAtTime(
      spec.frequency * (cue === "greeting" ? 1.3 : 0.95),
      ctx.currentTime + spec.duration,
    );
  }
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = spec.frequency;
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(spec.gain * Math.min(1, level), t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.duration);
  source.connect(filter).connect(gain).connect(audioBus(spec.category));
  voices++;
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
    voices--;
  };
  source.start();
  source.stop(t + spec.duration + 0.02);
}
