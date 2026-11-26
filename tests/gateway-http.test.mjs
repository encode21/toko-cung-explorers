import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/services/world/gateway-http.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { clientIp, rateLimitMessage } = await import("data:text/javascript," + encodeURIComponent(js));

test("clientIp prefers Cloudflare, then nginx, then forwarded-for", () => {
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4", "x-real-ip": "9.9.9.9" })), "1.2.3.4");
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
