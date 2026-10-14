import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/net/profile-sync.ts", import.meta.url), "utf8");
let { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
outputText = outputText.replace(/import .*? from ["'][^"']+["'];/g, "");
outputText =
  "const {normalizeAvatar,worldRequest,useNet}=globalThis.profileQueueQA;\n" + outputText;
let state = { room: "CHANNEL-01", roster: [{ id: "peer", name: "Before" }] },
  reads = 0,
  waiters = [];
globalThis.profileQueueQA = {
  normalizeAvatar: (x) => x,
  worldRequest: () => {
    reads++;
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  },
  useNet: {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
    },
  },
};
const { refreshRemoteProfile } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
const profile = {
  id: "account",
  displayName: "After",
  avatar: {},
  role: "shopper",
  updatedAt: "now",
};
const first = refreshRemoteProfile("peer");
for (let i = 0; i < 500; i++) assert.equal(refreshRemoteProfile("peer"), first);
assert.equal(reads, 1);
waiters.shift().resolve(profile);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(reads, 2);
waiters.shift().resolve({ ...profile, displayName: "Latest" });
await first;
assert.equal(reads, 2);
assert.equal(state.roster[0].name, "Latest");
const stale = refreshRemoteProfile("peer");
state = { room: "CHANNEL-02", roster: [{ id: "other", name: "Other" }] };
waiters.shift().resolve(profile);
await stale;
assert.equal(state.roster[0].name, "Other");
state = { room: "CHANNEL-02", roster: [{ id: "peer", name: "Before" }] };
const failed = refreshRemoteProfile("peer");
refreshRemoteProfile("peer");
const before = reads;
waiters.shift().reject(new Error("offline"));
await failed;
assert.equal(reads, before);
console.log(
  "PASS 500 refresh notifications coalesce to two reads; latest result, channel isolation, and failure cleanup",
);
