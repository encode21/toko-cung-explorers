/**
 * Browser client for relay/server.mjs. Mirrors the small slice of the Supabase
 * RealtimeChannel API that the World uses, so useWorldChannel stays unchanged.
 * A closed channel is terminal (same as the SDK); room-recovery creates a new one.
 */
export type ChannelStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";
type Meta = Record<string, unknown>;
// Same looseness as Supabase's broadcast payload: handlers narrow it themselves.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Payload = any;
type ServerMessage = {
  t?: string;
  event?: string;
  payload?: Payload;
  state?: Record<string, Meta>;
  reason?: string;
};

export class RelayChannel {
  state: "closed" | "joining" | "joined" = "closed";
  readonly topic: string;
  private url: string;
  private key: string;
  private token: () => string | null;
  private ws: WebSocket | null = null;
  private broadcast = new Map<string, Array<(msg: { payload: Payload }) => void>>();
  private sync: Array<() => void> = [];
  private presence: Record<string, Meta[]> = {};
  private finished = false;

  constructor(url: string, topic: string, key: string, token: () => string | null) {
    this.url = url;
    this.topic = topic;
    this.key = key;
    this.token = token;
  }

  on(
    type: "broadcast" | "presence",
    filter: { event: string },
    cb: (msg: { payload: Payload }) => void,
  ) {
    if (type === "presence") this.sync.push(cb as () => void);
    else this.broadcast.set(filter.event, [...(this.broadcast.get(filter.event) ?? []), cb]);
    return this;
  }

  subscribe(cb: (status: ChannelStatus, err?: Error) => void = () => {}, timeoutMs = 10000) {
    // Terminal statuses fire once; later socket events are ignored.
    const finish = (status: Exclude<ChannelStatus, "SUBSCRIBED">, err?: Error) => {
      if (this.finished) return;
      this.finished = true;
      this.state = "closed";
      clearTimeout(timer);
      cb(status, err);
      this.ws?.close();
    };
    const timer = setTimeout(() => finish("TIMED_OUT"), timeoutMs);
    this.state = "joining";
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () =>
      ws.send(JSON.stringify({ t: "join", topic: this.topic, key: this.key, token: this.token() }));
    ws.onmessage = (e) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (m.t === "joined") {
        clearTimeout(timer);
        this.state = "joined";
        cb("SUBSCRIBED");
      } else if (m.t === "bc") {
        for (const fn of this.broadcast.get(m.event ?? "") ?? []) fn({ payload: m.payload });
      } else if (m.t === "presence") {
        this.presence = Object.fromEntries(Object.entries(m.state ?? {}).map(([k, v]) => [k, [v]]));
        for (const fn of this.sync) fn();
      } else if (m.t === "error") {
        // Unauthorized/bad topic before join is an error; anything after join is a close.
        const err = new Error(String(m.reason));
        if (this.state === "joined") finish("CLOSED", err);
        else finish("CHANNEL_ERROR", err);
      }
    };
    ws.onclose = (e) => finish("CLOSED", e.reason ? new Error(e.reason) : undefined);
    return this;
  }

  private push(msg: object): Promise<"ok" | "error"> {
    if (this.state !== "joined" || this.ws?.readyState !== WebSocket.OPEN)
      return Promise.resolve("error");
    this.ws.send(JSON.stringify(msg));
    return Promise.resolve("ok");
  }

  send(msg: { type: "broadcast"; event: string; payload: unknown }) {
    return this.push({ t: "bc", event: msg.event, payload: msg.payload });
  }

  track(meta: Meta) {
    return this.push({ t: "track", meta });
  }

  presenceState<T = Meta>(): Record<string, T[]> {
    return this.presence as Record<string, T[]>;
  }

  /** Pushes a renewed lease token to the server before the old one expires. */
  refreshAuth() {
    const token = this.token();
    if (token && this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ t: "auth", token }));
  }

  close() {
    this.finished = true;
    this.state = "closed";
    this.ws?.close();
  }
}
