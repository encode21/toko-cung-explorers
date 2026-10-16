import assert from "node:assert/strict";
import {
  androidAppIntent,
  detectAppPlatform,
  storeUrlForPlatform,
} from "../src/lib/app-bridge-targets.ts";

assert.equal(detectAppPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "ios");
assert.equal(detectAppPlatform("Mozilla/5.0 (Linux; Android 14)"), "android");
assert.equal(detectAppPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"), "other");
assert.equal(detectAppPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)", 5, "MacIntel"), "ios");

assert.match(storeUrlForPlatform("ios"), /apps\.apple\.com\/app\/id6502242378/);
assert.match(storeUrlForPlatform("android"), /id=com\.tokocung\.membershipapp/);
assert.match(storeUrlForPlatform("other"), /^https:\/\/tokocung\.com$/);
assert.match(androidAppIntent(), /package=com\.tokocung\.membershipapp/);
assert.match(androidAppIntent(), /browser_fallback_url/);

console.log("PASS app-bridge platform + store destinations");
