/** Exercise the actual chat sender with a controlled room transport; no live account. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const path = new URL("../src/net/useWorldChannel.ts", import.meta.url);
const source = ts.createSourceFile(
  path.pathname,
  await readFile(path, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const sender = source.statements.find(
  (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "sendChat",
);
assert(sender, "sendChat remains available to both composers");
const messages = [];
const state = { connected: true, pushChat: (message) => messages.push(message) };
globalThis.__chatQa = { net: { getState: () => state } };
const isolated = `
  const useNet = globalThis.__chatQa.net;
  let playerId = "chat-qa";
  export const changePlayer = () => { playerId = "new-session"; };
  ${ts.createPrinter().printNode(ts.EmitHint.Unspecified, sender, source)}
`;
const js = ts.transpileModule(isolated, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { sendChat, changePlayer } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const calls = [];
const channel = {
  state: "joined",
  send: async (message) => {
    calls.push(message);
    return "ok";
  },
};
assert.equal((await sendChat(channel, "QA", "   ")).ok, false);
assert.equal((await sendChat(null, "QA", "Draft")).ok, false);
state.connected = false;
assert.equal((await sendChat(channel, "QA", "Draft")).ok, false);
state.connected = true;
channel.state = "joining";
assert.equal((await sendChat(channel, "QA", "Draft")).ok, false);
channel.state = "joined";
assert.equal(calls.length, 0, "empty/offline/unjoined sends never reach transport");
assert.equal(messages.length, 0);

for (const status of ["error", "timed out"]) {
  channel.send = async () => status;
  const result = await sendChat(channel, "QA", "Keep this draft");
  assert.equal(result.ok, false);
  assert(result.error.length > 0);
}
channel.send = async () => {
  throw new Error("Network unavailable");
};
assert.equal((await sendChat(channel, "QA", "Keep this draft")).ok, false);
assert.equal(messages.length, 0, "failed and rejected sends never invent local messages");

let finish;
channel.send = (message) => {
  calls.push(message);
  return new Promise((resolve) => {
    finish = resolve;
  });
};
const accepted = sendChat(channel, "QA", "  " + "x".repeat(210) + "  ");
assert.equal(messages.length, 0, "local history waits for transport acceptance");
assert.equal(calls[0].event, "chat");
assert.equal(calls[0].type, "broadcast");
assert.equal(calls[0].payload.text, "x".repeat(200));
finish("ok");
assert.equal((await accepted).ok, true);
assert.equal(messages.length, 1);
assert.deepEqual(messages[0], calls[0].payload);
assert.equal(messages[0].from, "chat-qa");

const disconnected = sendChat(channel, "QA", "Connection changed");
state.connected = false;
finish("ok");
assert.equal((await disconnected).ok, false);
state.connected = true;
const leftRoom = sendChat(channel, "QA", "Old room");
channel.state = "leaving";
finish("ok");
assert.equal((await leftRoom).ok, false);
channel.state = "joined";
const oldSession = sendChat(channel, "QA", "Old player session");
changePlayer();
finish("ok");
assert.equal((await oldSession).ok, false);
assert.equal(messages.length, 1, "late completions never append into a changed room/session");
console.log("PASS chat sender: validation, offline/failure, accepted content and session guards");
