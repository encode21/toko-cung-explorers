import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/services/world/gateway-http.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { clientIp, rateLimitMessage, backendErrorMessage, UNREACHABLE_MESSAGE } = await import(
  "data:text/javascript," + encodeURIComponent(js)
);

test("clientIp prefers Cloudflare, then nginx, then forwarded-for", () => {
  assert.equal(
    clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4", "x-real-ip": "9.9.9.9" })),
    "1.2.3.4",
  );
  assert.equal(clientIp(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" })), "5.6.7.8");
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "2001:db8::1" })), "2001:db8::1");
});

test("clientIp rejects junk", () => {
  assert.equal(clientIp(new Headers()), null);
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4; drop" })), null);
  assert.equal(clientIp(new Headers({ "x-real-ip": "not-an-ip" })), null);
});

test("rateLimitMessage is Indonesian and uses Retry-After", () => {
  assert.equal(rateLimitMessage("42"), "Lagi ramai nih. Coba lagi dalam 42 detik ya.");
  assert.equal(rateLimitMessage("600"), "Lagi ramai nih. Coba lagi dalam 10 menit ya.");
  assert.match(rateLimitMessage(null), /Tunggu sebentar/);
  assert.doesNotMatch(rateLimitMessage("abc"), /Too Many/);
});

test("backendErrorMessage keeps Laravel copy but never leaks internals", () => {
  assert.equal(backendErrorMessage(422, "Nama sudah dipakai."), "Nama sudah dipakai.");
  assert.equal(
    backendErrorMessage(503, "Layanan World sedang disiapkan."),
    "Layanan World sedang disiapkan.",
  );
  assert.equal(backendErrorMessage(500, "Undefined index: foo"), UNREACHABLE_MESSAGE);
  assert.equal(
    backendErrorMessage(503, "Tidak terjangkau https://cashier.tokocung.com (fetch failed)."),
    UNREACHABLE_MESSAGE,
  );
  assert.equal(backendErrorMessage(503, "Cek TOKO_CUNG_API_URL"), UNREACHABLE_MESSAGE);
  assert.equal(
    backendErrorMessage(400, "SQLSTATE[23000]: Integrity constraint"),
    "Permintaan tidak dapat diproses.",
  );
  assert.equal(backendErrorMessage(404, "  "), "Permintaan tidak dapat diproses.");
  assert.doesNotMatch(UNREACHABLE_MESSAGE, /https?:|_URL|Laravel|fetch/);
});
