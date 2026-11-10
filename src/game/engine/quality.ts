/**
 * Deteksi perangkat berdaya rendah (ponsel/tablet) satu kali saat modul dimuat.
 * Dipakai untuk menurunkan beban render: shadow, resolusi, lampu, dan detail dunia.
 */
function detectLowQuality() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 820;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 6;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  return (coarse && smallScreen) || (coarse && (fewCores || lowMemory));
}

export const LOW_QUALITY = detectLowQuality();

export type RenderTier = "LOW" | "MEDIUM" | "HIGH";

/** Single gate for Canvas/physics/shadow features driven by adaptive tier. */
export function budgetIsLow(tier: RenderTier) {
  return tier === "LOW";
}

/** Hard shadows only; smaller maps on MEDIUM to cut fill-rate. */
export function shadowMapSize(tier: RenderTier) {
  return tier === "HIGH" ? 1024 : 512;
}

/** Canvas owns pixel ratio so a parent render cannot undo the adaptive tier. */
export function renderDpr(tier: RenderTier): [number, number] {
  return [0, tier === "LOW" ? 0.85 : tier === "MEDIUM" ? 1.15 : 1.5];
}

/** The larger mountain needs a distant sea horizon; city draw distance stays compact. */
export function outdoorViewDistance(mountain: boolean, low: boolean) {
  return mountain
    ? { far: low ? 560 : 780, fogNear: low ? 120 : 180, fogFar: low ? 520 : 720 }
    : { far: low ? 260 : 420, fogNear: low ? 60 : 80, fogFar: low ? 160 : 260 };
}

/** Ambil hanya sebagian elemen dekorasi saat perangkat lemah. */
export function thin<T>(items: readonly T[], keepEvery = 2): readonly T[] {
  return LOW_QUALITY ? items.filter((_, i) => i % keepEvery === 0) : items;
}
