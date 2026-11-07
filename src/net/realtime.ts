import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Transport only: account authentication and persistence belong to Laravel. */
function envValue(viteValue: unknown, serverName: string): string {
  if (typeof viteValue === "string" && viteValue.length > 0) return viteValue;
  if (typeof process === "undefined" || !process.env) return "";
  const serverValue = process.env[serverName];
  return typeof serverValue === "string" ? serverValue : "";
}

function createRealtime(): SupabaseClient {
  const url = envValue(import.meta.env["VITE_SUPABASE_URL"], "SUPABASE_URL");
  const key = envValue(
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    "SUPABASE_PUBLISHABLE_KEY",
  );
  if (!url || !key) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill the Supabase project values, then restart npm run dev.",
    );
  }
  // Without this callback the SDK replaces the lease token with the publishable key on every heartbeat.
  return createClient(url, key, { accessToken: async () => leaseToken });
}

let leaseToken: string | null = null;
let client: SupabaseClient | undefined;

export const realtime: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!client) client = createRealtime();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function setRealtimeToken(token: string) {
  leaseToken = token;
  await realtime.realtime.setAuth();
}
