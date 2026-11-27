/** Shared cues with cached water recordings and procedural fallback.
 * Shared noise buffer, at most six short voices, and explicit node cleanup. */
import { audioAudible, audioBus, worldAudioAudible, type AudioCategory } from "./audio-manager";
import { ensureAudioContext, getAudioContext } from "./audio-context";
import { playTransportSound } from "./transport-sounds";
export type SoundCue =
  | "interact"
  | "greeting"
  | "scan"
  | "receipt"
  | "carton"
  | "tape"
  | "trolley"
  | "entrance"
  | "vehicle-door"
  | "vehicle-seat"
  | "splash"
  | "water-entry"
  | "water-plunge";
export const SOUND_PALETTE: Record<
  SoundCue,
  {
    frequency: number;
    duration: number;
    gain: number;
    noise?: boolean;
    sample?: string;
    category: AudioCategory;
  }
> = {
  "vehicle-door": { frequency: 380, duration: 0.22, gain: 0.045, noise: true, category: "vehicle" },
  "vehicle-seat": { frequency: 600, duration: 0.18, gain: 0.025, noise: true, category: "vehicle" },
  splash: {
    frequency: 1500,
    duration: 0.32,
    gain: 0.16,
    noise: true,
    sample: "swim",
    category: "sfx",
  },
  "water-entry": {
    frequency: 1200,
    duration: 0.5,
    gain: 0.3,
    noise: true,
    sample: "entry",
    category: "sfx",
  },
  "water-plunge": {
    frequency: 900,
    duration: 0.8,
    gain: 0.5,
    noise: true,
    sample: "plunge",
    category: "sfx",
  },
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
const samples = new Map<SoundCue, AudioBuffer>();
let waterLoading: Promise<void> | undefined;
/** Tiny CC0 recordings are decoded once; a failed download retains the procedural cue. */
export function preloadWaterSounds() {
  return (waterLoading ??= Promise.all(
    (["splash", "water-entry", "water-plunge"] as const).map(async (cue) => {
      try {
        const response = await fetch(`/assets/audio/water/${SOUND_PALETTE[cue].sample}.mp3`);
        if (!response.ok) return;
        samples.set(cue, await ensureAudioContext().decodeAudioData(await response.arrayBuffer()));
      } catch {
        /* Optional audio must not block playing. */
      }
    }),
  ).then(() => {}));
}
export function sharedNoise(ctx: AudioContext) {
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 7, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
export function playVehicleDoor(open: boolean, level: number) {
  const ctx = getAudioContext();
  if (!ctx || !worldAudioAudible() || level <= 0) return;
  if (
    !playTransportSound(ctx, audioBus("vehicle"), open ? "door-open" : "door-close", 0.18 * level)
  )
    playCue("vehicle-door", level);
}

export function playCue(cue: SoundCue, level = 1) {
  const ctx = getAudioContext();
  const spec = SOUND_PALETTE[cue];
  const audible = spec.category === "vehicle" ? worldAudioAudible() : audioAudible();
  if (!ctx || !audible || voices >= 6 || level <= 0) return;
  const sample = samples.get(cue);
  const duration = sample?.duration ?? spec.duration;
  const source = spec.noise ? ctx.createBufferSource() : ctx.createOscillator();
  if (source instanceof AudioBufferSourceNode) source.buffer = sample ?? sharedNoise(ctx);
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
  filter.frequency.value = sample ? 12000 : spec.frequency;
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(
    (spec.sample && !sample ? 0.035 : spec.gain) * Math.min(1, level),
    t + (sample ? 0.008 : 0.015),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter).connect(gain).connect(audioBus(spec.category));
  voices++;
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
    voices--;
  };
  source.start();
  source.stop(t + duration + 0.02);
}
