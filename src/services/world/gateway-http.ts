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
  if (!Number.isFinite(seconds) || seconds <= 0)
    return "Lagi ramai nih. Tunggu sebentar, lalu coba lagi ya.";
  const wait = seconds >= 90 ? `${Math.ceil(seconds / 60)} menit` : `${Math.ceil(seconds)} detik`;
  return `Lagi ramai nih. Coba lagi dalam ${wait} ya.`;
}

/** Player-facing text when the Laravel API cannot be reached; details go to server logs only. */
export const UNREACHABLE_MESSAGE = "Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.";

// URLs, env names, SQL/PHP errors or stack frames must never reach players.
const INTERNAL_DETAIL =
  /https?:\/\/|[A-Z][A-Z0-9]*_[A-Z0-9_]+|SQLSTATE|Exception|\.php\b|\bat \S+:\d+|fetch failed|ECONN|ETIMEDOUT|ENOTFOUND/;

/** Message for a non-OK Laravel response: keep its own copy unless it is a crash or leaks internals. */
export function backendErrorMessage(status: number, serverMessage: string): string {
  const message = serverMessage.trim();
  // 503 carries Laravel's deliberate "service not ready" copy; other 5xx are crashes.
  if (message && (status < 500 || status === 503) && !INTERNAL_DETAIL.test(message)) return message;
  return status >= 500 ? UNREACHABLE_MESSAGE : "Permintaan tidak dapat diproses.";
}
