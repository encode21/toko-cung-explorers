/**
 * Ambient life-sim backsound (nuansa The Sims / cozy sim).
 * Procedural Web Audio — tanpa file MP3, autoplay setelah gesture user.
 */

import { ensureAudioContext, resumeAudioContext } from "./audio-context";

const MUTE_KEY = "tokocung-explorers-music-muted";
const VOLUME_KEY = "tokocung-explorers-bgm-volume";
const MASTER_PEAK = 0.55;

type Voice = {
  stop: (when?: number) => void;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let padGain: GainNode | null = null;
let timer: number | null = null;
let started = false;
let volume = 0.7;
let step = 0;

/** Progression cozy jazz-pop: I∆7 − vi7 − IV∆7 − V7sus */
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 349.23],
  [196.0, 246.94, 293.66, 392.0],
];

const BASS = [130.81, 110.0, 87.31, 98.0];
const LEAD = [523.25, 587.33, 659.25, 698.46, 783.99, 659.25, 587.33, 523.25];

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function loadVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw != null) return clamp01(Number(raw));
    // Migrasi preferensi mute lama.
    if (localStorage.getItem(MUTE_KEY) === "1") return 0;
  } catch {
    /* ignore */
  }
  return 0.7;
}

function saveVolume(value: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(value));
    localStorage.setItem(MUTE_KEY, value <= 0.001 ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function targetGain() {
  return started ? volume * MASTER_PEAK : 0;
}

function applyMasterGain(ramp = 0.25) {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(targetGain(), ctx.currentTime + ramp);
}

function ensureGraph() {
  if (ctx && master) return ctx;
  ctx = ensureAudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  padGain = ctx.createGain();
  padGain.gain.value = 0.045;
  padGain.connect(master);
  volume = loadVolume();
  return ctx;
}

function envGain(destination: AudioNode, attack: number, hold: number, release: number, peak: number) {
  if (!ctx) return null;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(destination);
  return g;
}

function tone(
  freq: number,
  type: OscillatorType,
  destination: AudioNode,
  attack: number,
  hold: number,
  release: number,
  peak: number,
  detune = 0,
): Voice | null {
  if (!ctx) return null;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const g = envGain(destination, attack, hold, release, peak);
  if (!g) return null;
  osc.connect(g);
  osc.start();
  const stopAt = ctx.currentTime + attack + hold + release + 0.05;
  osc.stop(stopAt);
  return { stop: (when) => osc.stop(when ?? stopAt) };
}

function playPad(chord: number[]) {
  if (!ctx || !padGain) return;
  for (const f of chord) {
    tone(f, "sine", padGain, 0.35, 1.6, 1.2, 0.22, -4);
    tone(f * 0.5, "triangle", padGain, 0.4, 1.6, 1.3, 0.1, 3);
  }
}

function playBass(freq: number) {
  if (!ctx || !master) return;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 280;
  filter.connect(master);
  tone(freq, "triangle", filter, 0.02, 0.22, 0.28, 0.16);
  tone(freq * 0.5, "sine", filter, 0.02, 0.22, 0.3, 0.1);
}

function playLead(freq: number, soft: boolean) {
  if (!ctx || !master) return;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = soft ? 1400 : 2200;
  filter.Q.value = 0.7;
  filter.connect(master);
  tone(freq, "triangle", filter, 0.01, soft ? 0.12 : 0.08, 0.22, soft ? 0.07 : 0.09, 6);
  tone(freq * 2, "sine", filter, 0.01, 0.06, 0.18, 0.03);
}

function playHat() {
  if (!ctx || !master) return;
  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6000;
  const g = envGain(master, 0.001, 0.01, 0.04, 0.035);
  if (!g) return;
  src.connect(filter);
  filter.connect(g);
  src.start();
}

function scheduleBar() {
  if (!ctx || !master || volume <= 0.001) return;
  const chordIndex = Math.floor(step / 8) % CHORDS.length;
  const beat = step % 8;
  const chord = CHORDS[chordIndex]!;

  if (beat === 0) playPad(chord);
  if (beat % 2 === 0) playBass(BASS[chordIndex]!);
  if (beat === 0 || beat === 3 || beat === 5) playLead(LEAD[(step + chordIndex) % LEAD.length]!, beat !== 0);
  if (beat === 2 || beat === 6) playHat();

  step += 1;
}

/** Mulai loop ambient setelah gesture (klik/tap/tombol). */
export async function startAmbientMusic() {
  await resumeAudioContext();
  ensureGraph();
  if (!ctx || !master) return;
  if (started) {
    applyMasterGain(0.4);
    return;
  }
  started = true;
  volume = loadVolume();
  master.gain.setValueAtTime(0, ctx.currentTime);
  applyMasterGain(1.2);
  timer = window.setInterval(scheduleBar, 168);
  scheduleBar();
}

export function stopAmbientMusic() {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  }
  started = false;
  step = 0;
}

export function setAmbientVolume(next: number) {
  volume = clamp01(next);
  saveVolume(volume);
  ensureGraph();
  applyMasterGain(0.2);
}

export function getAmbientVolume() {
  return typeof window !== "undefined" ? (started || ctx ? volume : loadVolume()) : volume;
}

/** @deprecated gunakan setAmbientVolume — tetap ada untuk kompatibilitas mute toggle. */
export function setAmbientMuted(next: boolean) {
  setAmbientVolume(next ? 0 : volume > 0.001 ? volume : 0.7);
}

export function isAmbientMuted() {
  return getAmbientVolume() <= 0.001;
}

export function isAmbientStarted() {
  return started;
}
