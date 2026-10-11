import { createClient } from "@supabase/supabase-js";
/** Transport only: account authentication and persistence belong to Laravel. */
export const realtime = createClient(
  import.meta.env["VITE_SUPABASE_URL"],
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  },
);
