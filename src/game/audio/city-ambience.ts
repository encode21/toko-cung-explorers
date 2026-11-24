import { getAudioContext } from "./audio-context";
import { audioAudible, audioBus } from "./audio-manager";
import { sharedNoise } from "./sound-palette";
import { audioZoneAt } from "./world-acoustics";
import { playWildlife } from "./mountain-ambience";
import { ambienceLevels, birdIntervalMs } from "./ambience-levels";
import { setAmbientRainDuck } from "./ambient-music";
import { currentWeather } from "@/game/weather/store";
import { useGame } from "@/state/game-store";
import { useSceneTime } from "@/game/time/scene-time";
import { isHomeRoom } from "@/game/home/model";
import { isMountainPosition } from "@/game/mountain/model";
import { isGangPosition } from "@/game/gang/store";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { useClub } from "@/game/club/store";

interface NoiseLoop {
  gain: GainNode;
  high: BiquadFilterNode;
  low: BiquadFilterNode;
  stop: () => void;
}
/** Looping shared-noise voice: highpass -> lowpass -> gain. Created only while audible. */
function noiseLoop(): NoiseLoop {
  const ctx = getAudioContext()!;
  const source = ctx.createBufferSource();
  source.buffer = sharedNoise(ctx);
  source.loop = true;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(high).connect(low).connect(gain).connect(audioBus("ambience"));
  source.start();
  return {
    gain,
    high,
    low,
    stop: () => {
      source.stop();
      for (const n of [source, high, low, gain]) n.disconnect();
    },
  };
}

/** One-shot filtered noise burst with an attack/decay envelope; self-disconnects. */
function burst(
  type: BiquadFilterType,
  freq: number,
  peak: number,
  attack: number,
  decay: number,
  pan = 0,
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const source = ctx.createBufferSource();
  source.buffer = sharedNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  source.connect(filter).connect(gain).connect(p).connect(audioBus("ambience"));
  source.start(t, Math.random() * 5, attack + decay + 0.05);
  source.onended = () => {
    for (const n of [source, filter, gain, p]) n.disconnect();
  };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function rooster() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const out = ctx.createGain();
  out.gain.value = 0.035;
  out.connect(audioBus("ambience"));
  const t = ctx.currentTime + 0.02;
  // Broken glide "kukuruyuuuk": a few sawtooth notes through a low-pass.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.connect(out);
  const notes: [number, number, number, number][] = [
    [0, 0.18, 520, 640],
    [0.22, 0.2, 640, 560],
    [0.46, 0.18, 560, 700],
    [0.68, 0.7, 700, 420],
  ];
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(520, t);
  for (const [at, d, from, to] of notes) {
    osc.frequency.setValueAtTime(from, t + at);
    osc.frequency.exponentialRampToValueAtTime(to, t + at + d);
  }
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(0.035, t + 0.05);
  out.gain.setValueAtTime(0.035, t + 1.25);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  osc.connect(filter);
  osc.start(t);
  osc.stop(t + 1.55);
  osc.onended = () => {
    for (const n of [osc, filter, out]) n.disconnect();
  };
}

/** Far motorbike passing: low saw whine rising then fading, panned across. */
function motorbike() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.linearRampToValueAtTime(110, t + 2);
  osc.frequency.linearRampToValueAtTime(85, t + 4);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.02, t + 2);
  gain.gain.linearRampToValueAtTime(0.0001, t + 4);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.8, t);
  pan.pan.linearRampToValueAtTime(0.8, t + 4);
  osc.connect(filter).connect(gain).connect(pan).connect(audioBus("ambience"));
  osc.start(t);
  osc.stop(t + 4.1);
  osc.onended = () => {
    for (const n of [osc, filter, gain, pan]) n.disconnect();
  };
}

/** Ibu-ibu murmur: a few band-passed noise syllables, far away. */
function chatter() {
  const pan = rand(-0.7, 0.7);
  for (let i = 0, n = Math.floor(rand(5, 9)); i < n; i++)
    window.setTimeout(
      () => burst("bandpass", rand(500, 1100), 0.018, 0.03, rand(0.08, 0.16), pan),
      i * rand(130, 220),
    );
}

function thunder() {
  burst("lowpass", rand(140, 260), 0.16, 0.25, rand(2.5, 4), rand(-0.6, 0.6));
}

function isIndoors(x: number, z: number) {
  const zone = audioZoneAt(x, z);
  const club = useClub.getState();
  return (
    isHomeRoom(x, z) ||
    !!useWarung.getState().inside ||
    !!useUsaha.getState().inside ||
    (club.inside && !club.outdoor) ||
    zone === "retail" ||
    zone === "cashier" ||
    zone === "warehouse"
  );
}

/** Rain, birds, crickets, traffic and gang extras. One 250 ms observer; no per-frame nodes. */
export function startCityAmbience() {
  let rainLoop: NoiseLoop | undefined;
  let cricketLoop: NoiseLoop | undefined;
  let trafficLoop: NoiseLoop | undefined;
  let nextBird = 0;
  let nextThunder = 0;
  let nextRooster = 0;
  let nextBike = 0;
  let nextChatter = 0;
  let lastSplash = 0;
  let last: [number, number] | undefined;
  const stopLoops = () => {
    rainLoop?.stop();
    cricketLoop?.stop();
    trafficLoop?.stop();
    rainLoop = cricketLoop = trafficLoop = undefined;
  };
  const tick = () => {
    const ctx = getAudioContext();
    if (!ctx || !audioAudible()) {
      stopLoops();
      return;
    }
    const [x, , z] = useGame.getState().playerPos;
    const weather = currentWeather();
    const time = useSceneTime.getState();
    const mountain = isMountainPosition(x, z);
    const gang = isGangPosition(x, z);
    const input = { rain: weather.rain, indoor: isIndoors(x, z), hour: time.hour, gang };
    const lv = ambienceLevels(input);
    const now = performance.now();
    const at = ctx.currentTime;
    setAmbientRainDuck(lv.bgmDuck);

    if (lv.rainGain > 0.001) {
      rainLoop ??= noiseLoop();
      rainLoop.gain.gain.setTargetAtTime(lv.rainGain, at, 0.6);
      rainLoop.high.frequency.setTargetAtTime(lv.rainHighpass, at, 0.6);
      rainLoop.low.frequency.setTargetAtTime(lv.rainLowpass, at, 0.6);
    } else if (rainLoop) {
      rainLoop.gain.gain.setTargetAtTime(0, at, 0.4);
      if (rainLoop.gain.gain.value < 0.0004) {
        rainLoop.stop();
        rainLoop = undefined;
      }
    }
    if (lv.thunder && now > nextThunder) {
      if (nextThunder) thunder();
      nextThunder = now + rand(15000, 35000);
    }

    // Mountain keeps its own wildlife/wind in world-feedback.ts.
    if (mountain) {
      cricketLoop?.stop();
      trafficLoop?.stop();
      cricketLoop = trafficLoop = undefined;
      return;
    }
    // Crickets: a thin steady high band rather than per-chirp voices.
    if (lv.cricketGain) {
      if (!cricketLoop) {
        cricketLoop = noiseLoop();
        cricketLoop.high.frequency.value = 4200;
        cricketLoop.low.frequency.value = 5200;
      }
      const pulse = 0.5 + 0.5 * Math.sin(now / 90);
      cricketLoop.gain.gain.setTargetAtTime((gang ? 0.006 : 0.003) * pulse, at, 0.15);
    } else if (cricketLoop) {
      cricketLoop.stop();
      cricketLoop = undefined;
    }
    if (lv.trafficGain > 0) {
      if (!trafficLoop) {
        trafficLoop = noiseLoop();
        trafficLoop.high.frequency.value = 60;
        trafficLoop.low.frequency.value = 220;
      }
      trafficLoop.gain.gain.setTargetAtTime(lv.trafficGain, at, 1.2);
    } else if (trafficLoop) {
      trafficLoop.stop();
      trafficLoop = undefined;
    }

    const birdEvery = birdIntervalMs(input);
    if (birdEvery !== Infinity && now > nextBird) {
      if (nextBird) playWildlife(Math.random() < 0.6 ? "trill" : "whistle", rand(0.4, 0.8));
      nextBird = now + birdEvery * rand(0.5, 1.5);
    }

    if (gang && !input.indoor) {
      const hour = time.hour;
      if (hour >= 5 && hour < 9 && weather.rain < 0.5 && now > nextRooster) {
        if (nextRooster) rooster();
        nextRooster = now + rand(60000, 120000);
      }
      if (hour >= 6 && hour < 20 && now > nextBike) {
        if (nextBike) motorbike();
        nextBike = now + rand(45000, 90000);
      }
      if (hour >= 6 && hour < 18 && weather.rain < 0.5 && now > nextChatter) {
        if (nextChatter) chatter();
        nextChatter = now + rand(30000, 70000);
      }
      // Sloshing steps while moving through flood water.
      if (last && weather.flood > 0.3 && now - lastSplash > 450) {
        if (Math.hypot(x - last[0], z - last[1]) > 0.4) {
          burst("bandpass", rand(600, 1200), 0.05 * weather.flood, 0.01, 0.22);
          lastSplash = now;
        }
      }
    }
    last = [x, z];
  };
  const timer = window.setInterval(tick, 250);
  return () => {
    clearInterval(timer);
    stopLoops();
    setAmbientRainDuck(1);
  };
}
