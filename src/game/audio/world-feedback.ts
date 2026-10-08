import { vehicleSound } from "./vehicle-sound";
import { getAudioContext } from "./audio-context";
import { audioAudible, audioBus } from "./audio-manager";
import { audioZoneAt, distanceGain } from "./world-acoustics";
import { playCue, sharedNoise } from "./sound-palette";
import { useGame } from "@/state/game-store";
import { useSceneTime } from "@/game/time/scene-time";
import { dynamicInteractables } from "@/game/interactions/dynamic";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";

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
  let nextChatter = 0;
  let previousInside = useGame.getState().inside;
  let entranceAt = 0;
  const stopLoops = () => {
    outdoor?.stop();
    indoor?.stop();
    outdoor = indoor = undefined;
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
    const [x, , z] = game.playerPos;
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
      nextChatter = now + (9000 + Math.random() * 11000) / activity;
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
    const selected = [...trafficVehicles.entries()]
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
