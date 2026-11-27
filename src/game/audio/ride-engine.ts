import { getAudioContext } from "./audio-context";
import { audioBus, worldAudioAudible } from "./audio-manager";
import { sharedNoise } from "./sound-palette";
import { playBrakeSfx } from "./sfx";
import { transportSample } from "./transport-sounds";
import {
  rideEngineParams,
  rideEngineVoice,
  rideRpmTarget,
  type RideKind,
} from "./ride-engine-params";

export interface RideAudioState {
  id: string;
  kind: RideKind;
  speed: number;
  throttle: number;
  brake: boolean;
}

type EngineParams = ReturnType<typeof rideEngineParams>;

interface Engine {
  tune: (params: EngineParams, throttle: number, now: number) => void;
  stop: () => void;
}

interface Voice {
  kind: RideKind;
  engine: Engine;
  recording: AudioBuffer | undefined;
  tires: GainNode;
  squeal: GainNode;
  stop: () => void;
}

const recordings = {
  bebek: { clip: "engine-motorcycle", rate: 0.93 },
  matic: { clip: "engine-motorcycle", rate: 0.85 },
  car: { clip: "engine-car", rate: 0.93 },
  "sport-car": { clip: "engine-car", rate: 1.03 },
  sporty: { clip: "engine-sport-bike", rate: 0.92 },
  diesel: { clip: "engine-car", rate: 0.79 },
  bajaj: { clip: "engine-motorcycle", rate: 1.06 },
  truck: undefined,
} as const;

let voice: Voice | null = null;
let rideId: string | null = null;
let rpm = 0;
let braking = false;

function volume(ctx: AudioContext, level = 0) {
  const gain = ctx.createGain();
  gain.gain.value = level;
  return gain;
}

function startEngine(
  ctx: AudioContext,
  output: AudioNode,
  kind: RideKind,
  sample?: AudioBuffer,
): Engine {
  const spec = rideEngineVoice(kind);
  const recording = recordings[kind];
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  const engine = volume(ctx);
  if (sample && recording) {
    const source = ctx.createBufferSource();
    source.buffer = sample;
    source.loop = true;
    source.playbackRate.value = recording.rate * 0.8;
    source.connect(filter).connect(engine).connect(output);
    source.start();
    return {
      tune: (p, throttle, now) => {
        const rev = (p.pitch - spec.idle) / (spec.top - spec.idle);
        const load = Math.min(1, Math.abs(throttle));
        source.playbackRate.setTargetAtTime(
          recording.rate * (0.8 + 1.12 * rev + 0.28 * load),
          now,
          0.06,
        );
        filter.frequency.setTargetAtTime(p.cutoff * (1.35 + 0.38 * load), now, 0.08);
        engine.gain.setTargetAtTime(p.motor * 2.4, now, 0.09);
      },
      stop: () => {
        source.stop();
        for (const node of [source, filter, engine]) node.disconnect();
      },
    };
  }

  const low = ctx.createOscillator();
  low.type = spec.wave;
  const high = ctx.createOscillator();
  high.type = "square";
  const harmonic = volume(ctx, spec.harm);
  // Firing pulses keep the procedural fallback distinct for each kind of engine.
  const pulse = volume(ctx, 1 - spec.chug / 2);
  const lfo = ctx.createOscillator();
  const depth = volume(ctx, spec.chug / 2);
  lfo.connect(depth).connect(pulse.gain);
  low.connect(filter);
  high.connect(harmonic).connect(filter);
  filter.connect(pulse).connect(engine).connect(output);
  low.start();
  high.start();
  lfo.start();
  return {
    tune: (p, _throttle, now) => {
      low.frequency.setTargetAtTime(p.pitch, now, 0.05);
      high.frequency.setTargetAtTime(p.pitch * 2, now, 0.05);
      filter.frequency.setTargetAtTime(p.cutoff, now, 0.08);
      lfo.frequency.setTargetAtTime(p.pulse, now, 0.05);
      engine.gain.setTargetAtTime(p.motor, now, 0.08);
    },
    stop: () => {
      for (const node of [low, high, lfo]) node.stop();
      for (const node of [low, high, lfo, depth, pulse, harmonic, filter, engine])
        node.disconnect();
    },
  };
}

function start(ctx: AudioContext, kind: RideKind, recording?: AudioBuffer): Voice {
  const bus = audioBus("vehicle");
  const noise = (type: BiquadFilterType, frequency: number, q: number, out: GainNode) => {
    const src = ctx.createBufferSource();
    src.buffer = sharedNoise(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    src.connect(filter).connect(out).connect(bus);
    src.start();
    return [src, filter] as const;
  };
  const tires = volume(ctx);
  const squeal = volume(ctx);
  const [tireSrc, tireFilter] = noise("lowpass", 1400, 0.7, tires);
  const [squealSrc, squealFilter] = noise("bandpass", 2800, 8, squeal);
  return {
    kind,
    engine: startEngine(ctx, bus, kind, recording),
    recording,
    tires,
    squeal,
    stop: () => {
      for (const src of [tireSrc, squealSrc]) src.stop();
      for (const node of [tireSrc, tireFilter, tires, squealSrc, squealFilter, squeal])
        node.disconnect();
    },
  };
}

function stop() {
  if (voice) {
    voice.engine.stop();
    voice.stop();
  }
  voice = null;
  rideId = null;
  rpm = 0;
  braking = false;
}

if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });

/** The ridden vehicle's id, so the ambient traffic loops skip it (no doubled engine). */
export const rideAudioId = () => rideId;

/** Called every frame while riding; `null` (or silence/mute) tears the voice down. */
export function updateRideAudio(state: RideAudioState | null, dt: number) {
  const ctx = getAudioContext();
  if (!state || !ctx || !worldAudioAudible()) return stop();
  const clip = recordings[state.kind]?.clip;
  const recording = clip ? transportSample(clip) : undefined;
  if (!voice || voice.kind !== state.kind || rideId !== state.id) {
    stop();
    voice = start(ctx, state.kind, recording);
  } else if (voice.recording !== recording) {
    // If the ride starts before preloading finishes, keep the revs and swap just the engine.
    voice.engine.stop();
    voice.engine = startEngine(ctx, audioBus("vehicle"), state.kind, recording);
    voice.recording = recording;
  }
  rideId = state.id;
  const target = rideRpmTarget(state.kind, state.speed, state.throttle);
  // Revs climb fast on the gas, drop quickly on an upshift and coast down when the gas is released.
  rpm += (target - rpm) * (1 - Math.exp(-(target > rpm ? 4 : state.throttle > 0 ? 6 : 1.8) * dt));
  const p = rideEngineParams(state.kind, state.speed, state.throttle, state.brake, rpm);
  const now = ctx.currentTime;
  voice.engine.tune(p, state.throttle, now);
  voice.tires.gain.setTargetAtTime(p.tires, now, 0.15);
  const recordedBrake = Boolean(transportSample("brake"));
  const squeal = recordedBrake ? 0 : p.squeal;
  voice.squeal.gain.setTargetAtTime(squeal, now, squeal ? 0.04 : 0.12);
  if (state.brake && !braking && (recordedBrake ? p.squeal > 0 : Math.abs(state.speed) > 4))
    void playBrakeSfx(Math.min(1, Math.abs(state.speed) / 8));
  braking = state.brake;
}
