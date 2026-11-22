import { getAudioContext } from "./audio-context";
import { audioAudible, audioBus } from "./audio-manager";
import { sharedNoise } from "./sound-palette";
import { playBrakeSfx } from "./sfx";
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

interface Voice {
  kind: RideKind;
  low: OscillatorNode;
  high: OscillatorNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  engine: GainNode;
  tires: GainNode;
  squeal: GainNode;
  stop: () => void;
}

let voice: Voice | null = null;
let rideId: string | null = null;
let rpm = 0;
let braking = false;

function start(ctx: AudioContext, kind: RideKind): Voice {
  const bus = audioBus("vehicle");
  const gain = (value = 0) => {
    const g = ctx.createGain();
    g.gain.value = value;
    return g;
  };
  const spec = rideEngineVoice(kind);
  const low = ctx.createOscillator();
  low.type = spec.wave;
  const high = ctx.createOscillator();
  high.type = "square";
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  const engine = gain();
  const harmonic = gain(spec.harm);
  // Firing pulses: an LFO wobbles the gain so a bebek putters, a diesel clatters, a bajaj buzzes.
  const pulse = gain(1 - spec.chug / 2);
  const lfo = ctx.createOscillator();
  const depth = gain(spec.chug / 2);
  lfo.connect(depth).connect(pulse.gain);
  low.connect(filter);
  high.connect(harmonic).connect(filter);
  filter.connect(pulse).connect(engine).connect(bus);

  const noise = (type: BiquadFilterType, frequency: number, q: number, out: GainNode) => {
    const src = ctx.createBufferSource();
    src.buffer = sharedNoise(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    src.connect(f).connect(out).connect(bus);
    src.start();
    return [src, f] as const;
  };
  const tires = gain();
  const squeal = gain();
  const [tireSrc, tireFilter] = noise("lowpass", 1400, 0.7, tires);
  const [squealSrc, squealFilter] = noise("bandpass", 2800, 8, squeal);
  low.start();
  high.start();
  lfo.start();
  const nodes: AudioNode[] = [
    low,
    high,
    lfo,
    depth,
    pulse,
    harmonic,
    filter,
    engine,
    tireSrc,
    tireFilter,
    tires,
  ];
  nodes.push(squealSrc, squealFilter, squeal);
  return {
    kind,
    low,
    high,
    filter,
    lfo,
    engine,
    tires,
    squeal,
    stop: () => {
      for (const src of [low, high, lfo, tireSrc, squealSrc]) src.stop();
      for (const node of nodes) node.disconnect();
    },
  };
}

function stop() {
  voice?.stop();
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
  if (!state || !ctx || !audioAudible()) return stop();
  if (!voice || voice.kind !== state.kind) {
    stop();
    voice = start(ctx, state.kind);
  }
  rideId = state.id;
  const target = rideRpmTarget(state.kind, state.speed, state.throttle);
  // Revs climb fast on the gas, drop quickly on an upshift and coast down when the gas is released.
  rpm += (target - rpm) * (1 - Math.exp(-(target > rpm ? 4 : state.throttle > 0 ? 6 : 1.8) * dt));
  const p = rideEngineParams(state.kind, state.speed, state.throttle, state.brake, rpm);
  const now = ctx.currentTime;
  voice.low.frequency.setTargetAtTime(p.pitch, now, 0.05);
  voice.high.frequency.setTargetAtTime(p.pitch * 2, now, 0.05);
  voice.filter.frequency.setTargetAtTime(p.cutoff, now, 0.08);
  voice.lfo.frequency.setTargetAtTime(p.pulse, now, 0.05);
  voice.engine.gain.setTargetAtTime(p.motor, now, 0.08);
  voice.tires.gain.setTargetAtTime(p.tires, now, 0.15);
  voice.squeal.gain.setTargetAtTime(p.squeal, now, p.squeal ? 0.04 : 0.12);
  if (state.brake && !braking && Math.abs(state.speed) > 4)
    void playBrakeSfx(Math.min(1, Math.abs(state.speed) / 8));
  braking = state.brake;
}
