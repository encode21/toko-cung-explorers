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

/** Ambil hanya sebagian elemen dekorasi saat perangkat lemah. */
export function thin<T>(items: readonly T[], keepEvery = 2): readonly T[] {
  return LOW_QUALITY ? items.filter((_, i) => i % keepEvery === 0) : items;
}
