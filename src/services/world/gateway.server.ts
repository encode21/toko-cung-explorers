import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import type { ApiResult } from "./contracts";
const cookie = import.meta.env.PROD ? "__Host-tc_world" : "tc_world";

/** DEV-only: loopback or RFC1918 so LAN multi-device can reach a local Laravel HTTP API. */
function isDevTrustedBackendHost(hostname: string) {
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return true;
  if (/^10(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(hostname)) return true;
  const m = /^172\.(\d{1,3})\./.exec(hostname);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function assertOrigin() {
  const request = getRequest();
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const configured = process.env["WORLD_ORIGIN"] || "";
  // Production: exact WORLD_ORIGIN only. DEV: also accept the URL the browser actually hit
  // (localhost vs LAN IP) so phones/laptops can share one Vite process.
  const allowed = import.meta.env.DEV
    ? new Set([configured, requestOrigin].filter(Boolean))
    : new Set(configured ? [configured] : []);
  if (!origin || !allowed.has(origin)) throw new Error("Permintaan lintas situs ditolak.");
}
export function clearAccountCookie() {
  deleteCookie(cookie, {
    path: "/",
    secure: import.meta.env.PROD,
    httpOnly: true,
    sameSite: "lax",
  });
}
export function accountToken() {
  return getCookie(cookie);
}
export function saveAccountCookie(token: string, seconds: number) {
  setCookie(cookie, token, {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: Math.min(seconds, 86400),
  });
}
export async function backend(
  path: string,
  method = "GET",
  data?: unknown,
  token = accountToken(),
): Promise<ApiResult> {
  const base = process.env["TOKO_CUNG_API_URL"];
  if (!base) return { ok: false, status: 503, message: "Layanan akun Toko Cung belum tersedia." };
  const url = new URL(base);
  if (url.protocol !== "https:" && !(import.meta.env.DEV && isDevTrustedBackendHost(url.hostname)))
    return { ok: false, status: 503, message: "Konfigurasi layanan akun belum siap." };
  try {
    const response = await fetch(base.replace(/\/$/, "") + "/api/world/" + path, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) clearAccountCookie();
      const serverMessage =
        typeof body?.message === "string" && body.message.trim() ? body.message.trim() : "";
      return {
        ok: false,
        status: response.status,
        message:
          // Prefer Laravel's actionable message (e.g. 503 config) over a generic disconnect.
          serverMessage ||
          (response.status >= 500
            ? "Koneksi terputus. Progres dilanjutkan setelah terhubung kembali."
            : "Permintaan tidak dapat diproses."),
      };
    }
    if (body === null)
      return {
        ok: false,
        status: 503,
        message: "Layanan akun belum dapat merespons. Coba lagi sebentar.",
      };
    return { ok: true, value: body };
  } catch {
    return {
      ok: false,
      status: 503,
      message: "Koneksi terputus. Progres dilanjutkan setelah terhubung kembali.",
    };
  }
}
