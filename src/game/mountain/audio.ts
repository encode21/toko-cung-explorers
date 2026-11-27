import { getAudioContext } from "@/game/audio/audio-context";
import {
  audioAudible,
  audioBus,
  useAudioSettings,
  worldAudioAudible,
} from "@/game/audio/audio-manager";
import { playTransportSound } from "@/game/audio/transport-sounds";

export type MountainCue = "checkpoint" | "summit" | "flashlight" | "flight";
let voices = 0;
const MAX_VOICES = 8;

/** Mountain actions share the game's audio preferences. */
export function playMountainCue(cue: MountainCue, flightSeconds = 2.6) {
  const ctx = getAudioContext();
  if (!ctx || !audioAudible()) return;
  const settings = useAudioSettings.getState();
  if (cue === "flight" ? !worldAudioAudible() || settings.vehicle <= 0 : settings.sfx <= 0) return;
  const t = ctx.currentTime;
  const note = (
    frequency: number,
    offset: number,
    duration: number,
    level: number,
    type: OscillatorType = "sine",
  ) => {
    if (voices >= MAX_VOICES) return;
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, t + offset);
    gain.gain.setValueAtTime(0, t + offset);
    gain.gain.linearRampToValueAtTime(level, t + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + duration);
    source.connect(gain).connect(audioBus("sfx"));
    voices++;
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      voices--;
    };
    source.start(t + offset);
    source.stop(t + offset + duration + 0.02);
  };

  if (cue === "checkpoint") {
    note(784, 0, 0.24, 0.055);
    note(1174.66, 0.13, 0.38, 0.045);
  } else if (cue === "summit") {
    note(523.25, 0, 0.38, 0.04);
    note(659.25, 0.14, 0.42, 0.04);
    note(783.99, 0.28, 0.5, 0.04);
    note(1046.5, 0.42, 0.7, 0.035);
  } else if (cue === "flashlight") {
    note(460, 0, 0.045, 0.025, "triangle");
  } else {
    const output = audioBus("vehicle");
    if (
      playTransportSound(ctx, output, "helicopter", 0.24, {
        maxSeconds: flightSeconds,
        release: 0.18,
      })
    )
      return;
    if (voices >= MAX_VOICES) return;
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const rotor = ctx.createOscillator();
    const rotorGain = ctx.createGain();
    source.type = "sawtooth";
    source.frequency.setValueAtTime(48, t);
    source.frequency.linearRampToValueAtTime(78, t + 1.1);
    filter.type = "lowpass";
    filter.frequency.value = 230;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.055, t + 0.2);
    gain.gain.setValueAtTime(0.055, t + 1.2);
    gain.gain.linearRampToValueAtTime(0, t + 1.7);
    rotor.frequency.setValueAtTime(14, t);
    rotor.frequency.linearRampToValueAtTime(22, t + 1.2);
    rotorGain.gain.setValueAtTime(0, t);
    rotorGain.gain.linearRampToValueAtTime(0.018, t + 0.2);
    rotorGain.gain.setValueAtTime(0.018, t + 1.2);
    rotorGain.gain.linearRampToValueAtTime(0, t + 1.7);
    rotor.connect(rotorGain).connect(gain.gain);
    source.connect(filter).connect(gain).connect(output);
    voices++;
    source.onended = () => {
      source.disconnect();
      rotor.disconnect();
      rotorGain.disconnect();
      filter.disconnect();
      gain.disconnect();
      voices--;
    };
    source.start(t);
    rotor.start(t);
    source.stop(t + 1.72);
    rotor.stop(t + 1.72);
  }
}
