import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RelayChannel, type ChannelStatus, type Payload } from "./relay";

/** Transport only: account authentication and persistence belong to Laravel. */
function envValue(viteValue: unknown, serverName: string): string {
  if (typeof viteValue === "string" && viteValue.length > 0) return viteValue;
  if (typeof process === "undefined" || !process.env) return "";
  const serverValue = process.env[serverName];
  return typeof serverValue === "string" ? serverValue : "";
}

/** The slice of a realtime channel the World uses; implemented by RelayChannel and Supabase. */
export interface WorldChannel {
  readonly state: string;
  on(
    type: "broadcast",
    filter: { event: string },
    cb: (msg: { payload: Payload }) => void,
  ): WorldChannel;
  on(type: "presence", filter: { event: "sync" }, cb: () => void): WorldChannel;
  subscribe(cb: (status: ChannelStatus, err?: Error) => void): WorldChannel;
  send(msg: { type: "broadcast"; event: string; payload: unknown }): Promise<string>;
  track(meta: Record<string, unknown>): Promise<string>;
  presenceState<T = Record<string, unknown>>(): Record<string, T[]>;
}

// Set VITE_REALTIME_URL (wss://<host>/realtime/ws) to use the self-hosted relay; empty keeps Supabase.
const relayUrl = envValue(import.meta.env["VITE_REALTIME_URL"], "REALTIME_URL");

function createSupabase(): SupabaseClient {
  const url = envValue(import.meta.env["VITE_SUPABASE_URL"], "SUPABASE_URL");
  const key = envValue(
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    "SUPABASE_PUBLISHABLE_KEY",
  );
  if (!url || !key) {
    throw new Error(
      "Missing VITE_REALTIME_URL, or VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env, then restart npm run dev.",
    );
  }
  // Without this callback the SDK replaces the lease token with the publishable key on every heartbeat.
  return createClient(url, key, { accessToken: async () => leaseToken });
}

let leaseToken: string | null = null;
let supabase: SupabaseClient | undefined;
const relayChannels = new Set<RelayChannel>();

export const realtime = {
  channel(
    topic: string,
    opts: { config: { presence: { key: string } } & Record<string, unknown> },
  ): WorldChannel {
    if (relayUrl) {
      const channel = new RelayChannel(relayUrl, topic, opts.config.presence.key, () => leaseToken);
      relayChannels.add(channel);
      return channel as WorldChannel;
    }
    supabase ??= createSupabase();
    return supabase.channel(topic, opts) as unknown as WorldChannel;
  },
  async removeChannel(channel: WorldChannel) {
    if (channel instanceof RelayChannel) {
      relayChannels.delete(channel);
      channel.close();
    } else if (supabase) await supabase.removeChannel(channel as never);
  },
  async removeAllChannels() {
    for (const channel of relayChannels) channel.close();
    relayChannels.clear();
    if (supabase) await supabase.removeAllChannels();
  },
};

export async function setRealtimeToken(token: string) {
  leaseToken = token;
  if (relayUrl) for (const channel of relayChannels) channel.refreshAuth();
  else if (supabase) await supabase.realtime.setAuth();
}
