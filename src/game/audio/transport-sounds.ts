const effects = ["door-open", "door-close", "brake", "horn", "helicopter"] as const;
const clips = [...effects, "engine-car", "engine-motorcycle", "engine-sport-bike"] as const;
type TransportClip = (typeof clips)[number];

const samples = new Map<TransportClip, AudioBuffer>();
let loading: Promise<void> | undefined;
const active = new Map<AudioBufferSourceNode, () => void>();

/** Decode the local recordings once after audio unlock. Missing clips keep the existing effects. */
export function preloadTransportSounds(ctx: AudioContext) {
  return (loading ??= Promise.all(
    clips.map(async (clip) => {
      try {
        const response = await fetch(`/assets/audio/transport/${clip}.mp3`);
        if (response.ok) samples.set(clip, await ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        /* Optional sound effects must not interrupt play. */
      }
    }),
  ).then(() => {}));
}

export function transportSample(clip: TransportClip) {
  return samples.get(clip);
}

export function playTransportSound(
  ctx: BaseAudioContext,
  destination: AudioNode,
  clip: (typeof effects)[number],
  level: number,
  { rate = 1, maxSeconds = Infinity, release = 0.03 } = {},
) {
  const sample = transportSample(clip);
  if (!sample) return false;
  if (active.size >= 8 || level <= 0) return true;

  const t = ctx.currentTime;
  const duration = Math.min(sample.duration / rate, maxSeconds);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = sample;
  source.playbackRate.value = rate;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(level, t + Math.min(0.012, duration / 4));
  gain.gain.setValueAtTime(level, t + duration - Math.min(release, duration / 2));
  gain.gain.linearRampToValueAtTime(0, t + duration);
  source.connect(gain).connect(destination);
  const disconnect = () => {
    source.onended = null;
    source.disconnect();
    gain.disconnect();
    active.delete(source);
  };
  active.set(source, () => {
    source.stop();
    disconnect();
  });
  source.onended = disconnect;
  source.start(t);
  source.stop(t + duration);
  return true;
}

/** Do not resume an in-progress recording from a previous scene or hidden tab. */
export function stopTransportSounds() {
  for (const stop of active.values()) stop();
}
