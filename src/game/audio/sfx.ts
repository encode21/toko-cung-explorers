/**
 * One-shot SFX procedural (tabrakan, rem, jejak kaki).
 * Bus terpisah dari musik — volume SFX bisa diatur sendiri.
 */

import { ensureAudioContext, getAudioContext, resumeAudioContext } from "./audio-context";
import type { VehicleKind } from "@/game/traffic/traffic-math";

const VOLUME_KEY = "tokocung-explorers-sfx-volume";
const BUS_PEAK = 0.85;

let sfxBus: GainNode | null = null;
let lastImpactAt = 0;
let volume = 0.85;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function loadVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw != null) return clamp01(Number(raw));
  } catch {
    /* ignore */
  }
  return 0.85;
}

function saveVolume(value: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    /* ignore */
  }
}

function applyBusGain() {
  if (sfxBus) sfxBus.gain.value = volume * BUS_PEAK;
}

function bus() {
  const ctx = ensureAudioContext();
  if (!sfxBus) {
    volume = loadVolume();
    sfxBus = ctx.createGain();
    applyBusGain();
    sfxBus.connect(ctx.destination);
  }
  return { ctx, bus: sfxBus };
}

export function setSfxVolume(next: number) {
  volume = clamp01(next);
  saveVolume(volume);
  if (!sfxBus) {
    // Siapkan bus supaya preferensi langsung terpasang.
    try {
      bus();
    } catch {
      /* ignore sampai gesture unlock */
    }
  } else {
    applyBusGain();
  }
}

export function getSfxVolume() {
  return typeof window !== "undefined" ? (sfxBus ? volume : loadVolume()) : volume;
}

function noiseBurst(ctx: AudioContext, destination: AudioNode, duration: number, peak: number, lowpass: number) {
  const samples = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(destination);
  src.start();
  src.stop(now + duration + 0.02);
}

function thump(ctx: AudioContext, destination: AudioNode, freq: number, peak: number, duration: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const g = ctx.createGain();
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), now + duration);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(destination);
  osc.start();
  osc.stop(now + duration + 0.02);
}

/** Bunyi tabrakan — truk lebih berat/keras dari mobil. */
export async function playImpactSfx(kind: VehicleKind = "car") {
  try {
    await resumeAudioContext();
  } catch {
    return;
  }
  const audio = getAudioContext();
  if (!audio) return;
  const nowMs = performance.now();
  if (nowMs - lastImpactAt < 180) return;
  lastImpactAt = nowMs;

  const { ctx, bus: out } = bus();
  const truck = kind === "truck";
  noiseBurst(ctx, out, truck ? 0.28 : 0.18, truck ? 0.55 : 0.38, truck ? 520 : 900);
  noiseBurst(ctx, out, 0.08, truck ? 0.28 : 0.2, 2400);
  thump(ctx, out, truck ? 72 : 95, truck ? 0.7 : 0.48, truck ? 0.35 : 0.22);
  thump(ctx, out, truck ? 140 : 180, truck ? 0.28 : 0.2, 0.12);
}

/** Rem singkat (opsional, pelan). */
export async function playBrakeSfx() {
  try {
    await resumeAudioContext();
  } catch {
    return;
  }
  if (!getAudioContext()) return;
  const { ctx, bus: out } = bus();
  noiseBurst(ctx, out, 0.22, 0.12, 1800);
  thump(ctx, out, 220, 0.08, 0.15);
}

let lastStepAt = 0;
let stepSide = 0;

/** Jejak kaki pelan — kiri/kanan sedikit beda pitch. */
export function playFootstepSfx(intensity = 1) {
  const audio = getAudioContext();
  if (!audio || audio.state !== "running") {
    void resumeAudioContext().catch(() => undefined);
    return;
  }
  const nowMs = performance.now();
  if (nowMs - lastStepAt < 90) return;
  lastStepAt = nowMs;

  const { ctx, bus: out } = bus();
  const side = stepSide++ % 2;
  const amp = 0.045 + Math.min(1, intensity) * 0.055;
  const base = side === 0 ? 95 : 108;
  const jitter = (Math.random() - 0.5) * 12;
  noiseBurst(ctx, out, 0.05, amp * 0.55, 1400 + side * 200);
  thump(ctx, out, base + jitter, amp, 0.07);
}
