import { useReactiveWorld } from "@/game/reactive-world/store";
import { vehicleSound } from "./vehicle-sound";
import { getAudioContext } from "./audio-context";
import { audioAudible, audioBus } from "./audio-manager";
import { audioZoneAt, distanceGain } from "./world-acoustics";
import { playCue, sharedNoise } from "./sound-palette";
import { useGame } from "@/state/game-store";
import { useSceneTime } from "@/game/time/scene-time";
import { dynamicInteractables } from "@/game/interactions/dynamic";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { rideAudioId } from "./ride-engine";
import { isMountainPosition, MOUNTAIN_WATERFALL as FALL } from "@/game/mountain/model";
import { playWildlife, type WildlifeCall } from "./mountain-ambience";

interface Loop {
  gain: GainNode;
  filter: BiquadFilterNode;
  source: AudioBufferSourceNode | OscillatorNode;
  stop: () => void;
}
function loop(
  category: "ambience" | "vehicle",
  frequency: number,
  noise: boolean,
  pitch = frequency,
): Loop {
  const ctx = getAudioContext()!;
  const source = noise ? ctx.createBufferSource() : ctx.createOscillator();
  if (source instanceof AudioBufferSourceNode) {
    source.buffer = sharedNoise(ctx);
    source.loop = true;
  } else {
    source.type = "triangle";
    source.frequency.value = pitch;
  }
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(audioBus(category));
  source.start();
  return {
    source,
    gain,
    filter,
    stop: () => {
      source.stop();
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}
/** One 5 Hz local observer. No world state writes or network audio events. */
export function startWorldFeedback() {
  let outdoor: Loop | undefined, indoor: Loop | undefined;
  const engines = new Map<string, { motor: Loop; tires: Loop }>();
  let waterfall: { rumble: Loop; hiss: Loop } | undefined;
  let wind: Loop | undefined;
  let nextWildlife = 0;
  let nextChatter = 0;
  let previousInside = useGame.getState().inside;
  let entranceAt = 0;
  const stopLoops = () => {
    outdoor?.stop();
    indoor?.stop();
    outdoor = indoor = undefined;
    waterfall?.rumble.stop();
    waterfall?.hiss.stop();
    waterfall = undefined;
    wind?.stop();
    wind = undefined;
    for (const engine of engines.values()) {
      engine.motor.stop();
      engine.tires.stop();
    }
    engines.clear();
  };
  const tick = () => {
    const ctx = getAudioContext();
    if (!ctx || !audioAudible()) {
      stopLoops();
      return;
    }
    outdoor ??= loop("ambience", 500, true);
    indoor ??= loop("ambience", 180, true);
    const game = useGame.getState();
    const [x, y, z] = game.playerPos;
    // Waterfall roar: distance to the nearest point of the curtain; low rumble carries further
    // than the splash hiss. Loops exist only within earshot.
    const fall = Math.hypot(
      x - Math.max(FALL.x - FALL.width / 2, Math.min(FALL.x + FALL.width / 2, x)),
      y - Math.max(FALL.bottom, Math.min(FALL.top, y)),
      z - FALL.z,
    );
    if (fall < 60) {
      waterfall ??= { rumble: loop("ambience", 420, true), hiss: loop("ambience", 2600, true) };
      waterfall.rumble.gain.gain.setTargetAtTime(distanceGain(fall, 60) * 0.2, ctx.currentTime, 0.5);
      waterfall.hiss.gain.gain.setTargetAtTime(distanceGain(fall, 38) * 0.06, ctx.currentTime, 0.5);
    } else if (waterfall) {
      waterfall.rumble.stop();
      waterfall.hiss.stop();
      waterfall = undefined;
    }
    if (isMountainPosition(x, z)) {
      // Wind: gusting band noise, stronger and brighter the higher the player climbs.
      const now = performance.now();
      const altitude = Math.max(0, Math.min(1, (y - 8) / 30));
      const gust = 0.55 + 0.45 * (0.5 + 0.3 * Math.sin(now / 6800) + 0.2 * Math.sin(now / 2100 + 1.3));
      wind ??= loop("ambience", 500, true);
      wind.gain.gain.setTargetAtTime((0.016 + 0.034 * altitude) * gust, ctx.currentTime, 0.9);
      wind.filter.frequency.setTargetAtTime(320 + gust * (420 + 380 * altitude), ctx.currentTime, 0.9);
      // Wildlife: birds by day (doves at dawn/evening), crickets at night, every few seconds.
      if (now > nextWildlife) {
        const time = useSceneTime.getState().timeOfDay;
        const night = time === "NIGHT";
        const roll = Math.random();
        const call: WildlifeCall = night
          ? "cricket"
          : roll < (time === "DAWN" || time === "EVENING" ? 0.4 : 0.15)
            ? "coo"
            : roll < 0.6
              ? "trill"
              : "whistle";
        playWildlife(call, 0.65 + Math.random() * 0.35);
        nextWildlife = now + (night ? 2500 + Math.random() * 3500 : 2000 + Math.random() * 5500);
      }
    } else if (wind) {
      wind.stop();
      wind = undefined;
    }
    const zone = audioZoneAt(x, z);
    const inside = zone === "retail" || zone === "cashier" || zone === "warehouse";
    const time = useSceneTime.getState().timeOfDay;
    const activity = time === "NIGHT" ? 0.55 : time === "EVENING" ? 0.8 : 1;
    const now = performance.now();
    outdoor.gain.gain.setTargetAtTime(
      (inside ? 0.006 : 0.032) * activity * (0.92 + Math.sin(now / 11000) * 0.08),
      ctx.currentTime,
      0.8,
    );
    // The existing outdoor noise voice doubles as leaf rustle; no per-tree loops.
    outdoor.filter.frequency.setTargetAtTime(inside ? 500 : 780 + Math.sin(now / 4500) * 180, ctx.currentTime, 1.2);
    indoor.gain.gain.setTargetAtTime(
      zone === "warehouse"
        ? 0.024
        : zone === "cashier"
          ? 0.04
          : inside
            ? 0.036
            : zone === "loading"
              ? 0.009
              : 0.002,
      ctx.currentTime,
      0.8,
    );
    if (previousInside !== inside) {
      if (inside && now - entranceAt > 5000 && Math.abs(x) < 2.5 && z > 1) {
        playCue("entrance");
        entranceAt = now;
      }
      previousInside = inside;
    }
    if (now > nextChatter) {
      nextChatter =
        now +
        (9000 + Math.random() * 11000) /
          (activity *
            (1 +
              (zone === "retail" || zone === "cashier" ? useReactiveWorld.getState().store : 0) *
                0.25));
      const nearby = dynamicInteractables().filter(
        (npc) =>
          npc.radius > 0 &&
          npc.id !== game.activeNpc &&
          Math.hypot(npc.position[0] - x, npc.position[2] - z) < 7,
      );
      const npc = nearby[Math.floor(Math.random() * nearby.length)];
      if (npc && game.overlay === "none")
        playCue("greeting", distanceGain(Math.hypot(npc.position[0] - x, npc.position[2] - z), 9));
    }
    // The ridden vehicle has its own per-frame engine voice (ride-engine.ts).
    const riding = rideAudioId();
    const selected = [...trafficVehicles.entries()]
      .filter(([id]) => id !== `ride-${riding}`)
      .map(([id, v]) => ({ id, v, distance: Math.hypot(v.x - x, v.z - z) }))
      .filter(({ distance }) => distance < 36)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    for (const [id, engine] of engines) {
      if (!selected.some((v) => v.id === id)) {
        engine.motor.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        engine.tires.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        if (engine.motor.gain.gain.value < 0.0002) {
          engine.motor.stop();
          engine.tires.stop();
          engines.delete(id);
        }
      }
    }
    const crowdGain = 1 / Math.sqrt(Math.max(1, selected.length));
    for (const { id, v, distance } of selected) {
      const sound = vehicleSound(v.speed, v.kind);
      const level = distanceGain(distance, 36) * (inside ? 0.18 : 1) * crowdGain;
      let engine = engines.get(id);
      if (!engine && engines.size < 3) {
        engine = {
          motor: loop("vehicle", sound.cutoff, false, sound.pitch),
          tires: loop("vehicle", 1800, true),
        };
        engines.set(id, engine);
      }
      if (!engine) continue;
      (engine.motor.source as OscillatorNode).frequency.setTargetAtTime(
        sound.pitch,
        ctx.currentTime,
        0.2,
      );
      engine.motor.filter.frequency.setTargetAtTime(sound.cutoff, ctx.currentTime, 0.2);
      engine.motor.gain.gain.setTargetAtTime(sound.motor * level, ctx.currentTime, 0.2);
      engine.tires.gain.gain.setTargetAtTime(sound.tires * level, ctx.currentTime, 0.2);
    }
  };
  const timer = window.setInterval(tick, 200);
  const visibility = () => {
    if (document.hidden) stopLoops();
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", visibility);
    stopLoops();
  };
}
