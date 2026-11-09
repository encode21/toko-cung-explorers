// node --test relay/  — relay server + browser adapter against a real socket.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, test } from "node:test";
import { createRelay, verifyToken } from "./server.mjs";
import { RelayChannel } from "../src/net/relay.ts";

const SECRET = "test-secret";
const sign = (claims, secret = SECRET) => {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${enc({ alg: "HS256", typ: "JWT" })}.${enc(claims)}`;
  return `${unsigned}.${crypto.createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
};
const token = (channel = "ch-1", conn = "c1", ttl = 90) =>
  sign({
    world_realtime: true,
    world_channel: channel,
    connection_id: conn,
    exp: Math.floor(Date.now() / 1000) + ttl,
  });

let relay;
let url;
before(async () => {
  relay = createRelay({ secret: SECRET, sweepMs: 200, ratePerSec: 5, burst: 5 });
  await new Promise((r) => relay.server.listen(0, r));
  url = `ws://127.0.0.1:${relay.server.address().port}/realtime/ws`;
});
after(() => relay.close());

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function join(topic, key, tok) {
  const ch = new RelayChannel(url, topic, key, () => tok);
  return new Promise((resolve) => ch.subscribe((status, err) => resolve({ ch, status, err })));
}

test("verifyToken accepts valid tokens and rejects tampered, expired or foreign ones", () => {
  assert.equal(verifyToken(token(), SECRET).world_channel, "ch-1");
  assert.equal(verifyToken(token("ch-1", "c1", -1), SECRET), null);
  assert.equal(
    verifyToken(sign({ world_realtime: true, world_channel: "x", exp: 9e9 }, "other"), SECRET),
    null,
  );
  assert.equal(verifyToken(sign({ world_channel: "x", exp: 9e9 }), SECRET), null);
  assert.equal(verifyToken(token().slice(0, -2) + "xx", SECRET), null);
});

test("broadcast reaches peers but not the sender; presence syncs and clears on leave", async () => {
  const a = await join("world:ch-1", "pa", token("ch-1", "a"));
  const b = await join("world:ch-1", "pb", token("ch-1", "b"));
  assert.equal(a.status, "SUBSCRIBED");
  const gotA = [];
  const gotB = [];
  a.ch.on("broadcast", { event: "state" }, ({ payload }) => gotA.push(payload));
  b.ch.on("broadcast", { event: "state" }, ({ payload }) => gotB.push(payload));
  assert.equal(await a.ch.send({ type: "broadcast", event: "state", payload: { x: 1 } }), "ok");
  await a.ch.track({ name: "A" });
  await b.ch.track({ name: "B" });
  await wait(100);
  assert.deepEqual(gotB, [{ x: 1 }]);
  assert.deepEqual(gotA, []);
  assert.deepEqual(Object.keys(b.ch.presenceState()).sort(), ["pa", "pb"]);
  assert.equal(b.ch.presenceState().pa[0].name, "A");
  a.ch.close();
  await wait(100);
  assert.deepEqual(Object.keys(b.ch.presenceState()), ["pb"]);
  b.ch.close();
});

test("rooms are isolated and a token cannot join another room", async () => {
  const bad = await join("world:ch-2", "px", token("ch-1", "x"));
  assert.equal(bad.status, "CHANNEL_ERROR");
  assert.match(bad.err.message, /topic_not_allowed/);
  const forged = await join(
    "world:ch-1",
    "py",
    sign({ world_realtime: true, world_channel: "ch-1", exp: 9e9 }, "nope"),
  );
  assert.equal(forged.status, "CHANNEL_ERROR");
});

test("expired lease is closed; refreshed lease keeps the socket open", async () => {
  const stale = await join("world:ch-3", "p1", token("ch-3", "s", 1));
  const kept = { tok: token("ch-3", "k", 1) };
  const ch = new RelayChannel(url, "world:ch-3", "p2", () => kept.tok);
  const statuses = [];
  await new Promise((r) => ch.subscribe((s) => (statuses.push(s), r())));
  kept.tok = token("ch-3", "k", 90);
  ch.refreshAuth();
  await wait(2200); // both 1s tokens are past exp; the sweeper runs every 200ms
  assert.equal(stale.ch.state, "closed");
  assert.equal(ch.state, "joined");
  assert.deepEqual(statuses, ["SUBSCRIBED"]);
  ch.close();
});

test("excess messages are dropped without disconnecting", async () => {
  const a = await join("world:ch-4", "pa", token("ch-4", "a"));
  const b = await join("world:ch-4", "pb", token("ch-4", "b"));
  let n = 0;
  b.ch.on("broadcast", { event: "spam" }, () => n++);
  for (let i = 0; i < 20; i++) await a.ch.send({ type: "broadcast", event: "spam", payload: i });
  await wait(100);
  assert.ok(n >= 5 && n < 20, `delivered ${n}`);
  assert.equal(a.ch.state, "joined");
  a.ch.close();
  b.ch.close();
});

test("Laravel GM chat endpoint broadcasts only to the token's room", async () => {
  const p = await join("world:ch-5", "pa", token("ch-5", "a"));
  const got = [];
  p.ch.on("broadcast", { event: "chat" }, ({ payload }) => got.push(payload));
  const base = url.replace("ws://", "http://").replace("/realtime/ws", "");
  const post = (tok, topic) =>
    fetch(`${base}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tok}`,
        apikey: "ignored",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic, event: "chat", private: true, payload: { text: "halo" } }],
      }),
    });
  assert.equal((await post(token("ch-5", "gm"), "world:ch-5")).status, 202);
  assert.equal((await post(token("ch-5", "gm"), "world:ch-6")).status, 403);
  assert.equal((await post("bad", "world:ch-5")).status, 401);
  assert.equal((await fetch(`${base}/health`)).status, 200);
  await wait(100);
  assert.deepEqual(got, [{ text: "halo" }]);
  p.ch.close();
});
