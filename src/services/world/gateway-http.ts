/** Pure helpers for the Laravel gateway (no server imports, so tests can load them). */

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

/** Player IP as seen by Cloudflare / nginx in front of this server. */
export function clientIp(headers: Headers): string | null {
  // shortcut: trusts cf-connecting-ip, so a caller hitting the origin directly can pick its own
  // throttle bucket; lock the origin to Cloudflare IPs if that becomes a problem.
  const raw =
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0] ||
    "";
  const ip = raw.trim();
  return ip && (IPV4.test(ip) || (ip.includes(":") && IPV6.test(ip))) ? ip : null;
}

/** Player-facing text for HTTP 429, using Laravel's Retry-After (seconds). */
export function rateLimitMessage(retryAfter: string | null): string {
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return "Lagi ramai nih. Tunggu sebentar, lalu coba lagi ya.";
  const wait = seconds >= 90 ? `${Math.ceil(seconds / 60)} menit` : `${Math.ceil(seconds)} detik`;
  return `Lagi ramai nih. Coba lagi dalam ${wait} ya.`;
}
