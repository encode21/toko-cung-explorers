// Self-hosted realtime relay for World rooms: broadcast + presence, authorized by the
// HS256 lease token Laravel already signs (WorldChannels::signRealtimeToken).
// Also serves POST /realtime/v1/api/broadcast so Laravel's GM chat works unchanged.
import crypto from "node:crypto";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

/** Returns claims for a valid, unexpired World realtime token; otherwise null. */
export function verifyToken(token, secret, nowSec = Date.now() / 1000) {
  if (typeof token !== "string" || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = b64url(
    crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest(),
  );
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (header.alg !== "HS256" || claims.world_realtime !== true) return null;
    if (typeof claims.exp !== "number" || claims.exp <= nowSec) return null;
    if (typeof claims.world_channel !== "string" || !claims.world_channel) return null;
    return claims;
  } catch {
    return null;
  }
}

export function createRelay({
  secret,
  maxPayload = 32 * 1024,
  ratePerSec = 50, // legit peak: pose 8/s + traffic host 25/s + missions
  burst = 100,
  sweepMs = 5000,
  joinTimeoutMs = 10000,
} = {}) {
  if (!secret) throw new Error("WORLD_REALTIME_JWT_SECRET is required");
  /** topic -> Set<ws> */
  const rooms = new Map();
  /** topic -> Map<presenceKey, { ws, meta }> */
  const presence = new Map();

  const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
  const fanout = (topic, msg, except) => {
    const data = JSON.stringify(msg);
    for (const peer of rooms.get(topic) ?? [])
      if (peer !== except && peer.readyState === 1) peer.send(data);
  };
  const presenceSync = (topic) => {
    const state = {};
    for (const [key, p] of presence.get(topic) ?? []) state[key] = p.meta;
    fanout(topic, { t: "presence", state });
  };
  const kick = (ws, code, reason) => {
    send(ws, { t: "error", reason });
    ws.close(code, reason);
  };
  const leave = (ws) => {
    const s = ws.session;
    if (!s?.topic) return;
    rooms.get(s.topic)?.delete(ws);
    if (!rooms.get(s.topic)?.size) rooms.delete(s.topic);
    const map = presence.get(s.topic);
    // A reconnect may already own this key: only the current owner removes it.
    if (map?.get(s.key)?.ws === ws) {
      map.delete(s.key);
      if (!map.size) presence.delete(s.topic);
      presenceSync(s.topic);
    }
    s.topic = null;
  };

  const handle = (ws, raw) => {
    const s = ws.session;
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (!m || typeof m.t !== "string") return;
    if (m.t === "join") {
      const claims = verifyToken(m.token, secret);
      if (!claims) return kick(ws, 4001, "unauthorized");
      if (m.topic !== `world:${claims.world_channel}`) return kick(ws, 4003, "topic_not_allowed");
      if (typeof m.key !== "string" || !m.key || m.key.length > 80)
        return kick(ws, 4004, "bad_key");
      if (s.topic) leave(ws);
      clearTimeout(s.joinTimer);
      Object.assign(s, {
        topic: m.topic,
        key: m.key,
        exp: claims.exp,
        channel: claims.world_channel,
        connection: claims.connection_id,
      });
      if (!rooms.has(m.topic)) rooms.set(m.topic, new Set());
      rooms.get(m.topic).add(ws);
      send(ws, { t: "joined" });
      const state = {};
      for (const [key, p] of presence.get(m.topic) ?? []) state[key] = p.meta;
      send(ws, { t: "presence", state });
      return;
    }
    if (!s.topic) return;
    if (m.t === "auth") {
      const claims = verifyToken(m.token, secret);
      // A refreshed lease must belong to the same room and connection.
      if (!claims || claims.world_channel !== s.channel || claims.connection_id !== s.connection)
        return kick(ws, 4001, "unauthorized");
      s.exp = claims.exp;
      return;
    }
    // Token bucket: excess messages are dropped, the socket stays open.
    const now = Date.now();
    s.tokens = Math.min(burst, s.tokens + ((now - s.refill) / 1000) * ratePerSec);
    s.refill = now;
    if (s.tokens < 1) return send(ws, { t: "ack", ref: m.ref, status: "rate limited" });
    s.tokens -= 1;
    if (m.t === "bc" && typeof m.event === "string") {
      fanout(s.topic, { t: "bc", event: m.event, payload: m.payload ?? null }, ws);
    } else if (m.t === "track" && m.meta && typeof m.meta === "object") {
      if (!presence.has(s.topic)) presence.set(s.topic, new Map());
      presence.get(s.topic).set(s.key, { ws, meta: m.meta });
      presenceSync(s.topic);
    }
  };

  const readBody = (req, limit) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > limit) {
          reject(new Error("too_large"));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString()));
      req.on("error", reject);
    });

  const server = http.createServer(async (req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && (req.url === "/health" || req.url === "/realtime/health")) {
      return reply(200, { ok: true, rooms: rooms.size });
    }
    if (req.method === "POST" && req.url === "/realtime/v1/api/broadcast") {
      const claims = verifyToken((req.headers.authorization ?? "").replace(/^Bearer /, ""), secret);
      if (!claims) return reply(401, { error: "unauthorized" });
      let body;
      try {
        body = JSON.parse(await readBody(req, 64 * 1024));
      } catch {
        return reply(400, { error: "bad_request" });
      }
      const messages = Array.isArray(body?.messages) ? body.messages : [];
      if (
        !messages.length ||
        messages.some(
          (m) => m?.topic !== `world:${claims.world_channel}` || typeof m.event !== "string",
        )
      )
        return reply(403, { error: "topic_not_allowed" });
      for (const m of messages)
        fanout(m.topic, { t: "bc", event: m.event, payload: m.payload ?? null });
      return reply(202, {});
    }
    reply(404, { error: "not_found" });
  });

  const wss = new WebSocketServer({ server, path: "/realtime/ws", maxPayload });
  wss.on("connection", (ws) => {
    ws.session = { topic: null, tokens: burst, refill: Date.now(), alive: true };
    ws.session.joinTimer = setTimeout(
      () => !ws.session.topic && kick(ws, 4001, "join_timeout"),
      joinTimeoutMs,
    );
    ws.on("pong", () => (ws.session.alive = true));
    ws.on("message", (raw) => handle(ws, raw.toString()));
    ws.on("close", () => {
      clearTimeout(ws.session.joinTimer);
      leave(ws);
    });
    ws.on("error", () => ws.terminate());
  });

  // Expired leases are closed like Supabase does; dead sockets are dropped via ping/pong.
  let tick = 0;
  const sweeper = setInterval(() => {
    const nowSec = Date.now() / 1000;
    const ping = ++tick % Math.max(1, Math.round(25000 / sweepMs)) === 0;
    for (const ws of wss.clients) {
      if (ws.session.topic && ws.session.exp <= nowSec) kick(ws, 4002, "token_expired");
      else if (ping) {
        if (!ws.session.alive) ws.terminate();
        else {
          ws.session.alive = false;
          ws.ping();
        }
      }
    }
  }, sweepMs);

  return {
    server,
    close: () =>
      new Promise((resolve) => {
        clearInterval(sweeper);
        for (const ws of wss.clients) ws.terminate();
        wss.close(() => server.close(() => resolve()));
      }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.REALTIME_PORT ?? 8091);
  const relay = createRelay({ secret: process.env.WORLD_REALTIME_JWT_SECRET });
  relay.server.listen(port, () => console.log(`[relay] listening on :${port}`));
  const stop = () => relay.close().then(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
