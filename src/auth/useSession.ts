import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface SessionState {
  loading: boolean;
  user: User | null;
  displayName: string;
}

/** Sesi pemain + nama tampilan dari tabel profiles (client-side). */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: true, user: null, displayName: "" });

  useEffect(() => {
    let alive = true;

    const load = async (user: User | null) => {
      if (!user) {
        if (alive) setState({ loading: false, user: null, displayName: "" });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (alive) setState({ loading: false, user, displayName: data?.display_name ?? "" });
    };

    void supabase.auth.getUser().then(({ data }) => load(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void load(session?.user ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
