/**
 * Official Toko Cung App destinations.
 * Universal / App Links: https://tokocung.com (mobileapp deep_link_service).
 * Store IDs match mobileapp update_version_bottom_sheet.
 */
export const APP_LINK = resolveHttps(
  typeof import.meta !== "undefined" ? import.meta.env?.["VITE_TOKO_CUNG_APP_URL"] : undefined,
  "https://tokocung.com",
);
export const PLAY_STORE = resolveHttps(
  typeof import.meta !== "undefined" ? import.meta.env?.["VITE_TOKO_CUNG_PLAY_STORE"] : undefined,
  "https://play.google.com/store/apps/details?id=com.tokocung.membershipapp",
);
export const APP_STORE = resolveHttps(
  typeof import.meta !== "undefined" ? import.meta.env?.["VITE_TOKO_CUNG_APP_STORE"] : undefined,
  "https://apps.apple.com/app/id6502242378",
);
export const ANDROID_PACKAGE = "com.tokocung.membershipapp";

function resolveHttps(value: unknown, fallback: string) {
  return typeof value === "string" && /^https:\/\//i.test(value) ? value : fallback;
}

export type AppPlatform = "ios" | "android" | "other";

export function detectAppPlatform(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  touchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
): AppPlatform {
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (platform === "MacIntel" && touchPoints > 1) return "ios";
  return "other";
}

export function storeUrlForPlatform(platform: AppPlatform) {
  if (platform === "ios") return APP_STORE;
  if (platform === "android") return PLAY_STORE;
  return APP_LINK;
}

export function androidAppIntent(storeUrl = PLAY_STORE) {
  return (
    `intent://tokocung.com/#Intent;scheme=https;package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(storeUrl)};end`
  );
}
